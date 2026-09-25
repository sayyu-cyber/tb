"use client";

/**
 * The Arena sprite sheet, lifted verbatim from
 * design/arena/boards/Main.dc.html.
 *
 * The boards draw suits as real SVG shapes, not the Unicode glyphs (♠ ♥) a
 * font would supply - those vary wildly between platforms and would make the
 * cards look different on every device. These paths are the design's own.
 *
 * Render this ONCE inside a stage; every card and icon then references a
 * symbol by id through <use>.
 */
export function ArenaSprite() {
  return (
    <svg className="sprite" aria-hidden="true">
      <defs>
      <symbol id="s-S" viewBox="0 0 100 100"><path fill="currentColor" d="M50 3C57 19 72 30 84 42C93 51 96 58 96 66C96 79 86 88 73 88C64 88 57 84 53.5 77C54.5 86 59 92 68 97H32C41 92 45.5 86 46.5 77C43 84 36 88 27 88C14 88 4 79 4 66C4 58 7 51 16 42C28 30 43 19 50 3Z"></path></symbol>
      <symbol id="s-H" viewBox="0 0 100 100"><path fill="currentColor" d="M50 95C41 83 25 70 14 57C7 48 4 41 4 32C4 17 15 7 29 7C38 7 45 12 50 20C55 12 62 7 71 7C85 7 96 17 96 32C96 41 93 48 86 57C75 70 59 83 50 95Z"></path></symbol>
      <symbol id="s-D" viewBox="0 0 100 100"><path fill="currentColor" d="M50 2C58 18 70 34 86 50C70 66 58 82 50 98C42 82 30 66 14 50C30 34 42 18 50 2Z"></path></symbol>
      <symbol id="s-C" viewBox="0 0 100 100"><path fill="currentColor" d="M50 5A20 20 0 0 1 67.5 34.6A20 20 0 1 1 55 67C56 80 60 89 68 97H32C40 89 44 80 45 67A20 20 0 1 1 32.5 34.6A20 20 0 0 1 50 5Z"></path></symbol>
      <symbol id="i-crown" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7ZM5 21h14"></path></symbol>
      <symbol id="i-back" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7M19 12H5"></path></symbol>
      <symbol id="i-sound" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M11 5 6 9H2v6h4l5 4V5ZM15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"></path></symbol>
      <symbol id="i-book" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M2 4h6a4 4 0 0 1 4 4v13a3 3 0 0 0-3-3H2V4ZM22 4h-6a4 4 0 0 0-4 4v13a3 3 0 0 1 3-3h7V4Z"></path></symbol>
      <symbol id="i-sliders" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M21 5h-7M10 5H3M21 12h-9M8 12H3M21 19h-5M12 19H3M14 3v4M8 10v4M16 17v4"></path></symbol>
      <symbol id="i-history" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 2.64-6.36L3 8M3 3v5h5M12 7v5l3.5 2"></path></symbol>
      <symbol id="i-replay" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M3 12a9 9 0 1 0 2.64-6.36L3 8M3 3v5h5"></path></symbol>
      <symbol id="i-play" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" d="M12 3v11M7 9l5 5 5-5M5 20h14"></path></symbol>
      <symbol id="i-close" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M6 6l12 12M18 6 6 18"></path></symbol>
      </defs>
    </svg>
  );
}

/** Suit letter as the engines model it -> the sprite symbol id. */
export const SUIT_SYMBOL: Record<string, string> = { S: "s-S", H: "s-H", D: "s-D", C: "s-C" };

/** A suit shape from the sheet. */
export function Suit({ suit, className, style }: { suit: string; className?: string; style?: React.CSSProperties }) {
  return <svg className={className} style={style} aria-hidden="true"><use href={`#${SUIT_SYMBOL[suit] ?? "s-S"}`} /></svg>;
}

/** An icon from the sheet, e.g. <Icon name="i-crown" />. */
export function Icon({ name, className }: { name: string; className?: string }) {
  return <svg className={className} aria-hidden="true"><use href={`#${name}`} /></svg>;
}
