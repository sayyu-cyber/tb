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
      setScale(Math.min(box.width / width, box.height / height));
    };
    measure();
    // Observing the frame rather than the window catches the sidebar opening
    // and closing too, which changes the space available without a resize.
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [width, height]);

  return (
    <div ref={frame} className="arena-frame">
      <div
        className={cn("arena-canvas", className)}
        style={{ width, height, transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
