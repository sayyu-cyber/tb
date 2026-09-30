import React from "react";

/** Original PMindi/PGin decorative planes, retained only for reproducible
 * asset rendering and visual regression checks. Never shipped to the app. */
export function PhoneTableSurface({ game, skin = "tt_default" }: { game: "mindi" | "gin"; skin?: string }) {
  const gin = game === "gin";
  const colours: Record<string, string> = { tt_default: "#06323A", tt_red: "#4A1119", tt_blue: "#0E2C4E", tt_black: "#101214" };
  const aprons: [number, string][] = [
    [-60, "#030305"], [-50, "#07070B"], [-40, "#0B0B11"], [-30, gin ? "#0F1116" : "#100F18"],
    [-20, gin ? "#14161C" : "#16151F"], [-14, "#063A40"], [-10, "#00BCC8"], [-7, gin ? "#1C1E26" : "#1E1D28"],
  ];
  return <div className="phone-table-source" style={{ position: "absolute", inset: 0 }}>
    <div className="bg" />
    <div className="stage">
      <div className="floor" />
      <div className="table">
        {aprons.map(([z, colour]) => <div key={z} className="apron" style={{ transform: `translateZ(${z}px)`, background: colour }} />)}
        <div className={gin ? "felt gin" : "felt"} style={gin ? undefined : { backgroundColor: colours[skin] ?? colours.tt_default }} />
        <div className="rail" />
        <svg className="leds" viewBox="0 0 1200 740">
          <defs><filter id="surface-led-glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="8" /></filter></defs>
          {!gin && <ellipse cx="600" cy="370" rx="565" ry="335" fill="none" stroke="#6FE9F0" strokeOpacity=".8" strokeWidth="7" strokeLinecap="round" strokeDasharray="3 27" />}
          <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke={gin ? "#00BCC8" : "#C6FF33"} strokeWidth="16" strokeOpacity={gin ? ".8" : ".7"} filter="url(#surface-led-glow)" />
          <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke={gin ? "#9FF2F7" : "#DFFF85"} strokeWidth="5" />
        </svg>
      </div>
    </div>
  </div>;
}
