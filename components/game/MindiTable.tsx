"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card, Suit, SeatIndex, Team, TrickPlay, CompletedTrick, TenCapture,
  cardId, rankLabel, resolveTrick, trumpAfterTrick, teamOf, isTen,
} from "@/lib/mindiEngine";
import { ArenaSeatData } from "./GameArena";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { useSettings } from "@/contexts/SettingsContext";
import { useTranslation } from "@/hooks/useTranslation";
import { usePublishMatchGate } from "@/contexts/MatchGateContext";
import { sortHand, HandSort } from "@/lib/cardSort";
import { navigateHand } from "./HandTools";
import { RuleBook } from "./RuleBook";
import { ArenaStage } from "./ArenaStage";
import { ArenaSprite, Suit as SuitGlyph, Icon } from "./ArenaSprite";
import { ArenaFace, ArenaBack } from "./ArenaCard";
import { Music } from "lucide-react";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { PhoneMindiBoard } from "./phone/PhoneMindiBoard";
import { CountBadge, OpeningCards, OpeningCut, OpeningSkip, OpeningSteps, openingPlate, openingWords, type OpeningDeal } from "./MindiDealIntro";
import { GEO_DESKTOP, type Spot } from "./dealGeometry";

/**
 * The Mindi table, built to design/arena/boards/Main.dc.html.
 *
 * This is an ARTBOARD, not a responsive layout: the board fixes every
 * position on a 1440x900 canvas, and ArenaStage scales the whole canvas to
 * fit. That is what keeps it matching the design at every size rather than
 * reflowing into something else. The CSS is the board's own, ported by
 * scripts/port-board.mjs into styles/arena-mindi.css.
 *
 * The table, felt, rail and LED ring are CSS 3D, as on the board. The WebGL
 * table (mindiTableRenderer.ts) is left in the tree unused rather than
 * deleted, so it can be brought back.
 *
 * Interactions carried over unchanged: tap to pick and tap again to play,
 * drag or Alt+Arrow to rearrange, sort, the rule book, last trick, and the
 * leave confirmation.
 */

interface Props {
  hand:Card[]; legal:Card[]; viewer:SeatIndex; top:ArenaSeatData; left?:ArenaSeatData|null; right?:ArenaSeatData|null;
  // Trump is null until somebody cannot follow the led suit; see lib/mindiEngine.ts.
  name:string; avatar?:string; active:boolean; trump:Suit|null; trick:TrickPlay[];
  tens:Record<Team,number>; tricks:Record<Team,number>; mode:string; tableSkin?:string; online?:boolean;
  onPlay:(card:Card)=>void|Promise<void>; onLeave?:()=>void|Promise<void>;
  lastTrick?:CompletedTrick|null;
  /* Every Ten taken so far, in order. The desktop board's rack only has room
     for a count, but PMindi draws each Ten's own suit, so the phone
     composition needs the list rather than the total. Optional because a
     client that does not track it still gets a working table - the rack just
     shows nothing rather than four spades that were never taken. */
  tenCaptures?:TenCapture[];
  /* The opening deal, while it plays on this table (components/game/
     MindiDealIntro.tsx). The table renders from the first frame; until the
     deal is over its panels, pill, plates and action slot carry the
     ceremony, and the hand comes up when it ends. Null once play begins. */
  opening?:OpeningDeal|null;
}

/** Felt colours, keyed by the table-theme cosmetic (data/cosmetics.ts). */
const FELT: Record<string,string> = {
  tt_default: "#06323A",   // Neon Arena
  tt_red: "#4A1119",       // Crimson Velvet
  tt_blue: "#0E2C4E",      // Sapphire Blue
  tt_black: "#101214",     // Midnight Black
};

/** The board's aprons: the stacked rim under the table, front to back. */
const APRONS: [number,string][] = [
  [-50,"#030305"],[-46,"#050508"],[-42,"#07070B"],[-38,"#09090E"],[-34,"#0B0B11"],
  [-30,"#0D0D14"],[-26,"#100F18"],[-22,"#13121C"],[-18,"#16151F"],[-14,"#1A1924"],
  [-11,"#063A40"],[-9,"#00BCC8"],[-7,"#1E1D28"],
];

/** Where a played card sits on the felt, by seat relative to the viewer. */
const TRICK_SPOT = [
  { x: 546, y: 470, rot: 2 },    // you, nearest the bottom
  { x: 392, y: 330, rot: -7 },   // left
  { x: 546, y: 212, rot: -2 },   // across
  { x: 700, y: 330, rot: 7 },    // right
];

export function MindiTable(p:Props) {
  const router=useRouter();
  const phone=usePhoneLayout();
  const {settings,updateSettings}=useSettings();
  const t=useTranslation();
  const [selected,setSelected]=useState<string|null>(null);
  const [modal,setModal]=useState<"rules"|"settings"|"leave"|"info"|null>(null);
  const [lastOpen,setLastOpen]=useState(false);
  const [order,setOrder]=useState<HandSort>("suit");
  const [manual,setManual]=useState<string[]|null>(null);
  const [dragId,setDragId]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const handRef=useRef<HTMLDivElement>(null);
  const drag=useRef<{id:string;x:number;active:boolean}|null>(null);
  const suppressClick=useRef(false);
  const lastTap=useRef<{id:string;at:number}|null>(null);
  const pending=useRef(false);
  const dialog=useRef<HTMLDialogElement>(null);
  /* Stable, because the gate keeps whatever it was last given: a new closure
     on every render would have it republishing for no reason. */
  const askToLeave=useCallback(()=>setModal("leave"),[]);

  const duel=!p.left&&!p.right;
  const team=teamOf(p.viewer), other=team==="A"?"B":"A";
  const legal=useMemo(()=>new Set(p.legal.map(cardId)),[p.legal]);

  const displayedHand=useMemo(()=>{
    const sorted=sortHand(p.hand,order);
    if(!manual) return sorted;
    const byId=new Map(p.hand.map(card=>[cardId(card),card]));
    const kept=manual.map(id=>byId.get(id)).filter((card):card is Card=>!!card);
    const keptIds=new Set(kept.map(cardId));
    // A card the manual list does not mention joins at the end rather than
    // disappearing from the hand.
    return [...kept,...sorted.filter(card=>!keptIds.has(cardId(card)))];
  },[p.hand,order,manual]);

  const chosen=p.hand.find(card=>cardId(card)===selected);
  const canPlay=!!chosen&&legal.has(cardId(chosen))&&p.active&&!busy;

  useEffect(()=>{setSelected(null);},[p.viewer,p.active]);
  // Pass & Play hands the device to someone else, whose cards are not the
  // ones this arrangement describes.
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

  function handleHandKeys(event:React.KeyboardEvent<HTMLDivElement>) {
    if(event.altKey&&(event.key==="ArrowLeft"||event.key==="ArrowRight")) {
      const id=(event.target as HTMLElement).closest<HTMLElement>(".hc")?.dataset.cardId;
      if(!id)return;
      event.preventDefault();
      const from=displayedHand.findIndex(card=>cardId(card)===id);
      reorder(from,from+(event.key==="ArrowRight"?1:-1));
      requestAnimationFrame(()=>handRef.current?.querySelector<HTMLButtonElement>(`[data-card-id="${id}"]`)?.focus({preventScroll:true}));
      return;
    }
    navigateHand(event);
  }

  function dragStart(event:React.PointerEvent<HTMLButtonElement>,id:string) {
    if(event.pointerType==="mouse"&&event.button!==0)return;
    drag.current={id,x:event.clientX,active:false};
  }
  function dragMove(event:React.PointerEvent<HTMLButtonElement>) {
    const state=drag.current;
    if(!state)return;
    // Past a threshold only, so a tap - and therefore double-tap-to-play -
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
  function dragEnd(event:React.PointerEvent<HTMLButtonElement>) {
    const state=drag.current;
    drag.current=null;
    if(!state?.active)return;
    suppressClick.current=true;setDragId(null);
    if(event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  /** Tap once to pick, twice to play — the same gesture on mouse and touch. */
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

  const complete=p.trick.length===(duel?2:4);
  // A renege inside the current trick sets trump for that same trick, and the
  // parent only commits the new suit after the trick resolves - so derive it
  // from the cards on the table rather than reading p.trump alone.
  const effectiveTrump=trumpAfterTrick(p.trump,p.trick);
  const winner=complete?resolveTrick(p.trick,effectiveTrump):null;

  // The fan across the bottom of the canvas. The Cut board gives the hand's
  // own numbers for a full thirteen (LAY.hand in design/arena/boards/
  // Cut.dc.html: centre 654, 50 apart, y 672, a 1.5 curve and 2.4 degrees a
  // step), which is the hand as it is dealt. A smaller hand spreads out to
  // the Main board's 112 apart, and its curve and turn grow with the spread
  // so the arc keeps its shape.
  const n=displayedHand.length;
  const dx=n>1?Math.min(112,600/(n-1)):0;
  const grow=dx/50;
  const layout=displayedHand.map((card,i)=>{
    const offset=n===1?0:i-(n-1)/2;
    return {
      card,
      x: Math.round(654+offset*dx),
      y: Math.round(672+offset*offset*1.5*grow*grow),
      r: +(offset*2.4*grow).toFixed(2),
      i,
    };
  });

  const tensUs=p.tens[team], tensThem=p.tens[other];
  const tenSuits=(count:number,red:boolean)=>Array.from({length:count},(_,i)=>i);
  /* Before anyone has played, the table is as the Cut board leaves it:
     "Mariyam leads the first trick", "Trick 1 / 13", her plate reading
     Leads, and nobody's Tens taken yet. */
  const opening=p.opening??null;
  const ceremony=!!opening&&opening.step<4;
  const firstTrick=p.tricks.A+p.tricks.B===0&&p.trick.length===0;
  const totalTricks=duel?26:13;
  const leaderName=[p.top,p.left,p.right].find(s=>s?.active)?.name??"the next player";
  const statusText=p.active
    ? (p.trick.length?`Your turn. ${suitName(p.trick[0].card.suit)} were led, so follow suit.`:"Your turn. Lead any card.")
    : complete?"Resolving the trick."
    : firstTrick?t("deal_leadsFirstTrick").replace("{name}",leaderName)
    : `Waiting for ${leaderName}.`;

  const felt=FELT[p.tableSkin??"tt_default"]??FELT.tt_default;

  /* What the rotate gate says while this hand runs on a phone held upright
     (components/layout/RotateGate.tsx, design/arena/boards/MRotate.dc.html).
     The gate covers the table rather than replacing it, so it reports the
     same turn this screen is showing - and its Leave table opens the same
     confirm this screen's back button opens.

     Mindi has no turn clock in this app, so no `deadline` is published and
     the gate's countdown ring is left off. That is the truth about the game,
     not a gap in the gate: there is nothing here to count down. */
  const waitingOn=[p.top,p.left,p.right].find(seat=>seat?.active)??null;
  usePublishMatchGate({
    label:`Mindi · ${p.mode}`,
    progress:t("rotate_trickOf")
      .replace("{n}",String(Math.min(13,p.tricks.A+p.tricks.B+1)))
      .replace("{total}","13"),
    turn:p.active
      ? {mine:true,detail:p.trick.length
          ? t("rotate_followSuit").replace("{suit}",suitName(p.trick[0].card.suit))
          : t("rotate_leadAnyCard")}
      : waitingOn?{mine:false,name:waitingOn.name}:null,
    onLeave:askToLeave,
  });

  /* PMindi prints one short line mid-table, and the board's is the tap hint
     rather than the turn status - the turn status is in the chip bottom-left.
     Short because `.hint` is nowrap and the desktop's full sentence does not
     fit at 844px wide. */
  const phoneHint=!p.active
    ? complete?"Resolving the trick"
      : firstTrick&&waitingOn?t("deal_leadsFirstTrick").replace("{name}",waitingOn.name)
      : `Waiting for ${waitingOn?.name??"the next player"}`
    : firstTrick&&!chosen?"Your turn. Lead any card."
    : chosen
      ? canPlay?`Tap the ${rankLabel(chosen.rank)} again to play it`:"That card cannot follow"
      : "Tap a card to pick it";

  /* The rules, settings and leave-confirm dialog. Declared once and rendered
     by both compositions - it is a <dialog> in the top layer, so it sits over
     the table whichever picture is underneath, and the phone never needed a
     second copy of the leave flow. */
  const dialogs = <>
  {modal&&<dialog ref={dialog} className={"gin-dialog"+(modal==="rules"?" rule-book-dialog":"")} aria-labelledby="mindi-dialog-title"
    onCancel={e=>{if(busy)e.preventDefault();else setModal(null);}}>
    <header><h2 id="mindi-dialog-title">{modal==="leave"?"Leave game?":modal==="rules"?"Mindi rule book":modal==="info"?"Game Info":"Game Settings"}</h2>
      <button type="button" className="ibtn" aria-label="Close dialog" disabled={busy} onClick={()=>setModal(null)} style={{width:40,height:40}}><Icon name="i-close"/></button></header>
    {modal==="rules"?<RuleBook game="mindi"/>
      :modal==="settings"?<SettingToggle icon={Music} label="Background Music" enabled={settings.music}
          onChange={()=>{try{updateSettings({music:!settings.music});}catch{setError("Could not save music preference.");}}}/>
      :<><p>{p.online?"Leaving forfeits this match.":"Your current hand will be lost."}</p>
        <footer>
          <button type="button" className="btn sm blue" disabled={busy} onClick={()=>setModal(null)}>Cancel</button>
          {/* The board has no destructive variant, so this one comes from
              the app's own recipe in styles/arena.css rather than being
              invented on the board's .btn. */}
          <button type="button" className="ar-btn sm danger" disabled={busy}
            onClick={()=>run(async()=>{await p.onLeave?.();router.push("/play");})}>Leave game</button>
        </footer></>}
    {error&&<p role="alert">{error}</p>}
  </dialog>}
  </>;

  /* Sideways on a phone the table is PMindi, an 844x390 composition of its
     own - see components/game/phone/PhoneMindiBoard.tsx. Everything above
     this line is shared: the same selection, the same legal cards, the same
     double-tap, the same leave confirm. Only the picture below differs. */
  if (phone) return <>
    <PhoneMindiBoard
      hand={displayedHand} legal={legal} selected={selected} viewer={p.viewer}
      top={p.top} left={p.left} right={p.right}
      you={{name:p.name,cards:p.hand.length}}
      /* PMindi rings the card winning the trick so far, not only once the
         trick is complete: the board lights Mariyam's king while it leads. */
      active={p.active} trump={effectiveTrump} trick={p.trick} winner={p.trick.length?resolveTrick(p.trick,effectiveTrump):null}
      tens={{us:tensUs,them:tensThem}} tricks={{us:p.tricks[team],them:p.tricks[other]}}
      tenSuits={{us:capturedSuits(p.tenCaptures,team),them:capturedSuits(p.tenCaptures,other)}}
      hint={phoneHint} error={modal ? undefined : error} actionLabel={chosen?`Play ${rankLabel(chosen.rank)}`:p.active?t("table_pickACard"):t("table_wait")}
      tableSkin={p.tableSkin} canPlay={canPlay}
      opening={opening} firstTrick={firstTrick&&!complete}
      onActivate={activateCard}
      onPlay={()=>{if(canPlay&&chosen)run(async()=>{await p.onPlay(chosen);setSelected(null);});}}
      onLeave={askToLeave} onMenu={()=>setModal("settings")}
    />
    {dialogs}
  </>;

  /* While the opening deal runs, the table's own chrome does its work:
     the plates say who dealt and what each seat drew, the two panels hold
     the steps and the cut, the pill narrates, and Skip to deal sits in the
     action button's slot (design/arena/boards/Cut.dc.html). */
  const words=opening&&ceremony?openingWords(opening,t):null;
  const plate=(spot:Spot)=>opening&&ceremony?openingPlate(opening,spot,t):null;
  const leads=(seat:ArenaSeatData)=>firstTrick&&seat.active&&!complete;
  const rootClass=["ar",opening?.frozen?"frozen":"",opening?.reduced?"deal-reduced":""].filter(Boolean).join(" ");
  /* The table's controls fade in as the deal hands over, as on the board. */
  const handOver:React.CSSProperties|undefined=opening?{animation:"fade .4s ease-out both"}:undefined;
  const handShown=!opening||opening.step===4;
  const self=plate("S");
  const remaining=tensInPlay(p.tenCaptures,tensUs+tensThem);

  return <ArenaStage className="arena-mindi arena-deal">
    <div className={rootClass} style={{position:"relative",width:1440,height:900,overflow:"hidden",background:"#000"}}>
      <ArenaSprite/>
      <div className="bg"/>
      <div className="bigword" aria-hidden="true">MINDI</div>
      <div className="beam" style={{left:60,transform:"rotate(-16deg)"}}/>
      <div className="beam" style={{left:860,transform:"rotate(16deg)"}}/>

      <div className="stage" aria-hidden="true">
        <div className="floor"/>
        <div className="table">
          {APRONS.map(([z,colour])=><div key={z} className="apron" style={{transform:`translateZ(${z}px)`,background:colour}}/>)}
          <div className="felt" style={{backgroundColor:felt}}>
            <div className="emblem l"><Icon name="i-crown"/><span>THAASBAI</span></div>
            <div className="emblem r"><Icon name="i-crown"/><span>THAASBAI</span></div>
          </div>
          <div className="rail"/>
          <svg className="leds" viewBox="0 0 1200 740">
            <defs><filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="5"/></filter></defs>
            <ellipse cx="600" cy="370" rx="591" ry="361" fill="none" stroke="#FFFFFF" strokeOpacity=".16" strokeWidth="1.5"/>
            <ellipse cx="600" cy="370" rx="565" ry="335" fill="none" stroke="#6FE9F0" strokeOpacity=".75" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="2 22" className="chase"/>
            <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#C6FF33" strokeWidth="9" strokeOpacity=".7" filter="url(#glow)"/>
            <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#DFFF85" strokeWidth="3"/>
          </svg>

          {opening&&!opening.settled&&<OpeningCards deal={opening} geo={GEO_DESKTOP} variant="desktop"/>}

          {p.trick.map(play=>{
            const spot=TRICK_SPOT[(play.seat-p.viewer+4)%4];
            const won=winner===play.seat;
            return <div key={cardId(play.card)} className={"tc"+(won?" win":"")}
              style={{left:spot.x,top:spot.y,["--rot" as string]:`${spot.rot}deg`}}>
              <ArenaFace rank={rankLabel(play.card.rank)} suit={play.card.suit} ten={isTen(play.card)}/>
            </div>;
          })}
          {winner!==null&&<div className="standee" style={{["--x" as string]:"626px",["--y" as string]:"120px"}}>
            <Icon name="i-crown"/>{teamOf(winner)===team?"Takes it":"Theirs"}
          </div>}
        </div>
      </div>

      {[[230,640,0],[1180,600,1.4],[1050,720,2.8],[330,760,4.1],[1290,700,5.3],[150,560,3.4]].map(([x,y,d],i)=>
        <i key={i} className={"mote"+(i%2?" v":"")} style={{left:x,top:y,animationDelay:`${d}s`}}/>)}

      <Seat seat={p.top} fanAt={{left:720,top:178}} frameAt={{left:720,top:176,transform:"translateX(-50%)"}} partner={!duel}
        plate={plate("N")} ceremony={ceremony} leads={leads(p.top)} t={t}/>
      {p.left&&<Seat seat={p.left} fanAt={{left:122,top:432}} frameAt={{left:36,top:430}} partner={false}
        plate={plate("W")} ceremony={ceremony} leads={leads(p.left)} t={t}/>}
      {p.right&&<Seat seat={p.right} fanAt={{left:1310,top:432}} frameAt={{right:36,top:430}} partner={false}
        plate={plate("E")} ceremony={ceremony} leads={leads(p.right)} t={t}/>}

      <header style={{position:"absolute",left:36,right:36,top:26,height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          <button type="button" className="ibtn" aria-label="Leave game" onClick={()=>setModal("leave")}><Icon name="i-back"/></button>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
              <span className="disp chrome" style={{fontSize:36}}>Mindi</span>
              <span lang="dv" dir="rtl" style={{fontFamily:"var(--font-thaana), sans-serif",fontSize:18,fontWeight:700,color:"#6FE9F0"}}>މިންޑި</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              {/* The Weekend League wears the live chip (Main board); every
                  other pool the blue one (Cut board). */}
              {/weekend/i.test(p.mode)?<span className="chip live"><i/>{p.mode}</span>:<span className="chip blue">{p.mode}</span>}
              <span className="lbl">{ceremony?t("deal_openingDeal"):t("table_trickSlash").replace("{n}",String(Math.min(totalTricks,p.tricks.A+p.tricks.B+1))).replace("{total}",String(totalTricks))}</span>
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
        const tens=<>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <span className="lbl dash" style={{color:"#fff"}}>Tens</span><span className="lbl">Tricks</span>
          </div>
          <TensRow label={duel?"YOU":"US"} tens={tensUs} tricks={p.tricks[team]} them={false} keys={tenSuits(tensUs,false)} none={t("table_noneYet")}/>
          <TensRow label={duel?"THEY":"THEM"} tens={tensThem} tricks={p.tricks[other]} them keys={tenSuits(tensThem,true)} none={t("table_noneYet")}/>
          {remaining.length===4
            ? <div style={{display:"flex",alignItems:"center",gap:8,height:40,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.1)"}}>
                {remaining.map(suit=><div key={suit} className="mini ghost" style={{width:22,height:30}}><SuitGlyph suit={suit}/></div>)}
                <span style={{marginLeft:4,fontSize:13.5,fontWeight:600,color:"#BEBECA"}}>{t("table_allTensInPlay")}</span>
              </div>
            : <div style={{display:"flex",alignItems:"center",gap:10,height:40,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.1)"}}>
                {remaining.length>0
                  ? <>{remaining.map(suit=><div key={suit} className="mini ghost" style={{width:22,height:30}}><SuitGlyph suit={suit}/></div>)}
                      <span style={{fontSize:13.5,fontWeight:600,color:"#BEBECA"}}>{remaining.length===1?"One Ten still in play":`${remaining.length} Tens still in play`}</span></>
                  : <span style={{fontSize:13.5,fontWeight:700,color:"#C6FF33"}}>All four Tens taken · {tensUs} to {tensThem}</span>}
              </div>}
        </>;
        if(!opening) return <section className="hud" aria-label="Score" style={{left:36,top:106,width:320,padding:"16px 20px 14px",display:"flex",flexDirection:"column",gap:8}}>{tens}</section>;
        return <section className="hud swap" aria-label={ceremony?t("deal_openingDeal"):"Score"}
          style={{left:36,top:106,width:320,padding:"16px 20px 18px",["--pt" as string]:"16px",["--pl" as string]:"20px",["--pr" as string]:"20px"}}>
          <OpeningSteps deal={opening} className={ceremony?undefined:"out"}/>
          <div className={ceremony?"out":undefined} style={{display:"flex",flexDirection:"column",gap:8}}>{tens}</div>
        </section>;
      })()}

      {(()=>{
        const trump=<>
          {effectiveTrump
            ? <div className="hexwrap"><div className="hex"><SuitGlyph suit={effectiveTrump}/></div></div>
            : <div className="hexwrap q"><div className="hex q"><span className="hexq">?</span></div></div>}
          <div style={{display:"flex",flexDirection:"column",gap:7}}>
            <span className="lbl dash">Trump</span>
            <span className="disp" style={{fontSize:34}}>{effectiveTrump?suitName(effectiveTrump):t("table_notSet")}</span>
            <span style={{fontSize:13.5,fontWeight:600,lineHeight:1.4,color:"#BEBECA"}}>
              {effectiveTrump?"Set by the first player who could not follow":"The first player who can't follow suit sets it"}
            </span>
          </div>
        </>;
        if(!opening) return <section className="hud" aria-label="Trump" style={{right:36,top:106,width:320,padding:"16px 20px",display:"flex",alignItems:"center",gap:18}}>{trump}</section>;
        return <section className="hud swap" aria-label={ceremony?t("deal_theCut"):"Trump"}
          style={{right:36,top:106,width:320,height:ceremony?(duel?140:228):131,padding:"16px 16px 16px 20px",["--pt" as string]:"16px",["--pl" as string]:"20px",["--pr" as string]:"16px"}}>
          <OpeningCut deal={opening} className={ceremony?undefined:"out"}/>
          <div className={ceremony?"out":undefined} style={{display:"flex",alignItems:"center",gap:18,alignSelf:"center"}}>{trump}</div>
        </section>;
      })()}

      <div className="status" role="status">
        {words?<><i className="dot them"/>{words.status}</>:<>{p.active&&<i className="dot live"/>}{statusText}</>}
      </div>

      <section className="hand" aria-label="Your cards — tap to pick, tap again to play, drag or Alt+Arrow to rearrange"
        ref={handRef} onKeyDown={handleHandKeys}>
        {handShown&&layout.map(({card,x,y,r,i})=>{
          const id=cardId(card);
          const picked=selected===id;
          const allowed=legal.has(id);
          return <button key={id} type="button" data-card-id={id}
            className={"hc"+(picked?" sel":"")+(!allowed&&p.active?" no":"")+(!p.active?" wait":"")+(dragId===id?" sel":"")}
            data-flat
            style={{["--x" as string]:`${x}px`,["--y" as string]:`${y}px`,["--r" as string]:`${r}deg`,["--i" as string]:i,zIndex:picked?30:i}}
            disabled={!p.active||!allowed||busy}
            aria-pressed={picked}
            aria-label={`${rankLabel(card.rank)} of ${suitName(card.suit)}`}
            onPointerDown={event=>dragStart(event,id)} onPointerMove={dragMove} onPointerUp={dragEnd} onPointerCancel={dragEnd}
            onClick={()=>activateCard(card)}>
            <ArenaFace rank={rankLabel(card.rank)} suit={card.suit} ten={isTen(card)}/>
          </button>;
        })}
      </section>

      <div className={"pf"+(self?.first?" first":!ceremony&&p.active?" turn":"")} style={{left:36,top:800}}>
        <div className="av">{p.name.slice(0,1).toUpperCase()}
          {self?<CountBadge count={self.count} shown={self.countShown}/>:<span className="ct">{p.hand.length}</span>}</div>
        <div className="nm"><b>{p.name}{self?.dealer&&<span className="dtag">{t("deal_dealer")}</span>}</b>
          <span><i className={"dot"+(!ceremony&&p.active?" live":"")}/>
            {self?<>{self.line}{self.suit&&<SuitGlyph suit={self.suit} className={self.red?"red":undefined}/>}</>:p.active?"Your turn":"Waiting"}</span></div>
      </div>

      {ceremony&&opening
        ? <div style={{position:"absolute",right:36,top:806}}><OpeningSkip deal={opening}/></div>
        : <>
          <div style={{position:"absolute",right:36,top:722,display:"flex",alignItems:"center",gap:14,...handOver}}>
            <button type="button" className="ibtn" aria-label="Last trick" aria-expanded={lastOpen}
              disabled={!p.lastTrick} onClick={()=>setLastOpen(open=>!open)}><Icon name="i-history"/></button>
            <div className="seg" role="group" aria-label="Sort hand">
              <button type="button" aria-pressed={!manual&&order==="suit"} onClick={()=>{setManual(null);setOrder("suit");}}>Suit</button>
              <button type="button" aria-pressed={!manual&&order==="rank"} onClick={()=>{setManual(null);setOrder("rank");}}>Rank</button>
            </div>
          </div>
          <div style={{position:"absolute",right:36,top:806,...handOver}}>
            <button type="button" className="btn" style={{width:250}} disabled={!canPlay}
              onClick={()=>{if(canPlay&&chosen)run(async()=>{await p.onPlay(chosen);setSelected(null);});}}>
              <Icon name="i-play"/>{chosen?`Play ${rankLabel(chosen.rank)}`:p.active?t("table_pickACard"):t("table_waitFor").replace("{name}",leaderName)}
              {chosen&&<SuitGlyph suit={chosen.suit}/>}
            </button>
          </div>
        </>}

      {lastOpen&&p.lastTrick&&<section className="hud last" aria-label="Last trick">
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <span className="disp" style={{fontSize:24}}>Trick {p.lastTrick.number}</span>
            <span style={{fontSize:13.5,fontWeight:600,color:"#BEBECA"}}>{nameForSeat(p,p.lastTrick.winner,duel)} won it</span>
          </div>
          <button type="button" className="ibtn" aria-label="Close last trick" onClick={()=>setLastOpen(false)} style={{width:44,height:44}}><Icon name="i-close"/></button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4, minmax(0, 1fr))",gap:10}}>
          {p.lastTrick.plays.map(play=>{
            const won=play.seat===p.lastTrick!.winner;
            const red=play.card.suit==="H"||play.card.suit==="D";
            return <div key={play.seat} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:9}}>
              <div className={"mini"+(red?" red":"")} style={{width:54,height:76,boxShadow:won?"0 0 0 3px #C6FF33, 0 0 20px rgba(198,255,51,.4)":undefined}}>
                <b style={{fontSize:21}}>{rankLabel(play.card.rank)}</b><SuitGlyph suit={play.card.suit}/>
              </div>
              <span style={{fontSize:12.5,fontWeight:won?700:600,color:won?"#C6FF33":"#BEBECA"}}>{nameForSeat(p,play.seat,duel)}</span>
            </div>;
          })}
        </div>
      </section>}

      {error&&<p role="alert" style={{position:"absolute",left:36,bottom:12,color:"#FF6B7F",fontSize:13}}>{error}</p>}
    </div>

    {dialogs}
  </ArenaStage>;
}

/** A seat: a fan of face-down cards behind a player frame, both at board coordinates. */
function Seat({seat,fanAt,frameAt,partner,plate,ceremony,leads,t}:{
  seat:ArenaSeatData; fanAt:React.CSSProperties; frameAt:React.CSSProperties; partner:boolean;
  /** What the plate says while the opening deal runs, else null. */
  plate:ReturnType<typeof openingPlate>|null; ceremony:boolean;
  /** Nobody has played yet and this seat opens trick 1. */
  leads:boolean; t:(key:string)=>string;
}) {
  // The board fans four backs; a real hand can hold more, so the fan shows up
  // to five and the exact count lives in the badge, as on the board. The
  // fans wait for the deal: until then the cards are the deal layer's piles.
  const shown=Math.min(Math.max(seat.cardCount,0),5);
  const angles=shown>1?Array.from({length:shown},(_,i)=>-12+(24/(shown-1))*i):[0];
  return <>
    <div className={"fan"+(ceremony?" off":"")} style={fanAt}>
      {angles.map((a,i)=><div key={i} className="fb" style={{["--a" as string]:`${a}deg`}}><ArenaBack/></div>)}
    </div>
    <div className={"pf"+(plate?.first?" first":!ceremony&&seat.active?" turn":"")} style={frameAt}>
      <div className={"av"+(partner?"":" them")}>{seat.name.slice(0,1).toUpperCase()}
        {plate?<CountBadge count={plate.count} shown={plate.countShown}/>:<span className="ct">{seat.cardCount}</span>}</div>
      <div className="nm"><b>{seat.name}{plate?.dealer&&<span className="dtag">{t("deal_dealer")}</span>}</b>
        <span><i className={"dot"+(partner?"":" them")+(!ceremony&&seat.active?" live":"")}/>
          {plate?<>{plate.line}{plate.suit&&<SuitGlyph suit={plate.suit} className={plate.red?"red":undefined}/>}</>
            :leads?t("deal_leads"):partner?"Partner":"Opponent"}</span></div>
    </div>
  </>;
}

/** One side's row in the score panel: a rack of Tens, then the trick count. */
function TensRow({label,tens,tricks,them,keys,none}:{label:string;tens:number;tricks:number;them:boolean;keys:number[];none:string}) {
  return <div style={{display:"flex",alignItems:"center",gap:12,height:46}}>
    <span style={{width:56,display:"flex",alignItems:"center",gap:8,fontFamily:"var(--font-display), sans-serif",fontSize:13,fontWeight:700,letterSpacing:".12em"}}>
      <i className={"dot"+(them?" them":"")}/>{label}
    </span>
    <div style={{flexGrow:1,display:"flex",gap:6}}>
      {keys.map(i=><div key={i} className="mini"><b>10</b><SuitGlyph suit="S"/></div>)}
      {tens===0&&<span className="muted2" style={{fontSize:13}}>{none}</span>}
    </div>
    <span className="num" style={{width:40,textAlign:"right",fontSize:34,lineHeight:1,color:them?"#fff":"#C6FF33"}}>{tricks}</span>
  </div>;
}

/**
 * The Tens nobody has taken yet, in the order the Cut board lays out the
 * four ghost minis (spades, hearts, clubs, diamonds). The Main board draws
 * the same ghosts for the ones still in play, so one list serves both.
 */
function tensInPlay(captures:TenCapture[]|undefined,taken:number):Suit[] {
  const order:Suit[]=["S","H","C","D"];
  if(!captures) return order.slice(taken);
  const gone=new Set(captures.map(ten=>ten.suit));
  return order.filter(suit=>!gone.has(suit));
}

const SUIT_NAMES: Record<string,string> = { S:"Spades", H:"Hearts", D:"Diamonds", C:"Clubs" };

/**
 * The suits of the Tens one side has taken, in the order they were taken.
 * PMindi's rack draws each Ten's own suit rather than a count, so it needs
 * the list; without one it draws nothing, which is honest.
 */
function capturedSuits(captures:TenCapture[]|undefined,team:Team):Suit[] {
  return (captures??[]).filter(ten=>ten.team===team).sort((a,b)=>a.trick-b.trick).map(ten=>ten.suit);
}
function suitName(letter:string) { return SUIT_NAMES[letter] ?? letter; }

function nameForSeat(p:Props,seat:SeatIndex,duel:boolean) {
  if(seat===p.viewer) return "You";
  const relative=(seat-p.viewer+4)%4;
  if(duel) return p.top.name;
  return relative===1?(p.left?.name??"Left"):relative===2?p.top.name:(p.right?.name??"Right");
}
