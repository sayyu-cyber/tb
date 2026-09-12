"use client";

import { motion } from "framer-motion";
import { PlayingCard, type Suit } from "@/components/game/PlayingCard";

/**
 * Ambient background for the sign-in screen: real PlayingCard instances
 * (the same component used at the table, not stock art) scattered around
 * the viewport and drifting slowly - "moving scattered different playing
 * cards" per the design brief. Kept low-opacity and blurred so it reads as
 * atmosphere behind the form rather than competing with it, and stays on
 * the app's existing dark palette (no new colours introduced - the cards'
 * own white/red/black is already how every card in the app looks).
 *
 * Positions/ranks/suits are generated once at module load from a seeded
 * (not Math.random) formula, so the layout is fixed and identical between
 * the static export's build-time render and client hydration, rather than
 * jumping on every re-render.
 */

interface ScatteredCard {
  rank: string;
  suit: Suit;
  faceDown?: boolean;
  top: string;
  left: string;
  rotate: number;
  size: "xs" | "sm" | "md" | "lg";
  duration: number;
  delay: number;
}

const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const SUITS: Suit[] = ["spades", "hearts", "diamonds", "clubs"];
const SIZES: ScatteredCard["size"][] = ["xs", "sm", "sm", "md"];

/** Deterministic pseudo-random in [0, 1) seeded by index - a fixed count of
 *  cards laid out this way (rather than hand-placed or Math.random) scales
 *  cleanly to any count while staying identical between the static export's
 *  build-time render and the client hydration (Math.random would mismatch
 *  the two and either flash or throw a hydration warning). */
function seeded(i: number, salt: number): number {
  const x = Math.sin(i * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

const CARD_COUNT = 30;

// Pure uniform-random placement over the whole viewport tends to cluster
// (classic random-scatter problem) - instead, lay cards out on a grid
// (6 columns x 5 rows = 30 cells) and jitter each one within its own cell,
// so every card gets its own patch of space but the grid itself doesn't
// read as a grid.
const GRID_COLS = 6;
const GRID_ROWS = 5;

const CARDS: ScatteredCard[] = Array.from({ length: CARD_COUNT }, (_, i) => {
  const rank = RANKS[i % RANKS.length];
  const suit = SUITS[Math.floor(seeded(i, 1) * SUITS.length)];
  const faceDown = seeded(i, 2) < 0.25;

  const col = i % GRID_COLS;
  const row = Math.floor(i / GRID_COLS) % GRID_ROWS;
  const cellW = 100 / GRID_COLS;
  const cellH = 100 / GRID_ROWS;
  // Jitter within ~70% of the cell so neighbouring cards never touch, but
  // still feels organic rather than snapped to a visible grid.
  const jitterX = (seeded(i, 3) - 0.5) * cellW * 0.7;
  const jitterY = (seeded(i, 4) - 0.5) * cellH * 0.7;
  const top = Math.min(96, Math.max(0, row * cellH + cellH / 2 + jitterY));
  const left = Math.min(96, Math.max(0, col * cellW + cellW / 2 + jitterX));

  return {
    rank,
    suit,
    faceDown,
    top: `${top.toFixed(1)}%`,
    left: `${left.toFixed(1)}%`,
    rotate: Math.round(seeded(i, 5) * 70 - 35),
    size: SIZES[Math.floor(seeded(i, 6) * SIZES.length)],
    // 3.8s-6.5s - fast enough to read as lively motion without feeling frantic.
    duration: 3.8 + seeded(i, 7) * 2.7,
    delay: seeded(i, 8) * 3,
  };
});

export function ScatteredCards() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {CARDS.map((c, i) => (
        <motion.div
          key={i}
          className="absolute opacity-[0.16] blur-[0.5px] saturate-[0.6]"
          style={{ top: c.top, left: c.left, rotate: c.rotate }}
          animate={{
            y: [0, -24, 0],
            rotate: [c.rotate - 5, c.rotate + 5, c.rotate - 5],
          }}
          transition={{
            duration: c.duration,
            delay: c.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <PlayingCard rank={c.rank} suit={c.suit} size={c.size} faceDown={c.faceDown} cardBackId="cb_default" />
        </motion.div>
      ))}

      {/* Vignette so the drifting cards fade toward the edges rather than
          hard-cropping, and the centre (where the form sits) stays clean. */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(var(--c1)/55%)_0%,rgb(var(--c1)/88%)_60%,rgb(var(--c1))_100%)]" />
    </div>
  );
}
