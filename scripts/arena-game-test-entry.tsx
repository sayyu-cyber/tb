import React, {useState} from "react";
import {createRoot} from "react-dom/client";
import {GinRummyTable} from "../components/game/GinRummyTable";
import {MindiTable} from "../components/game/MindiTable";
import {Card, cardId, scoreGin, findGinLayout} from "../lib/ginRummyEngine";
import {GinResultScreen} from "../components/game/GinResultScreen";
import {Card as MindiCard,cardId as mindiId} from "../lib/mindiEngine";

// Deterministic UI fixtures only. Production clients still own all game state.
const winning:Card[]=([1,2,3,4] as const).map(rank=>({rank,suit:"S"}));
winning.push(...([5,6,7] as const).map(rank=>({rank,suit:"H" as const})),...(["S","C","D"] as const).map(suit=>({rank:9 as const,suit})));
const seat={uid:"other",active:false,name:"Opponent",cardCount:10,cardBackId:"cb_fire"};
function MindiFixture(){
  const [hand,setHand]=useState<MindiCard[]>([{rank:9,suit:"H"},...([2,3,4,5,6,7,8,9,10,11,12,14] as const).map(rank=>({rank,suit:"S" as const}))]);
  const [done,setDone]=useState(false);
  return <MindiTable hand={hand} legal={hand.filter(c=>c.suit==="H")} viewer={0} top={seat} left={seat} right={seat} name="You" active={!done} trump={null} trick={[{seat:1,card:{rank:2,suit:"H"}}]} tens={{A:0,B:0}} tricks={{A:0,B:0}} mode="Casual" onPlay={c=>{setHand(h=>h.filter(v=>mindiId(v)!==mindiId(c)));setDone(true);document.body.dataset.played=mindiId(c);}}/>;
}
function Fixture(){
  const [hand,setHand]=useState<Card[]>(winning);
  const [phase,setPhase]=useState<"draw"|"discard">("draw");
  const [selected,setSelected]=useState<Card|null>(null);
  const [done,setDone]=useState(false);
  const [result,setResult]=useState(false);
  if(result)return <GinResultScreen result={scoreGin("player",findGinLayout(winning)!,[{rank:8,suit:"D"}])} youWon coins={10} balance={110} onContinue={()=>location.reload()}/>;
  return <GinRummyTable hand={hand} selected={selected} opponent={seat} name="You" stock={31} discard={{rank:13,suit:"D"}} phase={phase} myTurn={!done} mode="Casual" cardBack="cb_neon" tableSkin={location.search.includes("red")?"tt_red":undefined}
    onSelect={setSelected} onDraw={()=>{setHand(h=>[...h,{rank:13,suit:"D"}]);setPhase("discard");}}
    onDiscard={()=>{if(location.search.includes("error"))throw new Error("network unavailable");if(!selected)return;const kept=hand.filter(c=>cardId(c)!==cardId(selected));setHand(kept);setDone(true);setSelected(null);if(findGinLayout(kept))setResult(true);}}/>;
}
// Inside the shell's namespace, as in the app (the phone tables carry arena-phone themselves).
createRoot(document.getElementById("test-root")!).render(<div className="arena-app">{location.search.includes("mindi")?<MindiFixture/>:<Fixture/>}</div>);
