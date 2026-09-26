"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { RotateCcw, Home, Play } from "lucide-react";
import { ArenaStage } from "./ArenaStage";
import { ArenaSprite } from "./ArenaSprite";
import { ArenaFace } from "./ArenaCard";
import { RANKS, getRankFromTrophies } from "@/constants/ranks";
import type { HandOutcome, Team, TenCapture } from "@/lib/mindiEngine";

/**
 * The end of a Mindi hand — design/arena/screens/result-hand-won.jpg, from
 * design/arena/boards/Result.dc.html.
 *
 * The table the hand was played on is pushed back behind a veil, the four
 * Tens come up face-first with a tag on each, and four panels say what the
 * hand was worth. The board is a fixed 1440x900 artboard and this screen
 * has no shell around it, so ArenaStage scales the whole canvas - the same
 * way the Mindi and Gin tables do.
 *
 * Rewards are shown here rather than behind a "Rewards" button, which is
 * what the board draws and what the Gin result already does: the hand is
 * over, and making someone press a button to find out what they won is a
 * step for no reason. Both Mindi clients now apply the reward as the hand
 * ends and pass the result in.
 *
 * What the board draws as a sample and this draws for real: the Tens, the
 * trick count, the trophy change and the coin balance are the hand's own;
 * the trophy figure is whatever the pool actually pays (see CODE ISSUE 6 in
 * MindiOnlineClient); and the endings legend highlights the ending that
 * happened rather than always "Won".
 */

const TIERS = [RANKS.BRONZE, RANKS.SILVER, RANKS.GOLD, RANKS.PLATINUM];

/** The board's four card tilts, in its order. */
const TILTS: { rot: string; ty: string; delay: string }[] = [
  { rot: "-7deg", ty: "10px", delay: ".1s" },
  { rot: "-2deg", ty: "0px", delay: ".22s" },
  { rot: "2deg", ty: "0px", delay: ".34s" },
  { rot: "7deg", ty: "10px", delay: ".46s" },
];

const COUNT_WORDS = ["none", "one", "two", "three", "all four"];

export interface MindiResultScreenProps {
  outcome: HandOutcome;
  /** The viewer's team, so "us" and "them" are the viewer's. */
  myTeam: Team;
  /** Every Ten, as it was taken. Empty for a hand that ended early. */
  tenCaptures: TenCapture[];
  /** 4 for the partnership game, 2 for the 1v1 FFA room variant. */
  numPlayers: 2 | 4;
  /** 13, or 26 in the 1v1 variant. */
  totalTricks: number;
  /** "Ranked duo", "Casual online", "Vs AI"... - shown in the kicker. */
  modeLabel: string;
  /** The match ran in the Weekend League pool. */
  weekend?: boolean;
  /** What this hand moved the player's trophies by. 0 when nothing is at stake. */
  trophyChange: number;
  /** The player's trophies AFTER the change, or null when they have no rank. */
  trophiesAfter?: number | null;
  /** Coins this hand paid. */
  coins: number;
  /** The balance after they landed. */
  balance: number;
  /** The names on the winning side, for the line under the headline. */
  winnerNames?: string[];
  /** Starts another hand in the same mode. Omit to show a link instead. */
  onPlayAgain?: () => void;
  playAgainHref?: string;
}

export function MindiResultScreen({
  outcome, myTeam, tenCaptures, numPlayers, totalTricks, modeLabel, weekend = false,
  trophyChange, trophiesAfter = null, coins, balance, winnerNames = [],
  onPlayAgain, playAgainHref = "/play",
}: MindiResultScreenProps) {
  const youWon = outcome.winner === myTeam;
  const theirTeam: Team = myTeam === "A" ? "B" : "A";
  const myTens = outcome.tensCaptured[myTeam];
  const theirTens = outcome.tensCaptured[theirTeam];
  const myTricks = outcome.tricksWon[myTeam];
  const theirTricks = outcome.tricksWon[theirTeam];

  // The board's replay button restarts the entrance animations. Remounting
  // the animated subtree by key is what actually replays a CSS animation -
  // toggling a class only restarts it if the element is reflowed in between.
  const [take, setTake] = useState(0);

  // Trophies count up to their new total, as the board does.
  const trophies = useTrophyCount(trophiesAfter, trophyChange, take);

  // Order the Tens the way they were taken, so the row reads as the hand
  // played out, and find the one that settled it: the Ten that put the
  // winning side past two, beyond catching. That is the card the board
  // tags with its trick number, and in a 2-2 hand there isn't one - the
  // trick count decided it instead, so nothing is tagged.
  const tens = [...tenCaptures].sort((a, b) => a.trick - b.trick).slice(0, 4);
  const deciderTrick = decidingTrick(tens, outcome.winner);

  const tier = trophies === null ? null : getRankFromTrophies(trophies);
  const index = tier ? TIERS.findIndex((rank) => rank.name === tier) : -1;
  const floor = index >= 0 ? TIERS[index].min : 0;
  const next = index >= 0 ? TIERS[index + 1] : undefined;
  const barW = trophies === null ? 0
    : next ? Math.round(Math.min(1, Math.max(0, (trophies - floor) / (next.min - floor))) * 100)
    : 100;

  return (
    <ArenaStage className="arena-result">
      <ArenaSprite />

      <div className="bg" />
      <div className="stage" aria-hidden="true">
        <div className="table">
          <div className="apron" style={{ transform: "translateZ(-40px)", background: "#07070B" }} />
          <div className="apron" style={{ transform: "translateZ(-30px)", background: "#100F18" }} />
          <div className="apron" style={{ transform: "translateZ(-20px)", background: "#16151F" }} />
          {/* The two violets the board writes inline; scripts/port-board.mjs
              only rewrites stylesheets, so they are mapped by hand to the
              same blues the generated sheet uses. */}
          <div className="apron" style={{ transform: "translateZ(-11px)", background: "#063A40" }} />
          <div className="apron" style={{ transform: "translateZ(-8px)", background: "#00BCC8" }} />
          <div className="felt" />
          <div className="rail" />
          <svg className="leds" viewBox="0 0 1200 740">
            <ellipse cx="600" cy="370" rx="533" ry="303" fill="none" stroke="#C6FF33" strokeWidth="5" />
          </svg>
        </div>
      </div>
      <div className="veil" />
      <div className="rays" aria-hidden="true" data-ar-loop />
      <div className="beam" style={{ left: "110px", transform: "rotate(-18deg)" }} />
      <div className="beam" style={{ left: "810px", transform: "rotate(18deg)" }} />
      <i className="mote" style={{ left: "230px", top: "640px", animationDelay: "0s" }} data-ar-loop aria-hidden="true" />
      <i className="mote v" style={{ left: "1180px", top: "600px", animationDelay: "1.4s" }} data-ar-loop aria-hidden="true" />
      <i className="mote" style={{ left: "1100px", top: "420px", animationDelay: "2.8s" }} data-ar-loop aria-hidden="true" />
      <i className="mote v" style={{ left: "300px", top: "380px", animationDelay: "4.1s" }} data-ar-loop aria-hidden="true" />

      <div key={take}>
        <div style={{ position: "absolute", left: 0, right: 0, top: "50px", display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <div className="up" style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap", justifyContent: "center" }}>
            {weekend && <span className="chip live"><i data-ar-loop />Weekend League</span>}
            <span className="lbl">Mindi · {modeLabel} · Hand over</span>
          </div>
          <h1 className="disp" style={{ margin: 0, fontSize: "86px", filter: "drop-shadow(0 0 30px rgba(198,255,51,.18))", textAlign: "center" }}>
            <span className="stamp chrome">{headline(outcome, youWon)}</span>
          </h1>
          <p className="up body" style={{ margin: 0, fontSize: "17px", animationDelay: "1.1s", textAlign: "center" }}>
            {subtitle(outcome, youWon, myTens, theirTens, winnerNames)}
          </p>
        </div>

        {/* The reveal. A hand that ended on a forfeit never played its Tens
            out, so there is nothing to turn over and the row is left out
            rather than filled with blanks. */}
        {tens.length > 0 && (
          <div style={{ position: "absolute", left: 0, right: 0, top: "240px", display: "flex", justifyContent: "center", alignItems: "flex-end", gap: "26px" }}>
            {tens.map((ten, i) => {
              const mine = ten.team === myTeam;
              const tilt = TILTS[i] ?? TILTS[TILTS.length - 1];
              const tag = numPlayers === 2 ? (mine ? "You" : "Them") : (mine ? "Us" : "Them");
              return (
                <div key={ten.suit} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px" }}>
                  <div
                    className={`big ${mine ? "us" : "them"}`}
                    style={{ ["--rot" as string]: tilt.rot, ["--ty" as string]: tilt.ty, animationDelay: tilt.delay }}
                  >
                    <ArenaFace rank="10" suit={ten.suit} ten />
                  </div>
                  <span className={`who ${mine ? "us" : "them"} up`} style={{ animationDelay: `${0.5 + i * 0.1}s` }}>
                    {ten.trick === deciderTrick ? `${tag} · trick ${ten.trick}` : tag}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div
          className="up"
          style={{ position: "absolute", left: "190px", top: "540px", width: "1060px", display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "18px", animationDelay: "1.2s" }}
        >
          <div className="hud stat" style={{ position: "relative" }}>
            <span className="lbl dash">Tens</span>
            <span className="v">{myTens} – {theirTens}</span>
            <span className="s">Tens decide the hand</span>
          </div>
          <div className="hud stat" style={{ position: "relative" }}>
            <span className="lbl dash">Tricks</span>
            <span className="v">{myTricks} – {theirTricks}</span>
            <span className="s">Only counts at 2 Tens each</span>
          </div>
          <div className="hud stat" style={{ position: "relative" }}>
            <span className="lbl dash">Trophies</span>
            <span className="v" style={{ color: trophyChange > 0 ? "#C6FF33" : trophyChange < 0 ? "#FF6B80" : "#fff" }}>
              {trophyChange === 0 ? "—" : `${trophyChange > 0 ? "+" : ""}${trophyChange}`}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
              <div
                className="xp"
                role="progressbar"
                aria-valuenow={barW}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={next ? `Progress to ${next.name}` : "Rank progress"}
              >
                <i style={{ width: `${barW}%` }} />
              </div>
              <span className="s">
                {trophies === null
                  ? "Nothing at stake in this mode"
                  : next
                    ? <>{tier} · {trophies} · {Math.max(0, next.min - trophies)} to {next.name}</>
                    : <>{tier} · {trophies} · top tier</>}
              </span>
            </div>
          </div>
          <div className="hud v stat" style={{ position: "relative" }}>
            <span className="lbl dash">Coins</span>
            <span className="v">+{coins}</span>
            <span className="s">
              {youWon ? "Victory bonus" : "Consolation"} · {balance.toLocaleString()}
            </span>
          </div>
        </div>

        <div
          className="up"
          style={{ position: "absolute", left: 0, right: 0, top: "712px", display: "flex", justifyContent: "center", alignItems: "center", gap: "22px", flexWrap: "wrap", animationDelay: "1.4s" }}
        >
          {onPlayAgain ? (
            <button type="button" className="btn" style={{ width: "250px" }} onClick={onPlayAgain} data-flat>
              <Play aria-hidden="true" />Play again
            </button>
          ) : (
            <Link className="btn" style={{ width: "250px" }} href={playAgainHref} data-flat>
              <Play aria-hidden="true" />Play again
            </Link>
          )}
          <Link className="btn ghost" href="/play" data-flat>
            <Home aria-hidden="true" />Back to lobby
          </Link>
          <button type="button" className="quiet" onClick={() => setTake((n) => n + 1)} data-flat>
            <RotateCcw aria-hidden="true" />Replay the reveal
          </button>
        </div>
      </div>

      <section
        aria-label="How other endings read"
        style={{ position: "absolute", left: "190px", top: "800px", width: "1060px", display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "12px" }}
      >
        {endings(outcome, youWon, myTens, theirTens, totalTricks, trophyChange, weekend).map((end) => (
          <div className={`end ${end.now ? "now" : ""}`.trim()} key={end.title}>
            <b>{end.title}</b>
            <span>{end.body}</span>
          </div>
        ))}
      </section>
    </ArenaStage>
  );
}

/* ── copy ───────────────────────────────────────────────────────────── */

/**
 * The trick on which the hand stopped being in doubt: the one where the
 * winning side took its third Ten, since three of four cannot be caught.
 * Returns 0 for a hand that went to the trick count, where no single Ten
 * decided anything.
 */
function decidingTrick(tens: TenCapture[], winner: Team): number {
  let count = 0;
  for (const ten of tens) {
    if (ten.team !== winner) continue;
    count += 1;
    if (count === 3) return ten.trick;
  }
  return 0;
}

function headline(outcome: HandOutcome, youWon: boolean): string {
  if (outcome.special === "forfeit") return youWon ? "They left the hand" : "You left the hand";
  if (outcome.special === "haasbaga") return youWon ? "Haas Baga" : "Haas Baga against you";
  if (outcome.special === "baga") return youWon ? "Baga" : "Baga against you";
  return youWon ? "You won the hand" : "You lost the hand";
}

function subtitle(
  outcome: HandOutcome, youWon: boolean, myTens: number, theirTens: number, winnerNames: string[]
): string {
  if (outcome.special === "forfeit") {
    return youWon ? "The hand ends there - your opponents left." : "You left the hand, so it goes to them.";
  }
  if (myTens === theirTens) return "Two Tens each, so the trick count decided it.";
  const won = youWon ? myTens : theirTens;
  const who = winnerNames.length > 0 ? joinNames(winnerNames) : youWon ? "You" : "They";
  return `${who} took ${COUNT_WORDS[Math.min(won, 4)]} of the four Tens.`;
}

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The board's five-cell legend, with the cell that actually happened lit.
 * The trophy figure in the last cell is the real one for this pool, not the
 * board's printed -4.
 */
function endings(
  outcome: HandOutcome, youWon: boolean, myTens: number, theirTens: number,
  totalTricks: number, trophyChange: number, weekend: boolean
) {
  const tie = myTens === theirTens;
  // What losing this hand costs, in this pool. The board prints -4, which is
  // only true in the Weekend League; a plain ranked hand costs -2 and a
  // casual or offline one costs nothing at all.
  const lossLine = trophyChange === 0
    ? "No trophies at stake here"
    : `−${Math.abs(trophyChange)} trophies${weekend ? " this weekend" : ""}`;
  return [
    {
      title: "Won",
      body: tie ? "More Tens than them" : `More Tens: ${Math.max(myTens, theirTens)} to ${Math.min(myTens, theirTens)}`,
      now: youWon && !tie && !outcome.special,
    },
    { title: "Won on tricks", body: "2 Tens each; tricks decide", now: youWon && tie },
    { title: "Baga", body: "All four Tens", now: outcome.special === "baga" },
    { title: "Haas Baga", body: `Four Tens and all ${totalTricks} tricks`, now: outcome.special === "haasbaga" },
    { title: "Lost", body: lossLine, now: !youWon },
  ];
}

/* ── the trophy counter ─────────────────────────────────────────────── */

/**
 * Counts from the total before this hand up to the total after it, starting
 * 1.5s in at 90ms a step - the board's timing. Returns null when the player
 * has no trophies to count (a casual or offline hand).
 */
function useTrophyCount(after: number | null, change: number, take: number): number | null {
  const before = after === null ? null : Math.max(0, after - change);
  const [value, setValue] = useState(before);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (after === null || before === null || after === before) {
      setValue(after);
      return;
    }
    setValue(before);
    const step = after > before ? 1 : -1;
    const steps = Math.abs(after - before);
    for (let i = 1; i <= steps; i++) {
      timers.current.push(setTimeout(() => setValue(before + step * i), 1500 + i * 90));
    }
    const running = timers.current;
    return () => running.forEach(clearTimeout);
  }, [after, before, take]);

  return value;
}
