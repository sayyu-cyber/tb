"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, CircleHelp, Info, Spade, X, Music, Layers, Users } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Card, SeatIndex, Team, TrickPlay, cardId, rankLabel, SUIT_SYMBOLS, resolveTrick, teamOf } from "@/lib/mindiEngine";
import { PlayingCard, suitFromLetter } from "./PlayingCard";
import { Avatar, ArenaSeatData, TABLE_THEME_STYLES } from "./GameArena";
import { TrickArea } from "./TrickArea";
import { Button } from "@/components/ui/Button";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { useSettings } from "@/contexts/SettingsContext";

interface Props {
  hand:Card[]; legal:Card[]; viewer:SeatIndex; top:ArenaSeatData; left?:ArenaSeatData|null; right?:ArenaSeatData|null;
  name:string; avatar?:string; active:boolean; trump:Card["suit"]; trick:TrickPlay[];
  tens:Record<Team,number>; tricks:Record<Team,number>; mode:string; tableSkin?:string; online?:boolean;
  onPlay:(card:Card)=>void|Promise<void>; onLeave?:()=>void|Promise<void>;
}

function Score({title,tens,tricks,opponents=false}:{title:string;tens:number;tricks:number;opponents?:boolean}) {
  const reduced=useReducedMotion();
  return <section className={"mindi-score"+(opponents?" opponents":"")} aria-label={title}>
    <h2><Users size={18}/>{title}</h2><dl>
      {[["Tens",tens],["Tricks",tricks]].map(([label,value])=><div key={label}><dt>{label}</dt>
        <motion.dd key={label+"-"+value} initial={reduced?false:{opacity:.6}} animate={{opacity:1}} transition={{duration:.2}}>{value}</motion.dd></div>)}
    </dl>
  </section>;
}

function Seat({seat,position,partner}:{seat:ArenaSeatData;position:"top"|"left"|"right";partner:boolean}) {
  return <div className={"mindi-seat mindi-seat-"+position+(seat.active?" is-active":"")} data-team={partner?"self":"other"}>
    <Avatar name={seat.name} presetId={seat.avatarPreset} count={seat.cardCount}/>
    <strong>{seat.name}</strong><span>{seat.active?"Playing":partner?"Partner":"Opponent"}</span>
    <div className="mindi-hidden-hand" aria-label={seat.cardCount+" face-down cards"} style={{"--count":Math.max(1,seat.cardCount)} as React.CSSProperties}>
      {Array.from({length:seat.cardCount},(_,i)=><div key={i}><PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={seat.cardBackId}/></div>)}
    </div>
  </div>;
}

export function MindiTable(p:Props) {
  const router=useRouter();
  const {settings,updateSettings}=useSettings();
  const [selected,setSelected]=useState<string|null>(null);
  const [modal,setModal]=useState<"rules"|"settings"|"leave"|"info"|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [scoreNotice,setScoreNotice]=useState("");
  const lastScores=useRef(p.tricks);
  const pending=useRef(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const duel=!p.left&&!p.right;
  const team=teamOf(p.viewer),other=team==="A"?"B":"A";
  useEffect(()=>{
    const old=lastScores.current;
    lastScores.current=p.tricks;
    const winningTeam=p.tricks.A>old.A?"A":p.tricks.B>old.B?"B":null;
    if(!winningTeam)return;
    setScoreNotice(winningTeam===team?(duel?"You won the trick":"Your Team won the trick"):(duel?"Opponent won the trick":"Opponents won the trick"));
    const timer=setTimeout(()=>setScoreNotice(""),1400);
    return ()=>clearTimeout(timer);
  },[p.tricks,team,duel]);
  const theme=TABLE_THEME_STYLES[p.tableSkin??""]??TABLE_THEME_STYLES.tt_default;
  const legal=useMemo(()=>new Set(p.legal.map(cardId)),[p.legal]);
  const chosen=p.hand.find(card=>cardId(card)===selected);
  const canPlay=!!chosen&&legal.has(cardId(chosen))&&p.active&&!busy;
  useEffect(()=>{setSelected(null);},[p.viewer,p.active]);
  useEffect(()=>{if(modal)dialog.current?.showModal();},[modal]);
  async function run(fn:()=>void|Promise<void>) {
    if(pending.current)return;
    pending.current=true;setBusy(true);setError("");
    try{await fn();}catch{setError("Action failed. Please try again.");}
    finally{pending.current=false;setBusy(false);}
  }
  const complete=p.trick.length===(duel?2:4);
  const winner=complete?resolveTrick(p.trick,p.trump):null;
  return <div className="gin-room mindi-room">
    <header className="gin-header">
      <button className="gin-exit" aria-label="Exit Game" onClick={()=>setModal("leave")}><ArrowLeft size={22}/><span>Exit Game<small>Return to lobby</small></span></button>
      <div className="gin-title"><Spade/><div><h1>Mindi</h1><span>{p.mode}</span></div><Spade/></div>
      <div className="gin-utilities"><button aria-label="Game settings" title="Game settings" onClick={()=>setModal("settings")}><Settings size={20}/></button>
        <button aria-label="Rules" title="Rules" onClick={()=>setModal("rules")}><CircleHelp size={20}/></button>
        <button aria-label="Game Info" title="Game Info" onClick={()=>setModal("info")}><Info size={20}/></button></div>
    </header>
    <div className="mindi-stage">
      <div className="gin-oval" style={{backgroundColor:theme.base,backgroundImage:theme.pattern,borderColor:theme.glow}} aria-hidden="true"/>
      <div className="mindi-scores"><Score title={duel?"You":"Your Team"} tens={p.tens[team]} tricks={p.tricks[team]}/>
        <span className="mindi-trump">Trump <b>{SUIT_SYMBOLS[p.trump]}</b></span>
        <Score title={duel?"Opponent":"Opponents"} tens={p.tens[other]} tricks={p.tricks[other]} opponents/></div>
      <Seat seat={p.top} position="top" partner={!duel}/>
      {p.left&&<Seat seat={p.left} position="left" partner={false}/>}
      {p.right&&<Seat seat={p.right} position="right" partner={false}/>}
      <div className="mindi-trick-zone">
        <Spade className="mindi-table-mark" aria-hidden="true"/>
        <TrickArea plays={p.trick} viewerSeat={p.viewer} duel={duel} winnerSeat={winner}/>
        {winner!==null&&<p className="mindi-trick-result" role="status">{teamOf(winner)===team?(duel?"You won the trick":"Your Team won the trick"):(duel?"Opponent won the trick":"Opponents won the trick")}</p>}
        {winner===null&&scoreNotice&&<p className="mindi-trick-result" role="status">{scoreNotice}</p>}
      </div>
      <div className={"mindi-hand"+(p.hand.length>16?" mindi-long-hand":"")} role="group" aria-label="Your cards"
        style={{"--count":Math.max(2,p.hand.length)} as React.CSSProperties}>
        {p.hand.map((card,i)=>{
          const offset=p.hand.length===1?0:(i-(p.hand.length-1)/2)/((p.hand.length-1)/2);
          const picked=selected===cardId(card);
          const allowed=legal.has(cardId(card));
          return <div key={cardId(card)} className={"mindi-card-slot"+(picked?" is-selected":"")+(!allowed&&p.active?" is-illegal":"")}
            style={{"--angle":offset*8+"deg","--curve":offset*offset*18+"px","--order":i} as React.CSSProperties}>
            <PlayingCard rank={rankLabel(card.rank)} suit={suitFromLetter(card.suit)} size="lg" selected={picked}
              disabled={!p.active||!allowed||busy} onClick={()=>setSelected(picked?null:cardId(card))}/>
          </div>;
        })}
      </div>
    </div>
    <footer className="gin-controls"><div className={"gin-self"+(p.active?" is-active":"")}><Avatar name={p.name} presetId={p.avatar}/><div><strong>{p.name}</strong><p role="status">{p.active?"Your turn":complete?"Resolving trick":"Waiting for "+([p.top,p.left,p.right].find(s=>s?.active)?.name ?? "next turn")}</p></div></div>
      <Button className="mindi-play" disabled={!canPlay} loading={busy} onClick={()=>{if(canPlay&&chosen)run(async()=>{await p.onPlay(chosen);setSelected(null);});}}><Layers size={20}/>Play Card</Button>
      {p.active&&p.legal.length<p.hand.length&&<span className="mindi-follow">Follow the led suit</span>}
    </footer>
    {error&&<p className="gin-action-error" role="alert">{error}</p>}
    {modal&&<dialog ref={dialog} className="gin-dialog" aria-labelledby="mindi-dialog-title" onCancel={e=>{if(busy)e.preventDefault();else setModal(null);}}>
      <header><h2 id="mindi-dialog-title">{modal==="leave"?"Leave game?":modal==="rules"?"Mindi Rules":modal==="info"?"Game Info":"Game Settings"}</h2><Button variant="ghost" aria-label="Close dialog" disabled={busy} onClick={()=>setModal(null)}><X size={20}/></Button></header>
      {modal==="rules"?<ul><li>{duel?"Play head-to-head to capture tens and win tricks.":"Play with the partner opposite you to capture tens and win tricks."}</li><li>Follow the led suit when you can. The highest trump wins; otherwise the highest card of the led suit wins.</li><li>The trick winner leads next. Tens are the main objective; tricks decide the remaining outcome.</li><li>Your hand is sorted by suit and rank. Only legal cards can be played.</li></ul>
        :modal==="info"?<dl className="gin-info-rows"><div><dt>Mode</dt><dd>{p.mode}</dd></div><div><dt>Trump</dt><dd>{SUIT_SYMBOLS[p.trump]}</dd></div><div><dt>Your cards</dt><dd>{p.hand.length}</dd></div><div><dt>Your tens / tricks</dt><dd>{p.tens[team]} / {p.tricks[team]}</dd></div><div><dt>Opponent tens / tricks</dt><dd>{p.tens[other]} / {p.tricks[other]}</dd></div></dl>
        :modal==="settings"?<SettingToggle icon={Music} label="Background Music" enabled={settings.music} onChange={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}/>
        :<><p>{p.online?"Leaving forfeits this match.":"Your current hand will be lost."}</p><footer><Button variant="secondary" disabled={busy} onClick={()=>setModal(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={()=>run(async()=>{await p.onLeave?.();router.push("/play");})}>Leave Game</Button></footer></>}
      {error&&<p role="alert">{error}</p>}
    </dialog>}
  </div>;
}
