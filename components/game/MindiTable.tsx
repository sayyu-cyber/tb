"use client";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Card, Suit, SeatIndex, Team, TrickPlay, CompletedTrick,
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

  // The board fans the hand across the bottom of the canvas. Its own numbers
  // come from the design runtime, which is not in the file, so the fan is
  // computed here to match the screens: a fixed centre, spacing that tightens
  // as the hand grows, and a shallow arc.
  const n=displayedHand.length;
  const spacing=Math.min(112,n>1?980/(n-1):0);
  const layout=displayedHand.map((card,i)=>{
    const offset=n===1?0:i-(n-1)/2;
    return {
      card,
      x: 720-54+offset*Math.min(spacing,70),
      y: 615+offset*offset*.35,
      r: offset*(n>8?2:4),
      i,
    };
  });

  const tensUs=p.tens[team], tensThem=p.tens[other];
  const tenSuits=(count:number,red:boolean)=>Array.from({length:count},(_,i)=>i);
  const statusText=p.active
    ? (p.trick.length?`Your turn. ${suitName(p.trick[0].card.suit)} were led, so follow suit.`:"Your turn. Lead any card.")
    : complete?"Resolving the trick.":`Waiting for ${[p.top,p.left,p.right].find(s=>s?.active)?.name??"the next player"}.`;

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

  return <ArenaStage className="arena-mindi">
    <div className="ar" style={{position:"relative",width:1440,height:900,overflow:"hidden",background:"#000"}}>
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

      <Seat seat={p.top} fanAt={{left:720,top:178}} frameAt={{left:720,top:176,transform:"translateX(-50%)"}} partner={!duel}/>
      {p.left&&<Seat seat={p.left} fanAt={{left:122,top:432}} frameAt={{left:36,top:430}} partner={false}/>}
      {p.right&&<Seat seat={p.right} fanAt={{left:1310,top:432}} frameAt={{right:36,top:430}} partner={false}/>}

      <header style={{position:"absolute",left:36,right:36,top:26,height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:18}}>
          <button type="button" className="ibtn" aria-label="Leave game" onClick={()=>setModal("leave")}><Icon name="i-back"/></button>
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{display:"flex",alignItems:"baseline",gap:12}}>
              <span className="disp chrome" style={{fontSize:36}}>Mindi</span>
              <span lang="dv" dir="rtl" style={{fontFamily:"var(--font-thaana), sans-serif",fontSize:18,fontWeight:700,color:"#6FE9F0"}}>މިންޑި</span>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span className="chip live"><i/>{p.mode}</span>
              <span className="lbl">{p.hand.length} cards in hand</span>
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

      <section className="hud" aria-label="Score" style={{left:36,top:106,width:320,padding:"16px 20px 14px",display:"flex",flexDirection:"column",gap:8}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <span className="lbl dash" style={{color:"#fff"}}>Tens</span><span className="lbl">Tricks</span>
        </div>
        <TensRow label={duel?"YOU":"US"} tens={tensUs} tricks={p.tricks[team]} them={false} keys={tenSuits(tensUs,false)}/>
        <TensRow label={duel?"THEY":"THEM"} tens={tensThem} tricks={p.tricks[other]} them keys={tenSuits(tensThem,true)}/>
        <div style={{display:"flex",alignItems:"center",gap:10,height:40,paddingTop:8,borderTop:"1px solid rgba(255,255,255,.1)"}}>
          {tensUs+tensThem<4
            ? <><div className="mini ghost" style={{width:22,height:30}}><SuitGlyph suit="S"/></div>
                <span style={{fontSize:13.5,fontWeight:600,color:"#BEBECA"}}>{4-tensUs-tensThem===1?"One Ten still in play":`${4-tensUs-tensThem} Tens still in play`}</span></>
            : <span style={{fontSize:13.5,fontWeight:700,color:"#C6FF33"}}>All four Tens taken · {tensUs} to {tensThem}</span>}
        </div>
      </section>

      <section className="hud" aria-label="Trump" style={{right:36,top:106,width:320,padding:"16px 20px",display:"flex",alignItems:"center",gap:18}}>
        <div className="hexwrap" style={effectiveTrump?undefined:{filter:"none"}}>
          <div className="hex" style={effectiveTrump?undefined:{background:"#1A1A20"}}>
            {effectiveTrump?<SuitGlyph suit={effectiveTrump}/>:<Icon name="i-close"/>}
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:7}}>
          <span className="lbl dash">Trump</span>
          <span className="disp" style={{fontSize:34}}>{effectiveTrump?suitName(effectiveTrump):"Not set"}</span>
          <span style={{fontSize:13.5,fontWeight:600,color:"#BEBECA"}}>
            {effectiveTrump?"Set by the first player who could not follow":"The first player who can't follow suit sets it"}
          </span>
        </div>
      </section>

      <div className="status" role="status">{p.active&&<i className="dot live"/>}{statusText}</div>

      <section className="hand" aria-label="Your cards — tap to pick, tap again to play, drag or Alt+Arrow to rearrange"
        ref={handRef} onKeyDown={handleHandKeys}>
        {layout.map(({card,x,y,r,i})=>{
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

      <div className={"pf"+(p.active?" turn":"")} style={{left:36,top:800}}>
        <div className="av">{p.name.slice(0,1).toUpperCase()}<span className="ct">{p.hand.length}</span></div>
        <div className="nm"><b>{p.name}</b><span><i className={"dot"+(p.active?" live":"")}/>{p.active?"Your turn":"Waiting"}</span></div>
      </div>

      <div style={{position:"absolute",right:316,top:806,display:"flex",alignItems:"center",gap:14}}>
        <button type="button" className="ibtn" aria-label="Last trick" aria-expanded={lastOpen}
          disabled={!p.lastTrick} onClick={()=>setLastOpen(open=>!open)}><Icon name="i-history"/></button>
        <div className="seg" role="group" aria-label="Sort hand">
          <button type="button" aria-pressed={!manual&&order==="suit"} onClick={()=>{setManual(null);setOrder("suit");}}>Suit</button>
          <button type="button" aria-pressed={!manual&&order==="rank"} onClick={()=>{setManual(null);setOrder("rank");}}>Rank</button>
        </div>
      </div>
      <div style={{position:"absolute",right:36,top:806}}>
        <button type="button" className="btn" style={{width:250}} disabled={!canPlay}
          onClick={()=>{if(canPlay&&chosen)run(async()=>{await p.onPlay(chosen);setSelected(null);});}}>
          <Icon name="i-play"/>{chosen?`Play ${rankLabel(chosen.rank)}`:"Play card"}
          {chosen&&<SuitGlyph suit={chosen.suit}/>}
        </button>
      </div>

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
  </ArenaStage>;
}

/** A seat: a fan of face-down cards behind a player frame, both at board coordinates. */
function Seat({seat,fanAt,frameAt,partner}:{
  seat:ArenaSeatData; fanAt:React.CSSProperties; frameAt:React.CSSProperties; partner:boolean;
}) {
  // The board fans four backs; a real hand can hold more, so the fan shows up
  // to five and the exact count lives in the badge, as on the board.
  const shown=Math.min(Math.max(seat.cardCount,0),5);
  const angles=shown>1?Array.from({length:shown},(_,i)=>-12+(24/(shown-1))*i):[0];
  return <>
    <div className="fan" style={fanAt}>
      {angles.map((a,i)=><div key={i} className="fb" style={{["--a" as string]:`${a}deg`}}><ArenaBack/></div>)}
    </div>
    <div className={"pf"+(seat.active?" turn":"")} style={frameAt}>
      <div className={"av"+(partner?"":" them")}>{seat.name.slice(0,1).toUpperCase()}<span className="ct">{seat.cardCount}</span></div>
      <div className="nm"><b>{seat.name}</b><span><i className={"dot"+(partner?"":" them")+(seat.active?" live":"")}/>{partner?"Partner":"Opponent"}</span></div>
    </div>
  </>;
}

/** One side's row in the score panel: a rack of Tens, then the trick count. */
function TensRow({label,tens,tricks,them,keys}:{label:string;tens:number;tricks:number;them:boolean;keys:number[]}) {
  return <div style={{display:"flex",alignItems:"center",gap:12,height:46}}>
    <span style={{width:56,display:"flex",alignItems:"center",gap:8,fontFamily:"var(--font-display), sans-serif",fontSize:13,fontWeight:700,letterSpacing:".12em"}}>
      <i className={"dot"+(them?" them":"")}/>{label}
    </span>
    <div style={{flexGrow:1,display:"flex",gap:6}}>
      {keys.map(i=><div key={i} className="mini"><b>10</b><SuitGlyph suit="S"/></div>)}
      {tens===0&&<span style={{fontSize:12.5,color:"#6E6E7B",alignSelf:"center"}}>None yet</span>}
    </div>
    <span className="num" style={{width:40,textAlign:"right",fontSize:34,lineHeight:1,color:them?"#fff":"#C6FF33"}}>{tricks}</span>
  </div>;
}

const SUIT_NAMES: Record<string,string> = { S:"Spades", H:"Hearts", D:"Diamonds", C:"Clubs" };
function suitName(letter:string) { return SUIT_NAMES[letter] ?? letter; }

function nameForSeat(p:Props,seat:SeatIndex,duel:boolean) {
  if(seat===p.viewer) return "You";
  const relative=(seat-p.viewer+4)%4;
  if(duel) return p.top.name;
  return relative===1?(p.left?.name??"Left"):relative===2?p.top.name:(p.right?.name??"Right");
}
