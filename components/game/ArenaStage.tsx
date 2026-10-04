"use client";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Renders a design board at its exact size, scaled to fit the viewport.
 *
 * The Arena boards are artboards, not responsive layouts: every position in
 * design/arena/boards is a hard pixel on a 1440x900 canvas (844x390 for the
 * phone board). Reflowing them into a fluid layout is what would make the
 * app stop matching the design, so instead the canvas is kept at its true
 * size and the whole thing is scaled by one factor.
 *
 * That also means the table looks identical on every screen - a 27" monitor
 * and a phone in landscape get the same composition, just bigger or smaller,
 * which is how a card table should behave.
 *
 * The scale has to be computed in JS: CSS `calc()` cannot divide a length by
 * a length, so there is no pure-CSS way to express "the smaller of vw/1440
 * and vh/900" as a unitless factor.
 *
 * WHAT "FITS" MEANS ON A PHONE (design/arena/MOBILE.md "Tables fit what is
 * visible"). A fixed element's `inset: 0` covers the LAYOUT viewport, and on
 * a phone browser that is taller than what you can see: the URL bar and the
 * toolbar sit over the bottom of it. Scaling to that would push the hand and
 * the action button - the two things MOBILE.md says must never be cropped -
 * under the browser's own chrome. So the frame takes its height from
 * `visualViewport` where there is one, `100dvh` where there isn't, and the
 * board is scaled to what is actually on screen.
 *
 * A phone composition (844x390) is also kept clear of the notch and the
 * home indicator: its frame is padded by the safe-area insets
 * (`.arena-frame-phone`) and the board is scaled into what is left, so the
 * hand and the action button are never under the hardware either
 * (design/arena/LANDSCAPE.md "Building it"). That frame also carries
 * `arena-phone`, the namespace the P boards' shared layer was ported under
 * (styles/arena-phone.css).
 */
export function ArenaStage({
  width = 1440,
  height = 900,
  className,
  children,
}: {
  width?: number;
  height?: number;
  /** The board's namespace class, e.g. "arena-mindi". */
  className?: string;
  children: React.ReactNode;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const element = frame.current;
    if (!element) return;
    const measure = () => {
      const box = element.getBoundingClientRect();
      if (!box.width || !box.height) return;
      // The content box: a phone frame's padding is the safe area.
      const style = getComputedStyle(element);
      const across = box.width - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const down = box.height - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      if (across <= 0 || down <= 0) return;
      setScale(Math.min(across / width, down / height));
    };
    measure();
    // Observing the frame rather than the window catches the sidebar opening
    // and closing too, which changes the space available without a resize.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);

  // The visible height, which on a phone browser is not the layout height.
  // Written as a custom property so the ResizeObserver above re-measures off
  // the frame's own box and one number drives both.
  useEffect(() => {
    const element = frame.current;
    const view = typeof window === "undefined" ? null : window.visualViewport;
    if (!element || !view) return;
    const apply = () => element.style.setProperty("--arena-vh", `${view.height}px`);
    apply();
    view.addEventListener("resize", apply);
    view.addEventListener("scroll", apply);
    return () => {
      view.removeEventListener("resize", apply);
      view.removeEventListener("scroll", apply);
    };
  }, []);

  return (
    <div ref={frame} className={width === 844 ? "arena-frame arena-frame-phone arena-phone" : "arena-frame"}>
      <div
        className={cn("arena-canvas", className)}
        style={{ width, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
