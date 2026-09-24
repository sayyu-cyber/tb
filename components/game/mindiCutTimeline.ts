export const CUT_TIMELINE = { fan:1300, draw:2400, reveal:3900, winner:5100, dealing:6650, end:8000 } as const;
export type CutPhase = "preparing"|"cut"|"fan"|"draw"|"reveal"|"winner"|"dealing";
export function cutPhaseAt(elapsed:number):CutPhase {
  if(elapsed>=CUT_TIMELINE.dealing)return "dealing";
  if(elapsed>=CUT_TIMELINE.winner)return "winner";
  if(elapsed>=CUT_TIMELINE.reveal)return "reveal";
  if(elapsed>=CUT_TIMELINE.draw)return "draw";
  if(elapsed>=CUT_TIMELINE.fan)return "fan";
  return "cut";
}
