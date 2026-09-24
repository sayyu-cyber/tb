"use client";
import { useLayoutEffect, useRef } from 'react';
import { AnimatePresence, motion, useAnimationControls, useReducedMotion } from 'framer-motion';
import { TrickPlay, cardId, rankLabel } from '@/lib/mindiEngine';
import { PlayingCard, suitFromLetter } from './PlayingCard';

const positions = ['bottom', 'left', 'top', 'right'] as const;

function CardFlight({play,position,layoutPrefix}:{play:TrickPlay;position:typeof positions[number];layoutPrefix?:string}) {
  const element=useRef<HTMLDivElement>(null);
  const controls=useAnimationControls();
  const reduced=useReducedMotion();
  useLayoutEffect(()=>{
    if(reduced||position==='bottom')return;
    const target=element.current;
    const source=target?.closest('.mindi-stage')?.querySelector(`.mindi-seat-${position} .mindi-hidden-hand`);
    if(!target||!source)return;
    const from=source.getBoundingClientRect(),to=target.getBoundingClientRect();
    controls.set({x:from.left+from.width/2-to.left-to.width/2,y:from.top+from.height/2-to.top-to.height/2,rotate:position==='left'?90:position==='right'?-90:180,scale:.9});
    void controls.start({x:0,y:0,rotate:0,scale:1,transition:{duration:.42,ease:[.2,.7,.3,1]}});
    return()=>controls.stop();
  },[controls,position,reduced]);
  return <motion.div ref={element} className="mindi-card-flight" animate={controls} exit={{opacity:0}} transition={{duration:reduced?0:.15}}>
    <PlayingCard rank={rankLabel(play.card.rank)} suit={suitFromLetter(play.card.suit)} size="sm" dimensional
      layoutId={position==='bottom'&&layoutPrefix?`${layoutPrefix}-${cardId(play.card)}`:undefined}/>
  </motion.div>;
}

export function TrickArea({ plays, viewerSeat = 0, duel = false, winnerSeat, dimensional=false, layoutPrefix }: { plays: TrickPlay[]; viewerSeat?: number; duel?: boolean; winnerSeat?: number | null; dimensional?:boolean; layoutPrefix?:string }) {
  const reducedMotion = useReducedMotion();
  const seats = duel ? [viewerSeat, viewerSeat === 0 ? 1 : 0] : [0, 1, 2, 3];
  return <div className="trick-area" aria-label="Cards played this trick">
    {seats.map(seat => {
      const position = duel ? (seat === viewerSeat ? 'bottom' : 'top') : positions[(seat - viewerSeat + 4) % 4];
      const play = plays.find(item => item.seat === seat);
      return <div key={seat} className={`trick-slot trick-slot-${position}${winnerSeat === seat ? " trick-slot-winner" : ""}`} data-seat={seat} aria-label={`${position} player's card`}>
        <AnimatePresence initial={false}>
          {play && (dimensional?<CardFlight key={cardId(play.card)} play={play} position={position} layoutPrefix={layoutPrefix}/>:<motion.div key={cardId(play.card)} initial={reducedMotion ? false : { opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} transition={{ duration:reducedMotion ? 0 : .16 }}>
            <PlayingCard rank={rankLabel(play.card.rank)} suit={suitFromLetter(play.card.suit)} size="sm" />
          </motion.div>)}
        </AnimatePresence>
      </div>;
    })}
  </div>;
}
