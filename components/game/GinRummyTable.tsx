"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X, Music } from "lucide-react";
import { Card, cardId, rankLabel, bestMeldArrangement, winningDiscard, findGinLayout, TURN_SECONDS, type GinHandResult } from "@/lib/ginRummyEngine";
import { suitFromLetter } from "./PlayingCard";
import { ArenaSeatData, TABLE_THEME_STYLES } from "./GameArena";
import { Button } from "@/components/ui/Button";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "@/hooks/useTranslation";
import { usePublishMatchGate } from "@/contexts/MatchGateContext";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { useSecondsLeft } from "@/components/layout/phone/TurnRing";
import { PhoneGinBoard, listed, type PhoneGinGroup, type PhoneGinOutcome } from "./phone/PhoneGinBoard";
import { sortHand } from "@/lib/cardSort";
import { HandOrder, navigateHand } from "./HandTools";
import { RuleBook } from "./RuleBook";
import { ArenaStage } from "./ArenaStage";
import { ArenaFace } from "./ArenaCard";
import { ArenaSprite, Suit, Icon } from "./ArenaSprite";
import { CardBack, CountBadge, OpeningCards, OpeningCut, OpeningSkip, OpeningSteps, openingPlate, openingWords, type OpeningDeal, type OpeningPiles } from "./MindiDealIntro";
import { GEO_DESKTOP } from "./dealGeometry";

/** How the boards name a card in a sentence: "the King of diamonds", not
 *  "the K of diamonds" (Gin.dc.html and PGin.dc.html, `WORD`). */
const WORDS:Record<string,string>={A:"Ace",K:"King",Q:"Queen",J:"Jack"};
const cardWord=(rank:number)=>WORDS[rankLabel(rank as Card["rank"])]??rankLabel(rank as Card["rank"]);

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
  /* The opening deal, while it plays on this table (MindiDealIntro.tsx),
     and until the first card is drawn - the table reads as the Cut board
     leaves it until then. Null once play has begun. */
  opening?:OpeningDeal|null;
  /* The hand is over. On a phone the table itself shows it (PGin's won
     state); the desktop shows GinResultScreen instead, so only the phone
     reads this. */
  outcome?:GinTableOutcome|null;
}

/** The end of a hand, as the game clients know it. */
export interface GinTableOutcome {
  youWon:boolean;
  result:GinHandResult;
  /** The losing hand, so its deadwood can be named. */
  loserHand:Card[];
  /** The opponent's hand, turned face up. */
  opponentHand:Card[];
  coins:number;
  balance:number;
  continueLabel:string;
  onContinue:()=>void;
}

/** Melds from the lowest card up, the order the Gin boards draw. */
const byLowest=(melds:Card[][])=>[...melds].sort((a,b)=>Math.min(...a.map(card=>card.rank))-Math.min(...b.map(card=>card.rank)));

export function GinRummyTable(p:Props) {
  const router=useRouter();
  const {settings,updateSettings}=useSettings();
  const t=useTranslation();
  const phone=usePhoneLayout();
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
  /* The cards the hand was dealt with rise in one after another (the board's
     handIn, 45 ms apart); a card drawn later rises at once rather than
     waiting its turn in that stagger. */
  const dealtIds=useRef(new Set(p.hand.map(cardId)));
  /* Stable, because the gate keeps whatever it was last given: a new closure
     on every render would have it republishing for no reason. */
  const askToLeave=useCallback(()=>setModal("leave"),[]);
  const [drawnId,setDrawnId]=useState<string|null>(null);
  // Which pile the card came from, so the status line can say so the way the
  // board does ("You drew the 3 of spades from the stock").
  const [drawnFrom,setDrawnFrom]=useState<"stock"|"discard"|null>(null);
  /** Nobody has moved yet: the table is as the opening deal left it. */
  const firstTurn=!!p.opening;

  const arrangement=useMemo(()=>bestMeldArrangement(p.hand),[p.hand]);
  const selectedCard=p.hand.find(card=>p.selected&&cardId(card)===cardId(p.selected));
  const preview=useMemo(()=>selectedCard&&p.phase==="discard"&&p.myTurn ? bestMeldArrangement(p.hand.filter(card=>cardId(card)!==cardId(selectedCard))) : null,[p.hand,p.phase,p.myTurn,selectedCard]);
  // Whether ANY discard would go out, and whether the selected one does. The
  // table can work this out itself - it already holds the player's cards.
  const goingOut=useMemo(()=>winningDiscard(p.hand),[p.hand]);
  const selectedWins=useMemo(()=>!!selectedCard&&!!findGinLayout(p.hand.filter(card=>cardId(card)!==cardId(selectedCard))),[p.hand,selectedCard]);

  const displayedHand=useMemo(()=>{
    // Melds from the lowest card up, then the deadwood - the order both Gin
    // boards draw (A-2-3, 5-6-7-8, the Queens, the King), rather than the
    // order the arrangement happens to find them in.
    const base=order==="melds"
      ? [...[...arrangement.melds].sort((a,b)=>Math.min(...a.map(card=>card.rank))-Math.min(...b.map(card=>card.rank))).flatMap(meld=>sortHand(meld)),...sortHand(arrangement.deadwood)]
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
   * PGin's brackets over the hand. The same consecutive runs the desktop
   * brackets are built from, but labelled the way the phone board labels
   * them - "Run 3", "Set 4", "DW 10" - because at 844px wide there is no
   * room for "Deadwood 10" over three cards.
   */
  const phoneGroups=useMemo<PhoneGinGroup[]>(()=>{
    const meldOf=new Map<string,number>();
    arrangement.melds.forEach((meld,index)=>meld.forEach(card=>meldOf.set(cardId(card),index)));
    const runs:{ids:string[];meld:number}[]=[];
    displayedHand.forEach(card=>{
      const id=cardId(card);
      const meld=meldOf.get(id)??-1;
      const last=runs[runs.length-1];
      if(last&&last.meld===meld) last.ids.push(id);
      else runs.push({ids:[id],meld});
    });
    return runs.map(run=>{
      const meld=run.meld>=0?arrangement.melds[run.meld]:null;
      if(!meld) return {ids:run.ids,label:`DW ${arrangement.deadwoodValue}`,deadwood:true};
      const kind=meld.every(card=>card.rank===meld[0].rank)?"Set":"Run";
      return {ids:run.ids,label:`${kind} ${run.ids.length}`,deadwood:false};
    });
  },[displayedHand,arrangement]);

  /**
   * What the left-hand panel says. The board names the card that wins -
   * "Throw the King of diamonds and all ten cards are melded. That is Gin."
   * - rather than saying a winning discard exists, and it prints the melds
   * the hand actually holds rather than the 4 / 3 / 3 it is aiming at.
   */
  const outCard=goingOut;
  // Largest first, as the boards print it: "4 · 3 · 3".
  const meldSizes=arrangement.melds.map(meld=>meld.length).sort((a,b)=>b-a);
  const readLine=outCard
    ? `Throw the ${cardWord(outCard.rank)} of ${suitFromLetter(outCard.suit)} and all ten cards are melded. That is Gin.`
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

  /* The phone bar draws the countdown itself rather than mounting TurnClock,
     because PGin's ring is its own 34px shape. Same absolute deadline, so the
     two can never disagree. */
  const secondsLeft=useSecondsLeft(p.deadline);

  useEffect(()=>{if(modal)dialog.current?.showModal();},[modal]);
  // The arrangement belongs to the cards that were in the hand when it was
  // made; a fresh deal is a different set entirely.
  useEffect(()=>{if(p.hand.length===0)setManual(null);},[p.hand.length]);
  // Before paint, so the frame after a draw already says "You drew…" and
  // tags the card New, rather than flashing "Choose a card to discard.".
  useLayoutEffect(()=>{
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
      const id=(event.target as HTMLElement).closest<HTMLElement>(".hc")?.dataset.cardId;
      if(!id)return;
      event.preventDefault();
      const from=displayedHand.findIndex(card=>cardId(card)===id);
      reorder(from,from+(event.key==="ArrowRight"?1:-1));
      requestAnimationFrame(()=>handRef.current?.querySelector<HTMLButtonElement>(`button[data-card-id="${id}"]`)?.focus({preventScroll:true}));
      return;
    }
    navigateHand(event);
  }

  function dragStart(event:React.PointerEvent<HTMLElement>,id:string) {
    if(!p.myTurn||p.phase!=="discard"||busy||(event.pointerType==="mouse"&&event.button!==0))return;
    suppressClick.current=false;
    drag.current={id,x:event.clientX,active:false};
  }
  function dragMove(event:React.PointerEvent<HTMLElement>) {
    const state=drag.current;
    if(!state)return;
    // Past a threshold only, so a tap - and therefore double-tap-to-discard -
    // is never swallowed by the reorder gesture.
    if(!state.active) {
      if(Math.abs(event.clientX-state.x)<10)return;
      state.active=true;setDragId(state.id);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    const slots=Array.from(handRef.current?.querySelectorAll<HTMLElement>(".hc")??[]);
    let nearest=-1,best=Infinity;
    slots.forEach((slot,i)=>{
      const rect=slot.getBoundingClientRect();
      const distance=Math.abs(event.clientX-(rect.left+rect.width/2));
      if(distance<best){best=distance;nearest=i;}
    });
    reorder(displayedHand.findIndex(card=>cardId(card)===state.id),nearest);
  }
  function dragEnd(event:React.PointerEvent<HTMLElement>) {
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

  /* PGin prints one short line mid-table and one on the button, both of
     which say what THIS tap would do - the board's own words, because at
     844px wide `.hint` is nowrap and the desktop panel's full sentences do
     not fit. The preview arrangement is the same one the desktop brackets
     are drawn from, so the two never disagree about what a discard leaves. */
  const phoneStatus=!p.myTurn
    ? firstTurn?t("deal_leadsFirstTrick").replace("{name}",p.opponent.name):`${p.opponent.name} to ${p.phase==="draw"?"draw":"discard"}`
    : p.phase==="draw"
      ? firstTurn&&p.discard?t("table_ginTakeOrDraw").replace("{rank}",rankLabel(p.discard.rank)):"Draw from the stock, or take the discard."
      : selectedCard
        ? selectedWins
          ? `Throw the ${cardWord(selectedCard.rank)} of ${suitFromLetter(selectedCard.suit)}: that is Gin.`
          : `Leaves ${preview&&preview.melds.length?preview.melds.map(meld=>meld.length).sort((a,b)=>b-a).join(" · "):"nothing"} and ${preview?preview.deadwoodValue:arrangement.deadwoodValue} deadwood. Tap again to throw.`
        : drawnCard
          ? `You drew the ${cardWord(drawnCard.rank)} of ${suitFromLetter(drawnCard.suit)}. Now discard.`
          : "Pick a discard.";
  const phoneAction=!p.myTurn
    ? firstTurn?t("table_wait"):"Discarded"
    : p.phase==="draw"?t("table_drawFirst")
    : selectedCard
      ? selectedWins ? "Discard & win" : `Discard ${rankLabel(selectedCard.rank)}`
      : "Pick a card";

  /* Rules, settings and the leave confirm. Declared once and rendered by
     both compositions: it is a <dialog> in the top layer, so it sits over
     whichever table is underneath and the phone needs no second copy of the
     leave flow. */
  const dialogs = <>
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

  /* The won state's numbers, all from the result: what the winner melded,
     the 25 for going out plus the loser's deadwood, and which cards that
     deadwood was ("Hussain's J, 10 and 2"). */
  const phoneOutcome=useMemo<PhoneGinOutcome|null>(()=>{
    const o=p.outcome;
    if(!o) return null;
    const loser=bestMeldArrangement(o.loserHand);
    const cards=listed(sortHand(loser.deadwood,"rank").reverse().map(card=>rankLabel(card.rank)),t("lgin_and"));
    const opponent=bestMeldArrangement(o.opponentHand);
    const reveal=o.youWon
      ? [...byLowest(opponent.melds).map(meld=>({cards:sortHand(meld),dead:false})),...(opponent.deadwood.length?[{cards:sortHand(opponent.deadwood,"rank").reverse(),dead:true}]:[])]
      : byLowest(o.result.layout).map(meld=>({cards:sortHand(meld),dead:false}));
    return {
      youWon:o.youWon,
      sizes:o.result.layout.map(meld=>meld.length).sort((a,b)=>b-a),
      score:o.result.score,
      goingOut:o.result.score-o.result.loserDeadwood,
      loserDeadwood:o.result.loserDeadwood,
      loserCards:o.youWon?t("lgin_theirCards").replace("{name}",p.opponent.name).replace("{cards}",cards):t("lgin_yourCards").replace("{cards}",cards),
      coins:o.coins,balance:o.balance,reveal,
      continueLabel:o.continueLabel,onContinue:o.onContinue,
    };
  },[p.outcome,p.opponent.name,t]);

  /* Sideways on a phone the table is PGin, an 844x390 composition of its own
     - see components/game/phone/PhoneGinBoard.tsx. Everything above this line
     is shared: the same hand order, the same melds, the same clock, the same
     legal actions. Only the picture below differs. */
  if (phone) return <>
    <PhoneGinBoard
      hand={displayedHand} groups={phoneGroups} selected={selectedCard??null}
      phase={p.phase} myTurn={p.myTurn} name={p.name} opponent={p.opponent}
      stock={p.stock} discard={p.discard}
      secondsLeft={secondsLeft} turnSeconds={TURN_SECONDS}
      reading={meldSizes.length
        ?{title:outCard?"Ready":"Not out",big:meldSizes.join(" · "),ready:!!outCard}
        :{title:t("table_yourHand"),big:t("table_noMeldsYet"),ready:false,fresh:true}}
      deadwoodValue={arrangement.deadwoodValue}
      hint={phoneStatus} error={modal ? undefined : error} actionLabel={phoneAction} drawnId={drawnId} busy={busy} selectedWins={selectedWins}
      onDraw={source=>{if(canDraw)run(()=>p.onDraw(source));}}
      onActivate={activateCard}
      onDiscard={()=>{if(canDiscard)run(p.onDiscard);}}
      onLeave={askToLeave} onMenu={()=>setModal("settings")}
      opening={p.opening??null} firstTurn={firstTurn} outcome={phoneOutcome}
    />
    {dialogs}
  </>;

  /* ── The desktop table: design/arena/boards/Gin.dc.html ─────────────────
     The board's CSS 3D table (styles/arena-gin-board.css), with the stock
     and the discard lying on its felt, the opponent's fan over their plate,
     the two HUD panels, the pill at y 600, the hand in its meld groups with
     the brackets under it, and View melds / Discard in the corner. The
     opening deal (MindiDealIntro) plays on this same table first. */
  const opening=p.opening??null;
  const ceremony=!!opening&&opening.step<4;
  const words=opening&&ceremony?openingWords(opening,t):null;
  const selfPlate=opening&&ceremony?openingPlate(opening,"S",t):null;
  const oppPlate=opening&&ceremony?openingPlate(opening,"N",t):null;
  const handShown=!opening||opening.step===4;
  const pilesShown=!opening||opening.settled;
  const handOver:React.CSSProperties|undefined=opening?{animation:"fade .4s ease-out both"}:undefined;
  const rootClass=["ar",opening?.frozen?"frozen":"",opening?.reduced?"deal-reduced":""].filter(Boolean).join(" ");
  const felt=!p.tableSkin||p.tableSkin==="tt_default"?"#0A2429":(TABLE_THEME_STYLES[p.tableSkin]??TABLE_THEME_STYLES.tt_default).base;
  const rivalBacks=Math.min(Math.max(p.opponent.cardCount,0),10);
  const noMelds=arrangement.melds.length===0;
  const clockOff=secondsLeft===null?194.8:194.8*(1-Math.max(0,Math.min(1,secondsLeft/TURN_SECONDS)));

  /* The board lays the hand out group by group, a wider gap between groups
     (step 58, gap 34, cards 108 wide, centred on 720), in a shallow arc. */
  const handLayout=(()=>{
    const step=58,gap=34,w=108;
    const at=new Map<string,{x:number;k:number}>();
    const spans:{a:number;b:number;group:PhoneGinGroup}[]=[];
    let x=-step-gap,k=0;
    for(const group of phoneGroups){
      x+=gap;
      const a=x+step;
      for(const id of group.ids){x+=step;at.set(id,{x,k:k++});}
      spans.push({a,b:x+w,group});
    }
    const total=x+w,left0=720-total/2;
    return {at,left0,count:k,brackets:spans.map((span,i)=>({
      key:`${i}-${span.group.ids[0]}`,left:Math.round(left0+span.a+6),width:Math.round(span.b-span.a-12),
      deadwood:span.group.deadwood,label:desktopGroupLabel(span.group,arrangement.deadwoodValue),
    }))};
  })();

  /* The board's button words: what the tap would do, or why it can't. */
  const discardLabel=!p.myTurn
    ? firstTurn?t("table_waitFor").replace("{name}",p.opponent.name):"Discarded"
    : p.phase==="draw"?t("table_drawFirst")
    : selectedCard?(selectedWins?"Discard & win":`Discard ${rankLabel(selectedCard.rank)}`):t("table_pickACard");

  return <>
    <ArenaStage className="arena-gin-board arena-deal">
      <div className={rootClass} style={{position:"relative",width:1440,height:900,overflow:"hidden",background:"#000"}}>
        <ArenaSprite/>
        <div className="bg"/>
        <div className="bigword" aria-hidden="true">GIN</div>
        <div className="beam" style={{left:60,transform:"rotate(-16deg)"}}/>
        <div className="beam" style={{left:860,transform:"rotate(16deg)"}}/>

        <div className="stage" aria-hidden="true">
          <div className="floor"/>
          <div className="table">
            {APRONS.map(([z,colour])=><div key={z} className="apron" style={{transform:`translateZ(${z}px)`,background:colour}}/>)}
            <div className="felt gin" style={{backgroundColor:felt}} data-skin={p.tableSkin??"tt_default"}/>
            <div className="spot" style={{left:430,top:286}}/>
            <div className="spot" style={{left:646,top:286}}/>
            <div className="printed" style={{left:392,top:470}}>Stock · {p.stock}</div>
            <div className="printed" style={{left:608,top:470}}>Discard</div>
            <div className="rail"/>
            <svg className="leds" viewBox="0 0 1200 740">
              <defs><filter id="gin-glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter></defs>
              <ellipse cx="600" cy="370" rx="591" ry="361" fill="none" stroke="#FFFFFF" strokeOpacity=".16" strokeWidth="1.5"/>
              <ellipse cx="600" cy="370" rx="565" ry="335" fill="none" stroke="#C6FF33" strokeOpacity=".6" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 22" className="chase"/>
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#00BCC8" strokeWidth="9" strokeOpacity=".8" filter="url(#gin-glow)"/>
              <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#9FF2F7" strokeWidth="3"/>
            </svg>
            {pilesShown&&STOCK_LAYERS.slice(0,Math.max(0,Math.min(STOCK_LAYERS.length,p.stock-1))).map(z=>
              <div key={z} className="layer" style={{left:438,top:294,transform:`translateZ(${z}px)`}}/>)}
            {pilesShown&&p.discard&&<>
              <div className="tc" style={{left:654,top:294,["--z" as string]:"-4.2px",["--rot" as string]:"-9deg"}}><div className="blank"/></div>
              <div className="tc" style={{left:654,top:294,["--z" as string]:"-3.6px",["--rot" as string]:"6deg"}}><div className="blank"/></div>
            </>}
            {opening&&!opening.settled&&<OpeningCards deal={opening} geo={GEO_DESKTOP} variant="desktop" piles={GIN_PILES}/>}
          </div>
        </div>

        {/* The two piles are how you draw, so they sit on the same table in a
            second stage that is not hidden from assistive tech, with
            pointer-events only on the piles themselves. */}
        <div className="stage" style={{pointerEvents:"none"}}>
          <div className="table">
            {pilesShown&&p.stock>0&&<button type="button" className="tc" data-flat
              style={{left:438,top:294,["--z" as string]:"7.6px",["--rot" as string]:"0deg",padding:0,border:0,background:"none",cursor:canDraw?"pointer":"default",pointerEvents:"auto"}}
              aria-label={"Draw from stock, "+p.stock+" cards"} disabled={!canDraw} onClick={()=>{setDrawnFrom("stock");run(()=>p.onDraw("stock"));}}>
              <CardBack id={p.cardBack}/>
            </button>}
            {pilesShown&&p.discard&&<button type="button" className="tc" data-flat
              style={{left:654,top:294,["--z" as string]:"-3px",["--rot" as string]:"-2deg",padding:0,border:0,background:"none",cursor:canDraw?"pointer":"default",pointerEvents:"auto"}}
              aria-label={`Draw from discard pile, the ${rankLabel(p.discard.rank)} of ${suitFromLetter(p.discard.suit)}`} disabled={!canDraw}
              onClick={()=>{setDrawnFrom("discard");run(()=>p.onDraw("discard"));}}>
              <ArenaFace key={cardId(p.discard)} rank={rankLabel(p.discard.rank)} suit={p.discard.suit}/>
            </button>}
          </div>
        </div>

        {[[230,640,0],[1180,600,1.4],[1050,720,2.8],[330,760,4.1],[150,560,3.4]].map(([x,y,d],i)=>
          <i key={i} className={"mote"+(i%2?" v":"")} style={{left:x,top:y,animationDelay:`${d}s`}}/>)}

        <div className={"fan"+(ceremony?" off":"")} style={{left:720,top:178}} aria-hidden="true">
          {Array.from({length:rivalBacks},(_,i)=>(i-(rivalBacks-1)/2)*5).map((a,i)=>
            <div key={i} className="fb" style={{["--a" as string]:`${a}deg`}}><CardBack id={p.opponent.cardBackId}/></div>)}
        </div>
        <div className={"pf"+(oppPlate?.first?" first":!ceremony&&!p.myTurn?" turn":"")} style={{left:720,top:176,transform:"translateX(-50%)"}}>
          <div className="av them">{p.opponent.name.slice(0,1).toUpperCase()}
            {oppPlate?<CountBadge count={oppPlate.count} shown={oppPlate.countShown}/>:<span className="ct">{p.opponent.cardCount}</span>}</div>
          <div className="nm"><b>{p.opponent.name}{oppPlate?.dealer&&<span className="dtag">{t("deal_dealer")}</span>}</b>
            <span><i className={"dot them"+(!ceremony&&!p.myTurn?" live":"")}/>
              {oppPlate?<>{oppPlate.line}{oppPlate.suit&&<Suit suit={oppPlate.suit} className={oppPlate.red?"red":undefined}/>}</>
                :firstTurn?(p.myTurn?t("mindi_opponent"):t("deal_leads"))
                :p.myTurn?"Waiting":p.phase==="draw"?"Drawing":"Discarding"}</span></div>
        </div>

        <header style={{position:"absolute",left:36,right:36,top:26,height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:18}}>
            <button type="button" className="ibtn" aria-label="Leave game" onClick={()=>setModal("leave")}><Icon name="i-back"/></button>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              <div style={{display:"flex",alignItems:"baseline",gap:12}}>
                <h1 className="disp chrome" style={{margin:0,fontSize:36}}>Gin Rummy</h1>
                <span className="thaana" lang="dv" dir="rtl" style={{fontSize:17}}>ޖިން ރަމީ</span>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                {/weekend/i.test(p.mode)?<span className="chip live"><i/>{p.mode}</span>:<span className="chip blue">{p.mode}</span>}
                <span className="lbl">{ceremony?t("deal_openingDeal"):"Melds of 4, 3 and 3 win · No knocking"}</span>
              </div>
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <button type="button" className="ibtn" aria-label={settings.music?"Mute sound":"Enable sound"} aria-pressed={settings.music}
              onClick={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}><Icon name="i-sound"/></button>
            <button type="button" className="ibtn" aria-label="Rule book" onClick={()=>setModal("rules")}><Icon name="i-book"/></button>
            <button type="button" className="ibtn" aria-label="Game settings" onClick={()=>setModal("settings")}><Icon name="i-sliders"/></button>
          </div>
        </header>

        {(()=>{
          /* The board's left panel. Before the hand holds a meld it is the Cut
             board's "Your hand · No melds yet"; after, the Gin board's
             reading: the melds held, the deadwood, and one line of why. */
          const reading=noMelds
            ? <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><span className="lbl dash" style={{color:"#fff"}}>{t("table_yourHand")}</span><span className="lbl">Deadwood</span></div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                  <span className="disp" style={{fontSize:27,letterSpacing:"-.01em",whiteSpace:"nowrap"}}>{t("table_noMeldsYet")}</span>
                  <span className="num" style={{fontSize:34,lineHeight:1}}>{preview?.deadwoodValue??arrangement.deadwoodValue}</span>
                </div>
                <p className="muted" style={{margin:0,lineHeight:1.45}}>{t("table_ginStartLine")}</p>
              </div>
            : <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><span className="lbl dash" style={{color:"#fff"}}>{outCard?"Ready":"Not out"}</span><span className="lbl">Deadwood</span></div>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12}}>
                  <span className="disp" style={{fontSize:40,letterSpacing:"-.01em",color:outCard?"#C6FF33":"#FFFFFF"}}>{meldSizes.join(" · ")}</span>
                  <span className="num" style={{fontSize:34,lineHeight:1}}>{preview?.deadwoodValue??arrangement.deadwoodValue}</span>
                </div>
                <p className="muted" style={{margin:0,lineHeight:1.45,textWrap:"pretty"} as React.CSSProperties}>{readLine}</p>
              </div>;
          if(!opening) return <section className="hud" aria-label="Your melds" style={{left:36,top:106,width:320,padding:"16px 20px 18px"}}>{reading}</section>;
          return <section className="hud swap" aria-label={ceremony?t("deal_openingDeal"):"Your melds"}
            style={{left:36,top:106,width:320,padding:"16px 20px 18px",["--pt" as string]:"16px",["--pl" as string]:"20px",["--pr" as string]:"20px"}}>
            <OpeningSteps deal={opening} className={ceremony?undefined:"out"}/>
            <div className={ceremony?"out":undefined}>{reading}</div>
          </section>;
        })()}

        {(()=>{
          const turn=<div style={{display:"flex",alignItems:"center",gap:18}}>
            <div className="clock">
              <svg viewBox="0 0 72 72" aria-hidden="true"><circle cx="36" cy="36" r="31" fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="5"/>
                <circle className="arc" cx="36" cy="36" r="31" fill="none" stroke="#C6FF33" strokeWidth="5" strokeLinecap="round" strokeDasharray="194.8"
                  strokeDashoffset={p.myTurn&&firstTurn&&secondsLeft===null?0:clockOff} data-ar-loop/></svg>
              <b>{secondsLeft!==null?secondsLeft:p.myTurn&&firstTurn?TURN_SECONDS:"–"}</b>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:7}}>
              <span className="lbl dash">{p.myTurn?"Your turn":p.opponent.name}</span>
              <span className="disp" style={{fontSize:23,whiteSpace:"nowrap"}}>{busy?"Working...":p.myTurn?(p.phase==="draw"?"Draw a card":"Discard a card"):(p.phase==="draw"?"Drawing":"Discarding")}</span>
              <span className="muted">{TURN_SECONDS} seconds a turn</span>
            </div>
          </div>;
          if(!opening) return <section className="hud" aria-label="Turn" style={{right:36,top:106,width:320,padding:"16px 20px"}}>{turn}</section>;
          return <section className="hud swap" aria-label={ceremony?t("deal_theCut"):"Turn"}
            style={{right:36,top:106,width:320,height:ceremony?140:116,padding:"16px 16px 16px 20px",["--pt" as string]:"16px",["--pl" as string]:"20px",["--pr" as string]:"16px"}}>
            <OpeningCut deal={opening} className={ceremony?undefined:"out"}/>
            <div className={ceremony?"out":undefined}>{turn}</div>
          </section>;
        })()}

        {/* The board narrates what just happened rather than labelling the
            phase, and carries a live dot while the turn is yours. */}
        <div className="status" role="status" style={{left:720,top:600}}>
          {words?<><i className="dot them"/>{words.status}</>:<>
          {p.myTurn&&<i className="dot live" aria-hidden="true"/>}
          {p.myTurn
            ? p.phase==="draw"
              ? firstTurn&&p.discard?t("table_ginTakeOrDraw").replace("{rank}",rankLabel(p.discard.rank)):"Your turn. Draw from the stock or the discard."
              : drawnCard
                ? `You drew the ${cardWord(drawnCard.rank)} of ${suitFromLetter(drawnCard.suit)}${drawnFrom?` from the ${drawnFrom}`:""}. Now discard.`
                : selectedCard
                  ? `${cardWord(selectedCard.rank)} of ${suitFromLetter(selectedCard.suit)} selected${selectedWins?" — this one goes out":""}.`
                  : "Choose a card to discard."
            : firstTurn?t("deal_leadsFirstTrick").replace("{name}",p.opponent.name)
            : `${p.opponent.name} to ${p.phase==="draw"?"draw":"discard"}`}</>}
        </div>

        <section ref={handRef} className="hand" aria-label="Your cards" onKeyDown={handleHandKeys}>
          {handShown&&displayedHand.map((card,i)=>{
            const id=cardId(card);
            const slot=handLayout.at.get(id);
            if(!slot) return null;
            const offset=slot.k-(handLayout.count-1)/2;
            const selected=!!p.selected&&cardId(p.selected)===id;
            const off=!p.myTurn||p.phase!=="discard"||busy;
            return <button key={id} type="button" data-card-id={id} data-flat
              className={"hc"+(selected||dragId===id?" sel":"")+(off?" wait":"")}
              style={{["--x" as string]:`${Math.round(handLayout.left0+slot.x)}px`,["--y" as string]:`${Math.round(676+offset*offset*1.1)}px`,
                ["--r" as string]:`${+(offset*1.2).toFixed(2)}deg`,["--i" as string]:dealtIds.current.has(id)?i:0,zIndex:10+slot.k}}
              aria-label={`${rankLabel(card.rank)} of ${suitFromLetter(card.suit)}`} aria-pressed={selected} disabled={off}
              onPointerDown={event=>dragStart(event,id)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
              onClick={()=>activateCard(card)}>
              {drawnId===id&&<span className="newtag">New</span>}
              <ArenaFace rank={rankLabel(card.rank)} suit={card.suit}/>
            </button>;
          })}
        </section>
        {melds&&handShown&&<>
          {handLayout.brackets.map(bracket=>(
            <div className={"bracket"+(bracket.deadwood?" dw":"")} key={bracket.key} style={{left:bracket.left,width:bracket.width}}>
              <span>{bracket.label}</span>
            </div>
          ))}
        </>}

        <div className={"pf"+(selfPlate?.first?" first":!ceremony&&p.myTurn?" turn":"")} style={{left:36,top:800}}>
          <div className="av">{p.name.slice(0,1).toUpperCase()}
            {selfPlate?<CountBadge count={selfPlate.count} shown={selfPlate.countShown}/>:<span className="ct">{p.hand.length}</span>}</div>
          <div className="nm"><b>{p.name}{selfPlate?.dealer&&<span className="dtag">{t("deal_dealer")}</span>}</b>
            <span><i className={"dot"+(!ceremony&&p.myTurn?" live":"")}/>
              {selfPlate?<>{selfPlate.line}{selfPlate.suit&&<Suit suit={selfPlate.suit} className={selfPlate.red?"red":undefined}/>}</>
                :p.myTurn?(p.phase==="draw"?"Your turn":"Discard one"):"Waiting"}</span></div>
        </div>

        {ceremony&&opening
          ? <div style={{position:"absolute",right:36,top:806}}><OpeningSkip deal={opening}/></div>
          : <>
            <div style={{position:"absolute",right:36,top:722,display:"flex",alignItems:"center",gap:14,...handOver}}>
              <div className="seg" role="group" aria-label="Sort hand">
                <button type="button" aria-pressed={!manual&&order==="melds"} onClick={()=>{setManual(null);setOrder("melds");setMelds(true);}}>Melds</button>
                <button type="button" aria-pressed={!manual&&order==="rank"} onClick={()=>{setManual(null);setOrder("rank");}}>Rank</button>
              </div>
              <button type="button" className="btn ghost sm" aria-pressed={melds} onClick={()=>setMelds(v=>!v)}><Icon name="i-layers"/>View melds</button>
            </div>
            <div style={{position:"absolute",right:36,top:806,...handOver}}>
              <button type="button" className={"btn"+(selectedWins&&canDiscard?" go":"")} style={{width:250}} disabled={!canDiscard} onClick={()=>run(p.onDiscard)}>
                <Icon name="i-discard"/>{discardLabel}
                {selectedCard&&!selectedWins&&p.myTurn&&p.phase==="discard"&&<Suit suit={selectedCard.suit} style={{width:17,height:17}}/>}
              </button>
            </div>
          </>}

        {/* Under these rules a hand has no fixed end: if the cards each player
            still needs are in the other's hand, it can never finish. Rather
            than ending it, say so, so a long hand does not look like a bug. */}
        {(p.reshuffles??0)>=8&&<p className="gin-stalemate" role="status" style={{position:"absolute",right:36,top:664,margin:0,maxWidth:250}}>
          The deck has been recycled {p.reshuffles} times — neither hand may be completable. You can keep playing or exit.
        </p>}
        {error&&<p className="gin-arena-error" role="alert">{error}</p>}
      </div>
    </ArenaStage>
    {dialogs}
  </>;
}

/** The board's aprons: the stacked rim under the table, front to back. */
const APRONS: [number,string][] = [
  [-50,"#030305"],[-46,"#050508"],[-42,"#07070B"],[-38,"#09090E"],[-34,"#0B0B11"],
  [-30,"#0D0D14"],[-26,"#100F18"],[-22,"#13121C"],[-18,"#16151F"],[-14,"#1A1924"],
  [-11,"#063A40"],[-9,"#00BCC8"],[-7,"#1E1D28"],
];

/** The stock's thickness under its top card, as the board stacks it. */
const STOCK_LAYERS=[-4.4,-3.2,-2,-.8,.4,1.6,2.8,4,5.2,6.4];

/**
 * Where the board's two piles lie (a 108x151 `.tc` at 438,294 and 654,294),
 * so the opening deal's stock and upcard land exactly on them: the stock
 * square, the discard's top card turned 2 degrees. The deal's cards are
 * 96x134, hence the scale.
 */
const GIN_PILES: OpeningPiles = {
  stock: { x: 492, y: 369.5, rz: 0, s: 1.125 },
  upcard: { x: 708, y: 369.5, rz: -2, s: 1.125 },
};

/** "Run of 3", "Set of 4", "Deadwood 10" - the board's bracket labels. */
function desktopGroupLabel(group:PhoneGinGroup,deadwood:number):string {
  if(group.deadwood) return `Deadwood ${deadwood}`;
  const [kind]=group.label.split(" ");
  return `${kind} of ${group.ids.length}`;
}
