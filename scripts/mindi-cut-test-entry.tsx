import React, { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { MindiDealIntro } from "../components/game/MindiDealIntro";
import { FirstPlayerDraw, SeatIndex } from "../lib/mindiEngine";

const duel = location.search.includes("duel");
const draw: FirstPlayerDraw = { cards: {
  0: { rank: 8, suit: "S" },
  1: { rank: 13, suit: "H" },
  2: { rank: 3, suit: "C" },
  3: { rank: 11, suit: "D" },
}, winner: 1 };
function Fixture() {
  const [done, setDone] = useState(0);
  return <><button id="outside">Outside game</button><output id="done">{done}</output>
    {!done && <MindiDealIntro draw={draw} names={{0:"Sayyu",1:"Aishath",2:"Ibrahim",3:"Very long player display name"}}
      seats={duel ? [0,1] : [0,1,2,3]} viewer={(duel ? 0 : 2) as SeatIndex} handSize={duel ? 26 : 13}
      cardBacks={{0:"cb_neon",1:"cb_fire",2:"cb_ocean",3:"cb_vip_gold"}} tableSkin={location.search.includes("skin") ? "tt_lava" : "tt_default"}
      onDone={() => setDone(n => n + 1)} />}</>;
}
createRoot(document.getElementById("test-root")!).render(<StrictMode><Fixture /></StrictMode>);
