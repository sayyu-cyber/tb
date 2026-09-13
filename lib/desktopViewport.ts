/**
 * Makes a phone in landscape render the *desktop* layout.
 *
 * The problem this solves: the responsive stylesheet collapses everything
 * into one column below ~760px, so on a phone the dashboard, the Play cards
 * and the shop grid all become an endless vertical scroll - a different
 * product from the one on desktop.
 *
 * The fix is to stop telling the phone it is 390px wide. Setting the layout
 * viewport to a fixed 1280px makes every media query evaluate exactly as it
 * does on a desktop monitor, and the browser then zooms the whole page down
 * to fit the screen. Same layout, same proportions, same everything - just
 * smaller. Nothing is transformed or re-implemented, so position:fixed
 * chrome (the sidebar panel, dialogs, toasts) keeps working normally, which
 * a CSS `transform: scale()` wrapper would have broken.
 *
 * Why an inline blocking script rather than a React effect: this has to be
 * decided before the first paint. From an effect, the phone would paint the
 * narrow mobile layout and then visibly snap to the desktop one.
 *
 * Two deliberate constraints:
 *
 *  - Phones only. `screen` reports the physical device size and is NOT
 *    affected by the viewport meta, so it is safe to make the decision from:
 *    reading the live viewport instead would feed the result back into its
 *    own input and oscillate.
 *
 *  - Landscape only. In portrait the viewport stays at device-width, which
 *    is what keeps RotateDeviceGate's `(max-width: 767px)` media query
 *    matching. Forcing 1280px in portrait too would silently disable the
 *    rotate prompt and drop players into an unusably squeezed page.
 */

/** Design width. This is the number that decides which breakpoints a phone
 *  gets; 1280 is above the app's widest desktop breakpoint (1200px), so a
 *  landscape phone sees the full desktop composition. Lowering it gives
 *  bigger text but starts pulling in the tablet breakpoints. */
const DESIGN_WIDTH = 1280;

/** Largest short-side (in CSS px) still treated as a phone. Phones top out
 *  around 430; the smallest tablets start around 744. */
const PHONE_MAX_SHORT_SIDE = 520;

export const DESKTOP_VIEWPORT_SCRIPT = `(function(){
  var W=${DESIGN_WIDTH},P=${PHONE_MAX_SHORT_SIDE},D="width=device-width, initial-scale=1";
  function set(c){
    var m=document.querySelector('meta[name="viewport"]');
    if(m&&m.getAttribute("content")===c)return;
    // Replacing the tag rather than mutating content: some mobile browsers
    // ignore an in-place content change after first layout.
    if(m&&m.parentNode)m.parentNode.removeChild(m);
    var n=document.createElement("meta");
    n.setAttribute("name","viewport");
    n.setAttribute("content",c);
    document.head.appendChild(n);
  }
  function apply(){
    try{
      var s=window.screen||{},w=s.width||9999,h=s.height||9999;
      var phone=Math.min(w,h)<=P;
      var landscape=window.matchMedia("(orientation: landscape)").matches;
      set(phone&&landscape?"width="+W:D);
    }catch(e){}
  }
  apply();
  // orientationchange fires before the new metrics settle on some devices.
  window.addEventListener("orientationchange",function(){setTimeout(apply,80);});
  // Guarded by the equality check in set(), so the resize this itself
  // triggers is a no-op rather than a loop.
  window.addEventListener("resize",apply);
})();`;
