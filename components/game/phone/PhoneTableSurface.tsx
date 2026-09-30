/** The phone table's static decoration, rendered from the original board
 * by `node scripts/check-mobile-match.cjs --render-surfaces`. Keeping the
 * floor, rim, felt and LED blur in one 2D image avoids large intermediate
 * 3D/filter surfaces in iOS Safari. Cards and controls stay in the live board. */
export function PhoneTableSurface({ game, skin = "tt_default" }: { game: "mindi" | "gin"; skin?: string }) {
  const theme = ["tt_default", "tt_red", "tt_blue", "tt_black"].includes(skin) ? skin : "tt_default";
  const file = game === "gin" ? "gin" : `mindi-${theme}`;
  return <div aria-hidden="true" className="phone-table-surface" style={{
    position: "absolute", inset: 0, pointerEvents: "none",
    backgroundImage: `url(/images/phone-tables/${file}.png)`, backgroundSize: "100% 100%",
  }} />;
}
