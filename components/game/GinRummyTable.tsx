"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, Info, X, Layers, ArrowDownToLine, Music, BookOpen, Volume2, VolumeX, Check } from "lucide-react";
import { Card, cardId, rankLabel, bestMeldArrangement, winningDiscard, findGinLayout, TURN_SECONDS } from "@/lib/ginRummyEngine";
import { PlayingCard, suitFromLetter } from "./PlayingCard";
import { Avatar, ArenaSeatData } from "./GameArena";
import { Button } from "@/components/ui/Button";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { useSettings } from "@/contexts/SettingsContext";
import { sortHand } from "@/lib/cardSort";
import { HandTools, HandOrder, navigateHand } from "./HandTools";
import { RuleBook } from "./RuleBook";
import { TurnClock } from "./TurnClock";
import { ArenaStage } from "./ArenaStage";
import { ArenaFace } from "./ArenaCard";
import { ArenaSprite } from "./ArenaSprite";
import { GinArenaScene } from "./GinArenaScene";
import { IconButton } from "@/components/ui/IconButton";

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
  const previousHand=useRef(p.hand.map(cardId));
  const [drawnId,setDrawnId]=useState<string|null>(null);
  const [compact,setCompact]=useState(false);
  useEffect(()=>{
    const query=window.matchMedia("(max-height:600px) and (min-aspect-ratio:3/2)");
    const update=()=>setCompact(query.matches);
    update();query.addEventListener("change",update);
    return()=>query.removeEventListener("change",update);
  },[]);

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
  const canDraw=p.myTurn && p.phase==="draw" && !busy;
  const canDiscard=p.myTurn && p.phase==="discard" && !!selectedCard && !busy;

  useEffect(()=>{if(modal)dialog.current?.showModal();},[modal]);
  // The arrangement belongs to the cards that were in the hand when it was
  // made; a fresh deal is a different set entirely.
  useEffect(()=>{if(p.hand.length===0)setManual(null);},[p.hand.length]);
  useEffect(()=>{
    const ids=p.hand.map(cardId);
    const added=ids.filter(id=>!previousHand.current.includes(id));
    if(ids.length===11&&previousHand.current.length===10&&added.length===1)setDrawnId(added[0]);
    else if(ids.length!==11)setDrawnId(null);
    previousHand.current=ids;
  },[p.hand]);

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
    if(!p.myTurn||p.phase!=="discard"||busy||(event.pointerType==="mouse"&&event.button!==0))return;
    suppressClick.current=false;
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
    if(!p.myTurn||p.phase!=="discard"||busy)return;
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

  return <>
    <ArenaStage height={compact?660:900} className={"arena-gin-board gin-arena"+(compact?" gin-compact":"")}>
      <div className="ar gin-arena-board">
        <ArenaSprite/>
        <div className="bg" aria-hidden="true"/><div className="bigword" aria-hidden="true">GIN</div>
        <div className="beam gin-beam-left" aria-hidden="true"/><div className="beam gin-beam-right" aria-hidden="true"/>
        <div className="stage" aria-hidden="true"><div className="floor"/></div>
        <GinArenaScene skin={p.tableSkin}/>
        <header className="gin-arena-header">
          <IconButton aria-label="Exit Game" title="Exit Game" onClick={()=>setModal("leave")}><ArrowLeft/></IconButton>
          <div className="gin-arena-heading"><h1 className="disp chrome">Gin Rummy</h1><p><span>{p.mode}</span>4 + 3 + 3 / No knocking</p></div>
          <div className="gin-arena-utilities">
            <IconButton aria-label={settings.music?"Mute music":"Enable music"} title={settings.music?"Mute music":"Enable music"} aria-pressed={settings.music} onClick={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}>{settings.music?<Volume2/>:<VolumeX/>}</IconButton>
            <IconButton aria-label="Rule book" title="Rule book" onClick={()=>setModal("rules")}><BookOpen/></IconButton>
            <IconButton aria-label="Game Info" title="Game Info" onClick={()=>setModal("info")}><Info/></IconButton>
            <IconButton aria-label="Game settings" title="Game settings" onClick={()=>setModal("settings")}><Settings/></IconButton>
          </div>
        </header>
        <section className="hud gin-arena-meld-hud" aria-label="Hand assessment">
          <div className="gin-assessment-title"><span className="lbl">Your hand</span><strong data-ready={goingOut?"true":undefined}>{goingOut?"READY":"NOT OUT"}</strong></div>
          <div className="gin-assessment-sizes">{[4,3,3].map((n,i)=><span key={i}>{n}</span>)}<small>Cards per meld</small></div>
          <div className="gin-assessment-deadwood"><strong>{preview?.deadwoodValue??arrangement.deadwoodValue}</strong><span>Deadwood<small>{preview?"After selected discard":"Unmatched card points"}</small></span></div>
          <p>{goingOut?"A winning discard is available.":"Three complete melds to go out."}</p>
        </section>
        <section className="hud gin-arena-turn-hud" aria-label="Turn status">
          <TurnClock deadline={p.deadline??null} seconds={TURN_SECONDS} active={p.myTurn}/>
          <div><span className="lbl">{p.myTurn?"Your turn":"Opponent's turn"}</span><strong>{busy?"Working...":p.myTurn?(p.phase==="draw"?"Draw a card":"Discard a card"):"Waiting"}</strong><small>{p.myTurn?"Draw one. Discard one.":p.opponent.name}</small></div>
        </section>
        <div className="gin-arena-rival">
          <div className={"gin-player"+(!p.myTurn?" active":"")}><Avatar name={p.opponent.name} presetId={p.opponent.avatarPreset} count={p.opponent.cardCount}/><div><strong>{p.opponent.name}</strong><small>{p.myTurn?"Waiting":p.phase==="draw"?"Drawing":"Discarding"}</small></div></div>
          <div className="gin-rival-hand" aria-label={p.opponent.cardCount+" face-down cards"}>
            {Array.from({length:p.opponent.cardCount},(_,i)=><div key={i} style={{"--fan":(i-(p.opponent.cardCount-1)/2)} as React.CSSProperties}><PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={p.opponent.cardBackId}/></div>)}
          </div>
        </div>
        <div className="gin-arena-piles">
          <button type="button" data-flat aria-label={"Draw from stock, "+p.stock+" cards"} disabled={!canDraw} onClick={()=>run(()=>p.onDraw("stock"))}>
            <div className="gin-pile-card gin-stock-card"><PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={p.cardBack}/></div><span>Stock <b>{p.stock}</b></span>
          </button>
          <button type="button" data-flat aria-label="Draw from discard pile" disabled={!canDraw||!p.discard} onClick={()=>run(()=>p.onDraw("discard"))}>
            <div className="gin-pile-card">{p.discard&&<ArenaFace key={cardId(p.discard)} rank={rankLabel(p.discard.rank)} suit={p.discard.suit}/>}</div><span>Discard pile</span>
          </button>
        </div>
        <p className="gin-arena-status" role="status">{p.myTurn?(p.phase==="draw"?"Draw from stock or discard":selectedCard?`${rankLabel(selectedCard.rank)} of ${suitFromLetter(selectedCard.suit)} selected${selectedWins?" / Ready to win":""}`:"Choose a card to discard"):`${p.opponent.name}'s turn`}</p>
      <div ref={handRef} className="gin-hand" role="group"
        aria-label="Your cards" onKeyDown={handleHandKeys}>
        {displayedHand.map((card,i)=>{
          const offset=i-(p.hand.length-1)/2;
          const id=cardId(card);
          const selected=!!p.selected && cardId(p.selected)===id;
          return <div key={id} data-card-id={id}
            className={"gin-fan-slot"+(selected?" is-selected":"")+(melds&&meldIds.has(id)?" is-meld":"")+(dragId===id?" is-dragging":"")}
            onPointerDown={event=>dragStart(event,id)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
            style={{"--angle":offset*2+"deg","--curve":offset*offset*.9+"px","--offset":offset*Math.min(80,850/Math.max(1,p.hand.length-1))+"px",zIndex:selected?30:i} as React.CSSProperties}>
            <button type="button" data-flat aria-label={`${rankLabel(card.rank)} of ${suitFromLetter(card.suit)}`} aria-pressed={selected}
              disabled={!p.myTurn||p.phase!=="discard"||busy} onClick={()=>activateCard(card)}>
              <ArenaFace rank={rankLabel(card.rank)} suit={card.suit}/>
              {drawnId===id&&<span className="gin-new-card">New</span>}
              {melds&&meldIds.has(id)&&<span className="gin-meld-marker"><Check size={14}/></span>}
            </button>
          </div>;
        })}
      </div>
      {melds&&<div className="gin-arena-melds" aria-label="Meld breakdown">{arrangement.melds.map((meld,i)=><span key={i}><Check size={13}/>{meld.every(card=>card.rank===meld[0].rank)?"Set":"Run"} of {meld.length}</span>)}<span className="gin-meld-deadwood">Deadwood {arrangement.deadwoodValue}</span></div>}
    <footer className="gin-arena-controls">
      <div className={"gin-player gin-player-self"+(p.myTurn?" active":"")}><Avatar name={p.name} presetId={p.avatar}/><div><strong>{p.name}</strong><small>{p.hand.length} cards / {p.myTurn?"Your turn":"Waiting"}</small></div></div>
      <HandTools order={manual?"custom":order} custom={!!manual} melds rank
        onChange={value=>{if(value==="custom")return;setManual(null);setOrder(value);if(value==="melds")setMelds(true);}} />
      <div className="gin-actions">
        <Button variant="secondary" aria-pressed={melds} onClick={()=>setMelds(v=>!v)}><Layers size={18}/>View Melds</Button>
        <Button variant="primary" disabled={!canDiscard} loading={busy} onClick={()=>run(p.onDiscard)}>
          <ArrowDownToLine size={18}/>{selectedWins?"Discard & win":"Discard"}</Button>
      </div>
      {/* Under these rules a hand has no fixed end: if the cards each player
          still needs are in the other's hand, it can never finish. Rather
          than ending it, say so, so a long hand does not look like a bug. */}
      {(p.reshuffles??0)>=8&&<p className="gin-stalemate" role="status">
        The deck has been recycled {p.reshuffles} times — neither hand may be completable. You can keep playing or exit.
      </p>}
    </footer>
    {error&&<p className="gin-arena-error" role="alert">{error}</p>}
      </div>
    </ArenaStage>
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
  </>;
}
