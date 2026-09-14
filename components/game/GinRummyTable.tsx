"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, CircleHelp, Info, Spade, X, Layers, Flag, ArrowDownToLine, Music } from "lucide-react";
import { Card, cardId, rankLabel, bestMeldArrangement } from "@/lib/ginRummyEngine";
import { PlayingCard, suitFromLetter } from "./PlayingCard";
import { Avatar, ArenaSeatData, TABLE_THEME_STYLES } from "./GameArena";
import { Button } from "@/components/ui/Button";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { useSettings } from "@/contexts/SettingsContext";

interface Props {
  hand:Card[]; selected:Card|null; opponent:ArenaSeatData; name:string; avatar?:string;
  stock:number; discard:Card|null; phase:"draw"|"discard"; myTurn:boolean; canKnock:boolean;
  mode:string; tableSkin?:string; cardBack?:string; online?:boolean;
  onDraw:(source:"stock"|"discard")=>void|Promise<void>; onSelect:(card:Card)=>void;
  onDiscard:()=>void|Promise<void>; onKnock:()=>void|Promise<void>; onLeave?:()=>void|Promise<void>;
}
export function GinRummyTable(p:Props) {
  const router=useRouter();
  const {settings,updateSettings}=useSettings();
  const [modal,setModal]=useState<"rules"|"settings"|"leave"|"info"|null>(null);
  const [melds,setMelds]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const pending=useRef(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const arrangement=useMemo(()=>bestMeldArrangement(p.hand),[p.hand]);
  const meldIds=new Set(arrangement.melds.flat().map(cardId));
  const theme=TABLE_THEME_STYLES[p.tableSkin ?? ""] ?? TABLE_THEME_STYLES.tt_default;
  const canDraw=p.myTurn && p.phase==="draw" && !busy;
  const canDiscard=p.myTurn && p.phase==="discard" && !!p.selected && !busy;
  useEffect(()=>{if(modal)dialog.current?.showModal();},[modal]);
  async function run(fn:()=>void|Promise<void>) {
    if(pending.current)return;
    pending.current=true;setBusy(true);setError("");
    try {await fn();} catch {setError("Action failed. Please try again.");}
    finally {pending.current=false;setBusy(false);}
  }
  const info=<dl className="gin-info-rows"><div><dt>Mode</dt><dd>{p.mode}</dd></div>
    <div><dt>Turn</dt><dd>{p.myTurn?"Your turn":p.opponent.name}</dd></div>
    <div><dt>Deadwood</dt><dd>{arrangement.deadwoodValue}</dd></div>
    <div><dt>Stock</dt><dd>{p.stock} cards</dd></div>
    <div><dt>Opponent</dt><dd>{p.opponent.cardCount} cards</dd></div></dl>;
  return <div className="gin-room">
    <header className="gin-header">
      <button className="gin-exit" aria-label="Exit Game" onClick={()=>setModal("leave")}><ArrowLeft size={22}/><span>Exit Game<small>Return to lobby</small></span></button>
      <div className="gin-title"><Spade/><div><h1>Gin Rummy</h1><span>{p.mode}</span></div><Spade/></div>
      <div className="gin-utilities"><button aria-label="Game settings" title="Game settings" onClick={()=>setModal("settings")}><Settings size={20}/></button>
        <button aria-label="Rules" title="Rules" onClick={()=>setModal("rules")}><CircleHelp size={20}/></button>
        <button aria-label="Game Info" title="Game Info" onClick={()=>setModal("info")}><Info size={20}/></button></div>
    </header>
    <div className="gin-stage">
      <div className="gin-oval" style={{backgroundColor:theme.base,backgroundImage:theme.pattern,borderColor:theme.glow}} aria-hidden="true"/>
      <div className="gin-rival"><Avatar name={p.opponent.name} presetId={p.opponent.avatarPreset} count={p.opponent.cardCount}/>
        <strong>{p.opponent.name}</strong><span>{p.myTurn?"Waiting":p.phase==="draw"?"Drawing":"Discarding"}</span>
        <div className="gin-rival-hand" aria-label={p.opponent.cardCount+" face-down cards"} style={{"--count":Math.max(1,p.opponent.cardCount)} as React.CSSProperties}>
          {Array.from({length:p.opponent.cardCount},(_,i)=><div key={i}><PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={p.opponent.cardBackId}/></div>)}
        </div>
      </div>
      <aside className="gin-info"><h2><Info size={18}/>Game Info</h2>{info}</aside>
      <div className="gin-piles">
        <button aria-label={"Draw from stock, "+p.stock+" cards"} disabled={!canDraw || p.stock<=2} onClick={()=>run(()=>p.onDraw("stock"))}>
          <PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={p.cardBack}/><span>Stock ({p.stock})</span></button>
        <button aria-label="Draw from discard pile" disabled={!canDraw || !p.discard} onClick={()=>run(()=>p.onDraw("discard"))}>
          {p.discard?<PlayingCard rank={rankLabel(p.discard.rank)} suit={suitFromLetter(p.discard.suit)} size="lg"/>:<div className="gin-empty-pile"/>}<span>Discard pile</span></button>
      </div>
      <div className="gin-hand" role="group" aria-label="Your cards" style={{"--count":p.hand.length} as React.CSSProperties}>
        {p.hand.map((card,i)=>{
          const offset=i-(p.hand.length-1)/2;
          const selected=!!p.selected && cardId(p.selected)===cardId(card);
          return <div key={cardId(card)} className={"gin-fan-slot"+(selected?" is-selected":"")+(melds&&meldIds.has(cardId(card))?" is-meld":"")}
            style={{"--angle":offset*1.5+"deg","--curve":offset*offset*.8+"px","--order":i} as React.CSSProperties}>
            <PlayingCard rank={rankLabel(card.rank)} suit={suitFromLetter(card.suit)} size="lg" selected={selected}
              disabled={!p.myTurn||p.phase!=="discard"||busy} onClick={()=>p.onSelect(card)}/>
          </div>;
        })}
      </div>
    </div>
    <footer className="gin-controls"><div className={"gin-self"+(p.myTurn?" is-active":"")}><Avatar name={p.name} presetId={p.avatar}/><div><strong>{p.name}</strong><p role="status">{p.myTurn?(p.phase==="draw"?"Your turn - Draw":"Your turn - Discard"):"Opponent's turn"}</p></div></div>
      <div className="gin-actions"><Button variant="secondary" aria-pressed={melds} onClick={()=>setMelds(v=>!v)}><Layers size={18}/>View Melds</Button>
        <Button disabled={!canDiscard} onClick={()=>run(p.onDiscard)}><ArrowDownToLine size={18}/>Discard</Button>
        <Button variant={p.canKnock?"primary":"secondary"} disabled={!canDiscard||!p.canKnock} onClick={()=>run(p.onKnock)}><Flag size={18}/>Knock</Button></div>
    </footer>
    {error&&<p className="gin-action-error" role="alert">{error}</p>}
    {modal&&<dialog ref={dialog} className="gin-dialog" aria-labelledby="gin-dialog-title" onCancel={e=>{if(busy)e.preventDefault();else setModal(null);}}>
      <header><h2 id="gin-dialog-title">{modal==="leave"?"Leave game?":modal==="rules"?"Gin Rummy Rules":modal==="info"?"Game Info":"Game Settings"}</h2>
        <Button variant="ghost" aria-label="Close dialog" disabled={busy} onClick={()=>setModal(null)}><X size={20}/></Button></header>
      {modal==="info"?info:modal==="rules"?<ul><li>Draw one card from the stock or discard pile, then discard one card.</li><li>Meld three or more cards of the same rank, or consecutive cards of the same suit.</li><li>Select a discard. Knock is available when remaining deadwood is 10 or less; zero is Gin.</li><li>Scoring compares deadwood, with Gin and undercut bonuses. The hand ends in a draw when the stock runs low.</li></ul>
        :modal==="settings"?<SettingToggle icon={Music} label="Background Music" enabled={settings.music} onChange={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}/>
        :<><p>{p.online?"Leaving forfeits this match.":"Your current hand will be lost."}</p>
          <footer><Button variant="secondary" disabled={busy} onClick={()=>setModal(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={()=>run(async()=>{await p.onLeave?.();router.push("/play");})}>Leave Game</Button></footer></>}
      {error&&<p role="alert">{error}</p>}
    </dialog>}
  </div>;
}
