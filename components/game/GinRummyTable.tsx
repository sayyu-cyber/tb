"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, CircleHelp, Info, Spade, X, Layers, ArrowDownToLine, Music, BookOpen } from "lucide-react";
import { Card, cardId, rankLabel, bestMeldArrangement, winningDiscard, findGinLayout, TURN_SECONDS } from "@/lib/ginRummyEngine";
import { PlayingCard, suitFromLetter } from "./PlayingCard";
import { Avatar, ArenaSeatData, TABLE_THEME_STYLES } from "./GameArena";
import { Button } from "@/components/ui/Button";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { useSettings } from "@/contexts/SettingsContext";
import { sortHand } from "@/lib/cardSort";
import { HandTools, HandOrder, navigateHand } from "./HandTools";
import { RuleBook } from "./RuleBook";
import { TurnClock } from "./TurnClock";

interface Props {
  hand:Card[]; selected:Card|null; opponent:ArenaSeatData; name:string; avatar?:string;
  stock:number; discard:Card|null; phase:"draw"|"discard"; myTurn:boolean;
  mode:string; tableSkin?:string; cardBack?:string; online?:boolean;
  /** Epoch ms when this turn expires, or null when no clock is running. */
  deadline?:number|null;
  /** How many times the discard pile has been recycled - see the notice below. */
  reshuffles?:number;
  onDraw:(source:"stock"|"discard")=>void|Promise<void>; onSelect:(card:Card)=>void;
  onDiscard:()=>void|Promise<void>; onLeave?:()=>void|Promise<void>;
}

export function GinRummyTable(p:Props) {
  const router=useRouter();
  const {settings,updateSettings}=useSettings();
  const [modal,setModal]=useState<"rules"|"settings"|"leave"|"info"|null>(null);
  const [melds,setMelds]=useState(false);
  const [order,setOrder]=useState<HandOrder>("melds");
  const [manual,setManual]=useState<string[]|null>(null);
  const [dragId,setDragId]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const pending=useRef(false);
  const dialog=useRef<HTMLDialogElement>(null);
  const handRef=useRef<HTMLDivElement>(null);
  const drag=useRef<{id:string;x:number;active:boolean}|null>(null);
  const suppressClick=useRef(false);
  const lastTap=useRef<{id:string;at:number}|null>(null);

  const arrangement=useMemo(()=>bestMeldArrangement(p.hand),[p.hand]);
  const selectedCard=p.hand.find(card=>p.selected&&cardId(card)===cardId(p.selected));
  const preview=useMemo(()=>selectedCard&&p.phase==="discard"&&p.myTurn ? bestMeldArrangement(p.hand.filter(card=>cardId(card)!==cardId(selectedCard))) : null,[p.hand,p.phase,p.myTurn,selectedCard]);
  // Whether ANY discard would go out, and whether the selected one does. The
  // table can work this out itself - it already holds the player's cards.
  const goingOut=useMemo(()=>winningDiscard(p.hand),[p.hand]);
  const selectedWins=useMemo(()=>!!selectedCard&&!!findGinLayout(p.hand.filter(card=>cardId(card)!==cardId(selectedCard))),[p.hand,selectedCard]);

  const displayedHand=useMemo(()=>{
    const base=order==="melds"
      ? [...arrangement.melds.flatMap(meld=>sortHand(meld)),...sortHand(arrangement.deadwood)]
      : sortHand(p.hand,order==="rank"?"rank":"suit");
    if(!manual) return base;
    const byId=new Map(p.hand.map(card=>[cardId(card),card]));
    const kept=manual.map(id=>byId.get(id)).filter((card):card is Card=>!!card);
    const keptIds=new Set(kept.map(cardId));
    // A drawn card is not in the manual list yet, so it joins at the end
    // rather than vanishing from the hand.
    return [...kept,...base.filter(card=>!keptIds.has(cardId(card)))];
  },[p.hand,order,arrangement,manual]);

  const meldIds=new Set(arrangement.melds.flat().map(cardId));
  const theme=TABLE_THEME_STYLES[p.tableSkin ?? ""] ?? TABLE_THEME_STYLES.tt_default;
  const canDraw=p.myTurn && p.phase==="draw" && !busy;
  const canDiscard=p.myTurn && p.phase==="discard" && !!selectedCard && !busy;

  useEffect(()=>{if(modal)dialog.current?.showModal();},[modal]);
  // The arrangement belongs to the cards that were in the hand when it was
  // made; a fresh deal is a different set entirely.
  useEffect(()=>{if(p.hand.length===0)setManual(null);},[p.hand.length]);

  async function run(fn:()=>void|Promise<void>) {
    if(pending.current)return;
    pending.current=true;setBusy(true);setError("");
    try {await fn();} catch {setError("Action failed. Please try again.");}
    finally {pending.current=false;setBusy(false);}
  }

  function reorder(from:number,to:number) {
    if(from<0||to<0||from===to||to>=displayedHand.length)return;
    const ids=displayedHand.map(cardId);
    const [moved]=ids.splice(from,1);
    ids.splice(to,0,moved);
    setManual(ids);
  }

  function handleHandKeys(event:React.KeyboardEvent<HTMLDivElement>) {
    if(event.altKey&&(event.key==="ArrowLeft"||event.key==="ArrowRight")) {
      const id=(event.target as HTMLElement).closest<HTMLElement>(".gin-fan-slot")?.dataset.cardId;
      if(!id)return;
      event.preventDefault();
      const from=displayedHand.findIndex(card=>cardId(card)===id);
      reorder(from,from+(event.key==="ArrowRight"?1:-1));
      requestAnimationFrame(()=>handRef.current?.querySelector<HTMLButtonElement>(`[data-card-id="${id}"] button`)?.focus({preventScroll:true}));
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
    // Past a threshold only, so a tap - and therefore double-tap-to-discard -
    // is never swallowed by the reorder gesture.
    if(!state.active) {
      if(Math.abs(event.clientX-state.x)<10)return;
      state.active=true;setDragId(state.id);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const slots=Array.from(handRef.current?.querySelectorAll<HTMLElement>(".gin-fan-slot")??[]);
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
    suppressClick.current=true;setDragId(null);
    if(event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  /** First tap highlights the card, second tap discards it. */
  function activateCard(card:Card) {
    if(suppressClick.current){suppressClick.current=false;return;}
    const id=cardId(card);
    const now=Date.now();
    const previous=lastTap.current;
    lastTap.current={id,at:now};
    if(previous&&previous.id===id&&now-previous.at<320) {
      lastTap.current=null;
      // Only discard the card that is actually highlighted - a fast double tap
      // on a different card selects it first rather than throwing it away.
      if(p.myTurn&&p.phase==="discard"&&!busy&&p.selected&&cardId(p.selected)===id) {
        run(p.onDiscard);
        return;
      }
    }
    p.onSelect(card);
  }

  const info=<dl className="gin-info-rows"><div><dt>Mode</dt><dd>{p.mode}</dd></div>
    <div><dt>Turn</dt><dd>{p.myTurn?"Yours":p.opponent.name}</dd></div>
    <div><dt>Your cards</dt><dd>{p.hand.length}</dd></div>
    <div><dt>Deadwood</dt><dd>{arrangement.deadwoodValue}</dd></div>
    <div><dt>Stock</dt><dd>{p.stock} cards</dd></div>
    <div><dt>Opponent</dt><dd>{p.opponent.cardCount} cards</dd></div>
    {!!p.reshuffles&&<div><dt>Reshuffles</dt><dd>{p.reshuffles}</dd></div>}</dl>;

  return <div className="gin-room">
    <header className="gin-header">
      <button className="gin-exit" aria-label="Exit Game" onClick={()=>setModal("leave")}><ArrowLeft size={22}/><span>Exit Game<small>Return to lobby</small></span></button>
      <div className="gin-title"><Spade/><div><h1>Gin Rummy</h1><span>{p.mode}</span></div><Spade/></div>
      <div className="gin-utilities"><button aria-label="Game settings" title="Game settings" onClick={()=>setModal("settings")}><Settings size={20}/></button>
        <button aria-label="Rule book" title="Rule book" onClick={()=>setModal("rules")}><BookOpen size={20}/></button>
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
      <div className="gin-piles">
        <button aria-label={"Draw from stock, "+p.stock+" cards"} disabled={!canDraw} onClick={()=>run(()=>p.onDraw("stock"))}>
          <PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={p.cardBack}/>
          <span>Stock ({p.stock})</span></button>
        <button aria-label="Draw from discard pile" disabled={!canDraw || !p.discard} onClick={()=>run(()=>p.onDraw("discard"))}>
          {p.discard?<PlayingCard rank={rankLabel(p.discard.rank)} suit={suitFromLetter(p.discard.suit)} size="lg"/>:<div className="gin-empty-pile"/>}<span>Discard pile</span></button>
      </div>
      {/* Math.max(2, …): the fan slot width is calc(100% / (--count - 1)), so
          a one-card hand divides by zero and the fan collapses. */}
      <div ref={handRef} className="gin-hand" role="group"
        aria-label="Your cards — tap to highlight, tap again to discard, drag or Alt+Arrow to rearrange"
        onKeyDown={handleHandKeys} style={{"--count":Math.max(2,p.hand.length)} as React.CSSProperties}>
        {displayedHand.map((card,i)=>{
          const offset=i-(p.hand.length-1)/2;
          const id=cardId(card);
          const selected=!!p.selected && cardId(p.selected)===id;
          return <div key={id} data-card-id={id}
            className={"gin-fan-slot"+(selected?" is-selected":"")+(melds&&meldIds.has(id)?" is-meld":"")+(dragId===id?" is-dragging":"")}
            onPointerDown={event=>dragStart(event,id)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
            style={{"--angle":offset*1.5+"deg","--curve":offset*offset*.8+"px","--order":i} as React.CSSProperties}>
            <PlayingCard rank={rankLabel(card.rank)} suit={suitFromLetter(card.suit)} size="lg" selected={selected}
              disabled={!p.myTurn||p.phase!=="discard"||busy} onClick={()=>activateCard(card)}/>
          </div>;
        })}
      </div>
    </div>
    <footer className="gin-controls">
      <div className={"gin-self"+(p.myTurn?" is-active":"")}><Avatar name={p.name} presetId={p.avatar}/>
        <div><strong>{p.name}</strong><p role="status">{p.myTurn?(p.phase==="draw"?"Your turn — draw a card":"Your turn — discard a card"):"Opponent's turn"}</p></div></div>
      <TurnClock deadline={p.deadline??null} seconds={TURN_SECONDS} active={p.myTurn}/>
      <p className="gin-deadwood" data-ready={goingOut?"true":undefined}>
        <span>{goingOut?"Ready":"Deadwood"}</span>
        <strong aria-live="polite">{goingOut?"3·3·4":String(preview?.deadwoodValue??arrangement.deadwoodValue)}</strong>
        <small>{goingOut?"Discard to go out":"Meld 3 · 3 · 4 to win"}</small>
      </p>
      <HandTools order={manual?"custom":order} custom={!!manual} melds rank
        onChange={value=>{if(value==="custom")return;setManual(null);setOrder(value);if(value==="melds")setMelds(true);}} />
      <div className="gin-actions">
        <Button variant="secondary" aria-pressed={melds} onClick={()=>setMelds(v=>!v)}><Layers size={18}/>View Melds</Button>
        <Button variant={selectedWins?"primary":"secondary"} disabled={!canDiscard} loading={busy} onClick={()=>run(p.onDiscard)}>
          <ArrowDownToLine size={18}/>{selectedWins?"Discard & win":"Discard"}</Button>
      </div>
      {/* Under these rules a hand has no fixed end: if the cards each player
          still needs are in the other's hand, it can never finish. Rather
          than ending it, say so, so a long hand does not look like a bug. */}
      {(p.reshuffles??0)>=8&&<p className="gin-stalemate" role="status">
        The deck has been recycled {p.reshuffles} times — neither hand may be completable. You can keep playing or exit.
      </p>}
    </footer>
    {error&&<p className="gin-action-error" role="alert">{error}</p>}
    {modal&&<dialog ref={dialog} className={"gin-dialog"+(modal==="rules"?" rule-book-dialog":"")} aria-labelledby="gin-dialog-title" onCancel={e=>{if(busy)e.preventDefault();else setModal(null);}}>
      <header><h2 id="gin-dialog-title">{modal==="leave"?"Leave game?":modal==="rules"?"Gin Rummy rule book":modal==="info"?"Game Info":"Game Settings"}</h2>
        <Button variant="ghost" aria-label="Close dialog" disabled={busy} onClick={()=>setModal(null)}><X size={20}/></Button></header>
      {modal==="info"?info
        :modal==="rules"?<RuleBook game="gin"/>
        :modal==="settings"?<SettingToggle icon={Music} label="Background Music" enabled={settings.music} onChange={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}/>
        :<><p>{p.online?"Leaving forfeits this match.":"Your current hand will be lost."}</p>
          <footer><Button variant="secondary" disabled={busy} onClick={()=>setModal(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={()=>run(async()=>{await p.onLeave?.();router.push("/play");})}>Leave Game</Button></footer></>}
      {error&&<p role="alert">{error}</p>}
    </dialog>}
  </div>;
}
