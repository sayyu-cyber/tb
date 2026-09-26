/**
 * The Arena panel: a dark card with a hairline border and, optionally, two
 * corner ticks (top-left and bottom-right) in lime or blue.
 *
 * `.panel`, `.panel.tick` and `.panel.tick.b` are the board's own classes,
 * ported into styles/arena-app.css. This component exists so screens never
 * hand-write `"panel tick b"` and get the modifier order wrong - the CSS
 * reads `.panel.tick.b`, so `.b` without `.tick` silently does nothing.
 */
import type { CSSProperties, ReactNode } from "react";

export type PanelProps = {
  children?: ReactNode;
  /** Draw the two corner ticks. Off by default, as on the boards. */
  tick?: boolean;
  /** Tick colour: lime (the default) or the blue used for "someone else". */
  tone?: "lime" | "blue";
  className?: string;
  style?: CSSProperties;
  /** Render as <section> etc. when the panel is a landmark, not a div. */
  as?: "div" | "section" | "article" | "aside" | "li";
};

export function Panel({ children, tick = false, tone = "lime", className = "", style, as: Tag = "div" }: PanelProps) {
  const classes = ["panel", tick && "tick", tick && tone === "blue" && "b", className]
    .filter(Boolean)
    .join(" ");
  return (
    <Tag className={classes} style={style}>
      {children}
    </Tag>
  );
}

/**
 * A panel's header row: title on the left, an action on the right.
 * `.ph` on the boards. `<h2>` is the board's element, so headings stay in
 * document order instead of becoming styled <div>s.
 */
export function PanelHead({
  title,
  children,
  className = "",
  headingLevel = 2,
}: {
  title: ReactNode;
  children?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 3 ? "h3" : "h2";
  return (
    <div className={`ph ${className}`.trim()}>
      <H>{title}</H>
      {children}
    </div>
  );
}
