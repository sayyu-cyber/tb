"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Settings, X, Layers, ArrowDownToLine, Music, BookOpen, Volume2, VolumeX } from "lucide-react";
import { Card, cardId, rankLabel, bestMeldArrangement, winningDiscard, findGinLayout, TURN_SECONDS } from "@/lib/ginRummyEngine";
import { PlayingCard, suitFromLetter } from "./PlayingCard";
import { Avatar, ArenaSeatData } from "./GameArena";
import { Button } from "@/components/ui/Button";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "@/hooks/useTranslation";
import { usePublishMatchGate } from "@/contexts/MatchGateContext";
import { sortHand } from "@/lib/cardSort";
import { HandTools, HandOrder, navigateHand } from "./HandTools";
import { RuleBook } from "./RuleBook";
import { TurnClock } from "./TurnClock";
import { ArenaStage } from "./ArenaStage";
import { ArenaFace } from "./ArenaCard";
import { ArenaSprite, Suit } from "./ArenaSprite";
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
  const t=useTranslation();
  const [modal,setModal]=useState<"rules"|"settings"|"leave"|null>(null);
  // The board draws the brackets on, so that is the state you arrive in.
  const [melds,setMelds]=useState(true);
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
  /* Stable, because the gate keeps whatever it was last given: a new closure
     on every render would have it republishing for no reason. */
  const askToLeave=useCallback(()=>setModal("leave"),[]);
  const [drawnId,setDrawnId]=useState<string|null>(null);
  // Which pile the card came from, so the status line can say so the way the
  // board does ("You drew the 3 of spades from the stock").
  const [drawnFrom,setDrawnFrom]=useState<"stock"|"discard"|null>(null);
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

  const drawnCard=drawnId?p.hand.find(card=>cardId(card)===drawnId):undefined;
  const canDraw=p.myTurn && p.phase==="draw" && !busy;
  const canDiscard=p.myTurn && p.phase==="discard" && !!selectedCard && !busy;

  /**
   * The brackets under the fan (design/arena/boards/Gin.dc.html, `.bracket`).
   *
   * The board draws one per meld with the deadwood bracketed off at the end,
   * which only reads that way while the cards sit in meld order. So they are
   * built from CONSECUTIVE runs of the displayed hand rather than from the
   * melds directly: in meld order that gives exactly the board's four, and
   * in rank or a hand-dragged order a split meld gets two honest brackets
   * instead of one bracket spanning cards that aren't together.
   *
   * The geometry is the fan's own: every slot is absolute at
   * `calc(50% - 54px)` translated by its --offset, so a run's left edge and
   * width follow from the first and last offsets without measuring the DOM.
   */
  const brackets=useMemo(()=>{
    const meldOf=new Map<string,number>();
    arrangement.melds.forEach((meld,index)=>meld.forEach(card=>meldOf.set(cardId(card),index)));
    const step=Math.min(80,850/Math.max(1,p.hand.length-1));
    const runs:{from:number;to:number;meld:number}[]=[];
    displayedHand.forEach((card,i)=>{
      const meld=meldOf.get(cardId(card))??-1;
      const last=runs[runs.length-1];
      if(last&&last.meld===meld&&last.to===i-1) last.to=i;
      else runs.push({from:i,to:i,meld});
    });
    let deadwoodShown=false;
    return runs.map(run=>{
      const cards=run.to-run.from+1;
      const offsetAt=(i:number)=>(i-(p.hand.length-1)/2)*step;
      const meld=run.meld>=0?arrangement.melds[run.meld]:null;
      const whole=!!meld&&cards===meld.length;
      let label:string;
      if(meld) {
        const kind=meld.every(card=>card.rank===meld[0].rank)?"Set":"Run";
        label=whole?`${kind} of ${meld.length}`:kind;
      } else {
        label=deadwoodShown?"Deadwood":`Deadwood ${arrangement.deadwoodValue}`;
        deadwoodShown=true;
      }
      return {
        key:`${run.from}-${run.meld}`,
        deadwood:!meld,
        label,
        left:`calc(50% - 54px + ${offsetAt(run.from)}px)`,
        width:`${offsetAt(run.to)-offsetAt(run.from)+108}px`,
      };
    });
  },[displayedHand,arrangement,p.hand.length]);

  /**
   * What the left-hand panel says. The board names the card that wins -
   * "Throw the King of diamonds and all ten cards are melded. That is Gin."
   * - rather than saying a winning discard exists, and it prints the melds
   * the hand actually holds rather than the 4 / 3 / 3 it is aiming at.
   */
  const outCard=goingOut;
  const meldSizes=arrangement.melds.map(meld=>meld.length);
  const readLine=outCard
    ? `Throw the ${rankLabel(outCard.rank)} of ${suitFromLetter(outCard.suit)} and all ten cards are melded. That is Gin.`
    : p.myTurn
      ? "Deadwood never wins a hand here. Three complete melds go out."
      : `Deadwood never wins a hand here. ${p.opponent.name} is ${p.phase==="draw"?"drawing":"discarding"}.`;

  /* What the rotate gate says while this hand runs on a phone held upright
     (components/layout/RotateGate.tsx, design/arena/boards/MRotate.dc.html).
     Gin does have a turn clock, so the deadline goes across and the gate
     draws its countdown ring and pulses from five seconds - the same clock
     this screen shows, not a second one. */
  usePublishMatchGate({
    label:`Gin Rummy · ${p.mode}`,
    progress:t("rotate_inStock").replace("{n}",String(p.stock)),
    turn:p.myTurn
      ? {mine:true,deadline:p.deadline??null,seconds:TURN_SECONDS,
         detail:p.phase==="draw"?t("rotate_drawACard"):t("rotate_discardACard")}
      : {mine:false,name:p.opponent.name},
    onLeave:askToLeave,
  });

  useEffect(()=>{if(modal)dialog.current?.showModal();},[modal]);
  // The arrangement belongs to the cards that were in the hand when it was
  // made; a fresh deal is a different set entirely.
  useEffect(()=>{if(p.hand.length===0)setManual(null);},[p.hand.length]);
  useEffect(()=>{
    const ids=p.hand.map(cardId);
    const added=ids.filter(id=>!previousHand.current.includes(id));
    if(ids.length===11&&previousHand.current.length===10&&added.length===1)setDrawnId(added[0]);
    else if(ids.length!==11){setDrawnId(null);setDrawnFrom(null);}
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
          <div className="gin-arena-heading">
            <h1 className="disp chrome">Gin Rummy<span className="thaana" lang="dv" dir="rtl">ޖިން ރަމީ</span></h1>
            <p><span>{p.mode}</span>Melds of 4, 3 and 3 win · No knocking</p>
          </div>
          {/* The board's three: sound, the rule book, and settings. Game Info
              is the app's own, so it lives inside the settings dialog rather
              than adding a fourth button the board does not draw. */}
          <div className="gin-arena-utilities">
            <IconButton aria-label={settings.music?"Mute music":"Enable music"} title={settings.music?"Mute music":"Enable music"} aria-pressed={settings.music} onClick={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}>{settings.music?<Volume2/>:<VolumeX/>}</IconButton>
            <IconButton aria-label="Rule book" title="Rule book" onClick={()=>setModal("rules")}><BookOpen/></IconButton>
            <IconButton aria-label="Game settings" title="Game settings" onClick={()=>setModal("settings")}><Settings/></IconButton>
          </div>
        </header>
        {/* The board's left panel: whether the hand is out, the melds it
            actually holds, its deadwood, and one line of why. */}
        <section className="hud gin-arena-meld-hud" aria-label="Hand assessment">
          <div className="gin-assessment-title">
            <span className="lbl dash" data-ready={outCard?"true":undefined}>{outCard?"Ready":"Not out"}</span>
            <span className="lbl">Deadwood</span>
          </div>
          <div className="gin-assessment-sizes">
            <strong className="disp">{meldSizes.length?meldSizes.join(" · "):"—"}</strong>
            <span className="num">{preview?.deadwoodValue??arrangement.deadwoodValue}</span>
          </div>
          <p>{readLine}</p>
        </section>
        <section className="hud gin-arena-turn-hud" aria-label="Turn status">
          <TurnClock deadline={p.deadline??null} seconds={TURN_SECONDS} active={p.myTurn}/>
          <div>
            <span className="lbl dash">{p.myTurn?"Your turn":p.opponent.name}</span>
            <strong>{busy?"Working...":p.myTurn?(p.phase==="draw"?"Draw a card":"Discard a card"):(p.phase==="draw"?"Drawing":"Discarding")}</strong>
            <small>{TURN_SECONDS} seconds a turn</small>
          </div>
        </section>
        <div className="gin-arena-rival">
          <div className={"gin-player"+(!p.myTurn?" active":"")}><Avatar name={p.opponent.name} presetId={p.opponent.avatarPreset} count={p.opponent.cardCount}/><div><strong>{p.opponent.name}</strong><small>{p.myTurn?"Waiting":p.phase==="draw"?"Drawing":"Discarding"}</small></div></div>
          <div className="gin-rival-hand" aria-label={p.opponent.cardCount+" face-down cards"}>
            {Array.from({length:p.opponent.cardCount},(_,i)=><div key={i} style={{"--fan":(i-(p.opponent.cardCount-1)/2)} as React.CSSProperties}><PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={p.opponent.cardBackId}/></div>)}
          </div>
        </div>
        <div className="gin-arena-piles">
          <button type="button" data-flat aria-label={"Draw from stock, "+p.stock+" cards"} disabled={!canDraw} onClick={()=>{setDrawnFrom("stock");run(()=>p.onDraw("stock"));}}>
            <div className="gin-pile-card gin-stock-card"><PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={p.cardBack}/></div><span className="printed">Stock · {p.stock}</span>
          </button>
          <button type="button" data-flat aria-label="Draw from discard pile" disabled={!canDraw||!p.discard} onClick={()=>{setDrawnFrom("discard");run(()=>p.onDraw("discard"));}}>
            <div className="gin-pile-card">{p.discard&&<ArenaFace key={cardId(p.discard)} rank={rankLabel(p.discard.rank)} suit={p.discard.suit}/>}</div><span className="printed">Discard</span>
          </button>
        </div>
        {/* The board narrates what just happened rather than labelling the
            phase, and carries a live dot while the turn is yours. */}
        <p className="gin-arena-status" role="status">
          {p.myTurn&&<i className="dot live" aria-hidden="true"/>}
          {p.myTurn
            ? p.phase==="draw"
              ? "Your turn. Draw from the stock or the discard."
              : drawnCard
                ? `You drew the ${rankLabel(drawnCard.rank)} of ${suitFromLetter(drawnCard.suit)}${drawnFrom?` from the ${drawnFrom}`:""}. Now discard.`
                : selectedCard
                  ? `${rankLabel(selectedCard.rank)} of ${suitFromLetter(selectedCard.suit)} selected${selectedWins?" — this one goes out":""}.`
                  : "Choose a card to discard."
            : `${p.opponent.name} to ${p.phase==="draw"?"draw":"discard"}`}
        </p>
      <div ref={handRef} className="gin-hand" role="group"
        aria-label="Your cards" onKeyDown={handleHandKeys}>
        {displayedHand.map((card,i)=>{
          const offset=i-(p.hand.length-1)/2;
          const id=cardId(card);
          const selected=!!p.selected && cardId(p.selected)===id;
          return <div key={id} data-card-id={id}
            className={"gin-fan-slot"+(selected?" is-selected":"")+(dragId===id?" is-dragging":"")}
            onPointerDown={event=>dragStart(event,id)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
            style={{"--angle":offset*2+"deg","--curve":offset*offset*.9+"px","--offset":offset*Math.min(80,850/Math.max(1,p.hand.length-1))+"px",zIndex:selected?30:i} as React.CSSProperties}>
            <button type="button" data-flat aria-label={`${rankLabel(card.rank)} of ${suitFromLetter(card.suit)}`} aria-pressed={selected}
              disabled={!p.myTurn||p.phase!=="discard"||busy} onClick={()=>activateCard(card)}>
              <ArenaFace rank={rankLabel(card.rank)} suit={card.suit}/>
              {drawnId===id&&<span className="gin-new-card">New</span>}
            </button>
          </div>;
        })}
      </div>
      {melds&&<div className="gin-arena-melds" aria-label="Meld breakdown">
        {brackets.map(bracket=>(
          <div className={"bracket"+(bracket.deadwood?" dw":"")} key={bracket.key} style={{left:bracket.left,width:bracket.width}}>
            <span>{bracket.label}</span>
          </div>
        ))}
      </div>}
    <footer className="gin-arena-controls">
      {/* The board carries the card count as a badge on the avatar and the
          state as a line under the name, the same shape as the rival frame. */}
      <div className={"gin-player gin-player-self"+(p.myTurn?" active":"")}><Avatar name={p.name} presetId={p.avatar} count={p.hand.length}/><div><strong>{p.name}</strong><small>{p.myTurn?(p.phase==="draw"?"Your turn":"Discard one"):"Discarded"}</small></div></div>
      <HandTools order={manual?"custom":order} custom={!!manual} melds rank
        onChange={value=>{if(value==="custom")return;setManual(null);setOrder(value);if(value==="melds")setMelds(true);}} />
      {/* The board's two: a ghost toggle for the brackets, and a discard
          button that says what the discard will do. With the turn spent it
          reads "Discarded" rather than offering an action there isn't. */}
      <div className="gin-actions">
        <Button variant="secondary" aria-pressed={melds} onClick={()=>setMelds(v=>!v)}><Layers size={18}/>View Melds</Button>
        <Button variant="primary" disabled={!canDiscard} loading={busy} onClick={()=>run(p.onDiscard)}>
          <ArrowDownToLine size={18}/>
          {p.myTurn?(selectedWins?"Discard & win":"Discard"):"Discarded"}
          {selectedCard&&selectedWins&&<Suit suit={selectedCard.suit} className="gin-discard-suit"/>}
        </Button>
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
      <header><h2 id="gin-dialog-title">{modal==="leave"?"Leave game?":modal==="rules"?"Gin Rummy rule book":"Game Settings"}</h2>
        <Button variant="ghost" aria-label="Close dialog" disabled={busy} onClick={()=>setModal(null)}><X size={20}/></Button></header>
      {modal==="rules"?<RuleBook game="gin"/>
        :modal==="settings"?<><SettingToggle icon={Music} label="Background Music" enabled={settings.music} onChange={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}/>{info}</>
        :<><p>{p.online?"Leaving forfeits this match.":"Your current hand will be lost."}</p>
          <footer><Button variant="secondary" disabled={busy} onClick={()=>setModal(null)}>Cancel</Button><Button variant="danger" loading={busy} onClick={()=>run(async()=>{await p.onLeave?.();router.push("/play");})}>Leave Game</Button></footer></>}
      {error&&<p role="alert">{error}</p>}
    </dialog>}
  </>;
}
