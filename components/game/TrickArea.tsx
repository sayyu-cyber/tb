"use client";
import { AnimatePresence, motion } from 'framer-motion';
import { TrickPlay, cardId, rankLabel } from '@/lib/mindiEngine';
import { PlayingCard, suitFromLetter } from './PlayingCard';

const positions = ['bottom', 'left', 'top', 'right'] as const;

export function TrickArea({ plays, viewerSeat = 0, duel = false }: { plays: TrickPlay[]; viewerSeat?: number; duel?: boolean }) {
  const seats = duel ? [viewerSeat, viewerSeat === 0 ? 1 : 0] : [0, 1, 2, 3];
  return <div className="trick-area" aria-label="Cards played this trick">
    {seats.map(seat => {
      const position = duel ? (seat === viewerSeat ? 'bottom' : 'top') : positions[(seat - viewerSeat + 4) % 4];
      const play = plays.find(item => item.seat === seat);
      return <div key={seat} className={`trick-slot trick-slot-${position}`} data-seat={seat} aria-label={`${position} player's card`}>
        <AnimatePresence initial={false}>
          {play && <motion.div key={cardId(play.card)} initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }} transition={{ duration:.16 }}>
            <PlayingCard rank={rankLabel(play.card.rank)} suit={suitFromLetter(play.card.suit)} size="sm" />
          </motion.div>}
        </AnimatePresence>
      </div>;
    })}
  </div>;
}
