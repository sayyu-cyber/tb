"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, CircleHelp, Info, Spade, X, Music, Layers, Users, History, Volume2, VolumeX } from "lucide-react";
import { LayoutGroup, motion, useReducedMotion } from "framer-motion";
import { Card, Suit, SeatIndex, Team, TrickPlay, CompletedTrick, cardId, rankLabel, SUIT_SYMBOLS, SUIT_COLOR, resolveTrick, trumpAfterTrick, teamOf } from "@/lib/mindiEngine";
import { PlayingCard, suitFromLetter } from "./PlayingCard";
import { Avatar, ArenaSeatData } from "./GameArena";
import { TrickArea } from "./TrickArea";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { useSettings } from "@/contexts/SettingsContext";
import { sortHand, HandSort } from "@/lib/cardSort";
import { navigateHand } from "./HandTools";
import { GameButton } from "./GameButton";
import { SortGameButton } from "./SortGameButton";
import { MindiTableScene } from "./MindiTableScene";
import { RuleBook } from "./RuleBook";

interface Props {
  hand:Card[]; legal:Card[]; viewer:SeatIndex; top:ArenaSeatData; left?:ArenaSeatData|null; right?:ArenaSeatData|null;
  // Trump is null until somebody cannot follow the led suit; see lib/mindiEngine.ts.
  name:string; avatar?:string; active:boolean; trump:Suit|null; trick:TrickPlay[];
  tens:Record<Team,number>; tricks:Record<Team,number>; mode:string; tableSkin?:string; online?:boolean;
  onPlay:(card:Card)=>void|Promise<void>; onLeave?:()=>void|Promise<void>;
  lastTrick?:CompletedTrick|null;
}

function Score({title,tens,tricks,opponents=false}:{title:string;tens:number;tricks:number;opponents?:boolean}) {
  const reduced=useReducedMotion();
  return <section className={"mindi-score"+(opponents?" opponents":"")} aria-label={title}>
    <h2><Users size={18}/>{title}</h2><dl>
      {[["Tens",tens],["Tricks",tricks]].map(([label,value])=><div key={label}><dt>{label}</dt>
        <motion.dd key={label+"-"+value} initial={reduced?false:{scale:.92,opacity:.6}} animate={{scale:1,opacity:1}} transition={{duration:.2}}>{value}</motion.dd></div>)}
    </dl>
  </section>;
}

function Seat({seat,position,partner}:{seat:ArenaSeatData;position:"top"|"left"|"right";partner:boolean}) {
  return <div className={"mindi-seat mindi-seat-"+position+(seat.active?" is-active":"")} data-team={partner?"self":"other"}>
    <div className="mindi-identity">
      <div className="mindi-avatar"><Avatar name={seat.name} presetId={seat.avatarPreset} size="lg" count={seat.cardCount}/></div>
      <div className="mindi-nameplate"><strong>{seat.name}</strong><span>{seat.active?"Playing":partner?"Partner":"Opponent"}</span></div>
    </div>
    <div className="mindi-hidden-hand" aria-label={seat.cardCount+" face-down cards"} data-facing={position}
      style={{"--count":Math.max(1,seat.cardCount)} as React.CSSProperties}>
      {Array.from({length:seat.cardCount},(_,i)=>{
        const offset=seat.cardCount>1?(i/(seat.cardCount-1)-.5)*2:0;
        return <div key={i} style={{"--fan":offset,"--fan-angle":offset*12+"deg","--fan-curve":offset*offset*9+"px","--index":i} as React.CSSProperties}>
          <PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={seat.cardBackId}/>
        </div>;
      })}
    </div>
  </div>;
}

export function MindiTable(p:Props) {
  const router=useRouter();
  const tableId=useId();
  const [settledTrick,setSettledTrick]=useState<CompletedTrick|null>(null);
  const reducedMotion=useReducedMotion();
  const {settings,updateSettings}=useSettings();
  const [selected,setSelected]=useState<string|null>(null);
  const [modal,setModal]=useState<"rules"|"settings"|"leave"|"info"|"last-trick"|null>(null);
  const [order,setOrder]=useState<HandSort>("suit");
  // Null means "just use the sort". Once the player drags (or Alt+Arrows) a
  // card, this holds their own card order and the sort takes a back seat.
  const [manual,setManual]=useState<string[]|null>(null);
  const [dragId,setDragId]=useState<string|null>(null);
  const handRef=useRef<HTMLDivElement>(null);
  const drag=useRef<{id:string;x:number;active:boolean}|null>(null);
  const suppressClick=useRef(false);
  const lastTap=useRef<{id:string;at:number}|null>(null);
  const displayedHand=useMemo(()=>{
    const sorted=sortHand(p.hand,order);
    if(!manual) return sorted;
    const byId=new Map(p.hand.map(card=>[cardId(card),card]));
    const kept=manual.map(id=>byId.get(id)).filter((card):card is Card=>!!card);
    const keptIds=new Set(kept.map(cardId));
    // Anything the manual list doesn't mention falls in at the end in sorted
    // order rather than disappearing from the hand.
    return [...kept,...sorted.filter(card=>!keptIds.has(cardId(card)))];
  },[p.hand,order,manual]);
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
  useEffect(()=>{
    if(!p.online||!p.lastTrick)return;
    setSettledTrick(p.lastTrick);
    const timer=setTimeout(()=>setSettledTrick(null),850);
    return()=>clearTimeout(timer);
  },[p.lastTrick,p.online]);
  const legal=useMemo(()=>new Set(p.legal.map(cardId)),[p.legal]);
  const chosen=p.hand.find(card=>cardId(card)===selected);
  const canPlay=!!chosen&&legal.has(cardId(chosen))&&p.active&&!busy;
  useEffect(()=>{setSelected(null);},[p.viewer,p.active]);
  // Pass & Play hands the device to a different person, whose cards are not
  // the ones this arrangement describes. Keyed on the viewer alone - clearing
  // it whenever the turn changes would wipe the arrangement every trick.
  useEffect(()=>{setManual(null);},[p.viewer]);
  useEffect(()=>{if(modal)dialog.current?.showModal();},[modal]);
  async function run(fn:()=>void|Promise<void>) {
    if(pending.current)return;
    pending.current=true;setBusy(true);setError("");
    try{await fn();}catch{setError("Action failed. Please try again.");}
    finally{pending.current=false;setBusy(false);}
  }
  function reorder(from:number,to:number) {
    if(from<0||to<0||from===to||to>=displayedHand.length)return;
    const ids=displayedHand.map(cardId);
    const [moved]=ids.splice(from,1);
    ids.splice(to,0,moved);
    setManual(ids);
  }

  function focusCard(id:string) {
    requestAnimationFrame(()=>handRef.current?.querySelector<HTMLButtonElement>(`[data-card-id="${id}"] button`)?.focus({preventScroll:true}));
  }

  // Alt+Arrow moves the focused card; plain arrows still just move focus, so
  // rearranging is reachable without a pointer at all.
  function handleHandKeys(event:React.KeyboardEvent<HTMLDivElement>) {
    if(event.altKey&&(event.key==="ArrowLeft"||event.key==="ArrowRight")) {
      const id=(event.target as HTMLElement).closest<HTMLElement>(".mindi-card-slot")?.dataset.cardId;
      if(!id)return;
      event.preventDefault();
      const from=displayedHand.findIndex(card=>cardId(card)===id);
      reorder(from,from+(event.key==="ArrowRight"?1:-1));
      focusCard(id);
      return;
    }
    navigateHand(event);
  }

  function dragStart(event:React.PointerEvent<HTMLDivElement>,id:string) {
    if(event.pointerType==="mouse"&&event.button!==0)return;
    drag.current={id,x:event.clientX,active:false};
  }

  function dragMove(event:React.PointerEvent<HTMLDivElement>) {
    const state=drag.current;
    if(!state)return;
    // A drag only begins past a small threshold, so a tap (and therefore the
    // double-tap-to-play below) is never swallowed by the reorder gesture.
    if(!state.active) {
      if(Math.abs(event.clientX-state.x)<10)return;
      state.active=true;
      setDragId(state.id);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const slots=Array.from(handRef.current?.querySelectorAll<HTMLElement>(".mindi-card-slot")??[]);
    let nearest=-1,best=Infinity;
    slots.forEach((slot,i)=>{
      const rect=slot.getBoundingClientRect();
      const distance=Math.abs(event.clientX-(rect.left+rect.width/2));
      if(distance<best){best=distance;nearest=i;}
    });
    reorder(displayedHand.findIndex(card=>cardId(card)===state.id),nearest);
  }

  function dragEnd(event:React.PointerEvent<HTMLDivElement>) {
    const state=drag.current;
    drag.current=null;
    if(!state?.active)return;
    // The click that follows this pointerup would otherwise select the card
    // the player was only repositioning.
    suppressClick.current=true;
    setDragId(null);
    if(event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  /** Tap once to select, twice to play - the same gesture on mouse and touch. */
  function activateCard(card:Card) {
    if(suppressClick.current){suppressClick.current=false;return;}
    const id=cardId(card);
    const now=Date.now();
    const previous=lastTap.current;
    lastTap.current={id,at:now};
    if(previous&&previous.id===id&&now-previous.at<320) {
      lastTap.current=null;
      if(p.active&&legal.has(id)&&!busy) run(async()=>{await p.onPlay(card);setSelected(null);});
      return;
    }
    setSelected(current=>current===id?null:id);
  }

  const visibleTrick=p.trick.length?p.trick:settledTrick?.plays??p.trick;
  const complete=visibleTrick.length===(duel?2:4);
  // A renege inside the current trick sets trump for that same trick, and the
  // parent only commits the new suit to state after the trick resolves - so
  // derive it from the cards on the table rather than reading p.trump alone.
  const effectiveTrump=trumpAfterTrick(p.trump,p.trick);
  const winner=complete?resolveTrick(visibleTrick,effectiveTrump):null;
  const trumpLabel=effectiveTrump?SUIT_SYMBOLS[effectiveTrump]:"—";
  return <LayoutGroup id={tableId}><div className="gin-room mindi-room" data-duel={duel||undefined}>
    <header className="mindi-header">
      <GameButton className="mindi-exit" aria-label="Exit Game" onClick={()=>setModal("leave")}><ArrowLeft size={25}/><span>Exit Game<small>Return to lobby</small></span></GameButton>
      <div className="mindi-title"><Spade/><div><h1>Mindi</h1><span>{p.mode}</span></div><Spade/></div>
      <div className="mindi-utilities">
        <GameButton iconOnly aria-label="Game settings" title="Game settings" onClick={()=>setModal("settings")}><Settings size={22}/></GameButton>
        <GameButton iconOnly aria-label={settings.music?"Mute music":"Enable music"} title={settings.music?"Mute music":"Enable music"} aria-pressed={settings.music}
          onClick={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}>{settings.music?<Volume2 size={22}/>:<VolumeX size={22}/>}</GameButton>
        <GameButton iconOnly aria-label="Rules" title="Rules" onClick={()=>setModal("rules")}><CircleHelp size={22}/></GameButton>
        <GameButton iconOnly aria-label="Game Info" title="Game Info" onClick={()=>setModal("info")}><Info size={22}/></GameButton>
      </div>
    </header>
    <div className="mindi-stage">
      <MindiTableScene skin={p.tableSkin}/>
      <div className="mindi-scores"><Score title={duel?"You":"Your Team"} tens={p.tens[team]} tricks={p.tricks[team]}/>
        <Score title={duel?"Opponent":"Opponents"} tens={p.tens[other]} tricks={p.tricks[other]} opponents/></div>
      <Seat seat={p.top} position="top" partner={!duel}/>
      {p.left&&<Seat seat={p.left} position="left" partner={false}/>}
      {p.right&&<Seat seat={p.right} position="right" partner={false}/>}
      <div className="mindi-trick-zone">
        <Spade className="mindi-table-mark" aria-hidden="true"/>
        <TrickArea plays={visibleTrick} viewerSeat={p.viewer} duel={duel} winnerSeat={winner} dimensional layoutPrefix={tableId}/>
        {winner!==null&&<p className="mindi-trick-result" role="status">{teamOf(winner)===team?(duel?"You won the trick":"Your Team won the trick"):(duel?"Opponent won the trick":"Opponents won the trick")}</p>}
        {winner===null&&scoreNotice&&<p className="mindi-trick-result" role="status">{scoreNotice}</p>}
      </div>
      <div className="mindi-quick-actions"><GameButton iconOnly aria-label="Last Trick" title="Last trick" disabled={!p.lastTrick} onClick={()=>setModal("last-trick")}><History size={22}/></GameButton></div>
      <div ref={handRef} className={"mindi-hand"+(p.hand.length>16?" mindi-long-hand":"")} role="group"
        aria-label="Your cards — double tap a card to play it, drag or Alt+Arrow to rearrange" onKeyDown={handleHandKeys}
        style={{"--count":Math.max(2,p.hand.length)} as React.CSSProperties}>
        {displayedHand.map((card,i)=>{
          const offset=p.hand.length===1?0:(i-(p.hand.length-1)/2)/((p.hand.length-1)/2);
          const id=cardId(card);
          const picked=selected===id;
          const allowed=legal.has(id);
          return <div key={id} data-card-id={id}
            className={"mindi-card-slot"+(picked?" is-selected":"")+(!allowed&&p.active?" is-illegal":"")+(dragId===id?" is-dragging":"")}
            onPointerDown={event=>dragStart(event,id)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
            style={{"--angle":offset*8+"deg","--curve":offset*offset*18+"px","--order":i} as React.CSSProperties}>
            {/* Rearranging is always allowed, so the card stays draggable even
                when it is an illegal play and the button itself is disabled. */}
            <PlayingCard rank={rankLabel(card.rank)} suit={suitFromLetter(card.suit)} size="lg" selected={picked} dimensional layoutId={`${tableId}-${id}`}
              disabled={!p.active||!allowed||busy} onClick={()=>activateCard(card)}/>
          </div>;
        })}
      </div>
    </div>
    <footer className="mindi-hud">
      <div className={"mindi-self"+(p.active?" is-active":"")}>
        <div className="mindi-avatar"><Avatar name={p.name} presetId={p.avatar} size="lg" count={p.hand.length}/></div>
        <div><strong>{p.name}</strong><p role="status"><i aria-hidden="true"/>{p.active?"Your turn":complete?"Resolving trick":"Waiting for "+([p.top,p.left,p.right].find(seat=>seat?.active)?.name??"next turn")}</p></div>
      </div>
      <SortGameButton order={manual?"custom":order} onChange={value=>{setManual(null);setOrder(value);}}/>
      <GameButton tone="gold" className="mindi-play" disabled={!canPlay} busy={busy} onClick={()=>{if(canPlay&&chosen)run(async()=>{await p.onPlay(chosen);setSelected(null);});}}><Layers size={23}/>Play Card</GameButton>
      <motion.div className="mindi-trump" data-set={effectiveTrump?"true":undefined} data-suit={effectiveTrump?SUIT_COLOR[effectiveTrump]:undefined}
        role="status" aria-label={effectiveTrump?"Trump: "+suitFromLetter(effectiveTrump):"Trump: Not set yet"}>
        <span>Trump</span><motion.b key={effectiveTrump??"none"} initial={reducedMotion?false:{scale:.8}} animate={{scale:1}} transition={{duration:.25}} aria-hidden="true">{trumpLabel}</motion.b>
        <small>{effectiveTrump?suitFromLetter(effectiveTrump):"Not set yet"}</small>
      </motion.div>
    </footer>
    {error&&<p className="gin-action-error" role="alert">{error}</p>}
    {modal&&<dialog ref={dialog} className={"gin-dialog"+(modal==="rules"?" rule-book-dialog":"")} aria-labelledby="mindi-dialog-title" onCancel={e=>{if(busy)e.preventDefault();else setModal(null);}}>
      <header><h2 id="mindi-dialog-title">{modal==="last-trick"?`Trick ${p.lastTrick?.number}`:modal==="leave"?"Leave game?":modal==="rules"?"Mindi rule book":modal==="info"?"Game Info":"Game Settings"}</h2><GameButton iconOnly aria-label="Close dialog" disabled={busy} onClick={()=>setModal(null)}><X size={20}/></GameButton></header>
      {modal==="last-trick"&&p.lastTrick?<div className="last-trick-review">{p.lastTrick.plays.map(play=>{
        const relative=(play.seat-p.viewer+4)%4;
        const name=play.seat===p.viewer?p.name:duel?p.top.name:relative===1?p.left?.name:relative===2?p.top.name:p.right?.name;
        return <div key={play.seat} data-winner={play.seat===p.lastTrick!.winner}><strong>{name}</strong><PlayingCard rank={rankLabel(play.card.rank)} suit={suitFromLetter(play.card.suit)} size="lg"/><span>{play.seat===p.lastTrick!.winner?"Winner":""}</span></div>;
      })}</div>:modal==="rules"?<RuleBook game="mindi"/>
        :modal==="info"?<dl className="gin-info-rows"><div><dt>Mode</dt><dd>{p.mode}</dd></div><div><dt>Trump</dt><dd>{effectiveTrump?SUIT_SYMBOLS[effectiveTrump]:"Not set yet"}</dd></div><div><dt>Your cards</dt><dd>{p.hand.length}</dd></div><div><dt>Your tens / tricks</dt><dd>{p.tens[team]} / {p.tricks[team]}</dd></div><div><dt>Opponent tens / tricks</dt><dd>{p.tens[other]} / {p.tricks[other]}</dd></div></dl>
        :modal==="settings"?<SettingToggle icon={Music} label="Background Music" enabled={settings.music} onChange={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}/>
        :<><p>{p.online?"Leaving forfeits this match.":"Your current hand will be lost."}</p><footer><GameButton disabled={busy} onClick={()=>setModal(null)}>Cancel</GameButton><GameButton tone="danger" busy={busy} onClick={()=>run(async()=>{await p.onLeave?.();router.push("/play");})}>Leave Game</GameButton></footer></>}
      {error&&<p role="alert">{error}</p>}
    </dialog>}
  </div></LayoutGroup>;
}
