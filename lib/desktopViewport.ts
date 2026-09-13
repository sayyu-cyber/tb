/**
 * Makes a phone in landscape render the *desktop* layout.
 *
 * The problem this solves: the responsive stylesheet collapses the app below
 * its desktop breakpoints - `.play-game-grid` drops to one column at 850px,
 * `.social-layout` loses its 310px right rail at 1150px - so a phone in
 * landscape (~844px) gets a different, much longer product than the desktop
 * one.
 *
 * The fix is to stop telling the phone it is 844px wide. Setting the layout
 * viewport to a fixed 1280px makes every media query evaluate exactly as it
 * does on a desktop monitor, and the browser then zooms the whole page down
 * to fit the screen. Same layout, same proportions - just smaller. Nothing
 * is transformed, so position:fixed chrome (the sidebar panel, dialogs,
 * toasts) keeps working, which a CSS `transform: scale()` wrapper breaks.
 *
 * Keeping the setting applied is the hard part, and the reason this file
 * looks defensive:
 *
 *  1. It runs as a blocking script before first paint, so a phone never
 *     flashes the mobile layout first.
 *  2. It MUTATES the existing tag's content rather than replacing the node.
 *     Next.js renders the viewport meta as part of the React tree, so a
 *     removed-and-re-added node gets reclaimed during hydration and the
 *     setting is silently lost.
 *  3. A MutationObserver re-asserts if anything in <head> overwrites it -
 *     App Router re-renders metadata on navigation, which would otherwise
 *     drop the app back to the mobile layout on the second page you visit.
 *  4. `apply` is published on window so the React side (ViewportManager)
 *     can re-run this exact logic after hydration and after each route
 *     change, instead of duplicating the rules.
 *
 * Two deliberate constraints:
 *
 *  - Phones only. `screen` reports the physical device and is NOT affected
 *    by the viewport meta, so it is safe to decide from; reading the live
 *    viewport would feed the result back into its own input and oscillate.
 *
 *  - Landscape only. In portrait the viewport stays at device-width, which
 *    is what keeps RotateDeviceGate's `(max-width: 767px)` query matching.
 *    Forcing 1280px in portrait would silently disable the rotate prompt.
 */

/** Design width - the number that decides which breakpoints a phone gets.
 *  1280 clears the app's widest desktop breakpoint (1200px), so a landscape
 *  phone sees the full desktop composition. Lowering it gives bigger text
 *  but starts pulling in the tablet breakpoints (1150px trims the Play page
 *  and collapses the Friends right rail). */
const DESIGN_WIDTH = 1280;

/** Largest short-side (CSS px) still treated as a phone. Phones top out
 *  around 430; the smallest tablets start around 744. */
const PHONE_MAX_SHORT_SIDE = 520;

/** Name of the re-apply hook published on window for ViewportManager. */
export const VIEWPORT_HOOK = "__thaasbaiViewport";

export const DESKTOP_VIEWPORT_SCRIPT = `(function(){
  var W=${DESIGN_WIDTH},P=${PHONE_MAX_SHORT_SIDE},D="width=device-width, initial-scale=1";
  function apply(){
    try{
      var m=document.querySelector('meta[name="viewport"]');
      if(!m)return;
      var s=window.screen||{},w=s.width||9999,h=s.height||9999;
      var phone=Math.min(w,h)<=P;
      var land=window.matchMedia("(orientation: landscape)").matches;
      var c=phone&&land?"width="+W:D;
      // Only write on an actual change - this is what stops the observer
      // and the resize listener below from looping on their own output.
      if(m.getAttribute("content")!==c)m.setAttribute("content",c);
    }catch(e){}
  }
  window.${VIEWPORT_HOOK}=apply;
  apply();
  try{
    new MutationObserver(apply).observe(document.head,{
      subtree:true,childList:true,attributes:true,attributeFilter:["content"]
    });
  }catch(e){}
  // orientationchange fires before the new metrics settle on some devices.
  window.addEventListener("orientationchange",function(){setTimeout(apply,80);});
  window.addEventListener("resize",apply);
})();`;
