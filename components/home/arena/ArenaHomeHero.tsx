"use client";

import Link from "next/link";
import { Gamepad2, Users, Trophy, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRankLock } from "@/hooks/useRankLock";
import { ArenaFace } from "@/components/game/ArenaCard";
import { Pill } from "@/components/arena";

/**
 * The Home hero (design/arena/screens/app/app-01-home.jpg, top).
 *
 * A 340px panel: the word MINDI ghosted behind, a lime LED ring on the
 * floor, the four foil Tens fanned above it, the wordmark and the two calls
 * to action on the left, and the Weekend League link in the corner.
 *
 * Values the board wrote as inline styles are inline here too, so they can
 * be read straight off the board rather than chased through a stylesheet.
 * The one thing that could not stay as written is where the ring and the
 * fan sit: the board puts them at left:640 and left:860 inside a hero that
 * is always 1120px wide (1440 minus the 256px sidebar and the page's 64px
 * of padding). Anchored from the RIGHT instead - 40px and 260px - they land
 * in exactly the same place at 1440 and stay together as one piece of art
 * at every other width, instead of drifting apart as the hero narrows.
 * That override is in styles/arena-screens.css.
 */

/** The four Tens, in the board's order and at its angles. */
const FAN = [
  { suit: "C", angle: -27 },
  { suit: "D", angle: -9 },
  { suit: "S", angle: 9 },
  { suit: "H", angle: 27 },
];

export function ArenaHomeHero() {
  const { isGuest } = useAuth();
  const { isWeekendLeague } = useRankLock();
  const playHref = `/play/mindi/casual/${isGuest ? "ai" : "online"}`;

  return (
    <section className="hero" aria-label="Welcome to Thaasbai">
      <div className="word" aria-hidden="true">MINDI</div>

      <div className="ring" aria-hidden="true" />
      <div className="fan" aria-hidden="true">
        {FAN.map(({ suit, angle }) => (
          <div
            key={suit}
            className="cardw"
            style={{ fontSize: "15px", width: "108px", height: "151.2px", ["--a" as string]: `${angle}deg` }}
          >
            <ArenaFace rank="10" suit={suit} ten />
          </div>
        ))}
      </div>

      <div className="hero-copy">
        <span className="lbl dash" style={{ color: "#C6FF33" }}>
          The Home of Maldivian Card Games
        </span>
        <h1 className="disp hero-title" style={{ margin: "14px 0 0", lineHeight: ".86" }}>
          <span className="chrome">Thaasbai</span>
          <span style={{ color: "#C6FF33" }}>.</span>
        </h1>
        <p className="disp" style={{ margin: "16px 0 0", fontSize: "18px", letterSpacing: ".02em", lineHeight: 1.2 }}>
          Mindi. Gin Rummy. Real Players. Higher Ranks.
        </p>
        <p className="body" style={{ margin: "6px 0 0", fontSize: "15px" }}>
          Play. Compete. Make Friends. Climb the Ranks.
        </p>
        <div style={{ display: "flex", gap: "14px", marginTop: "20px", flexWrap: "wrap" }}>
          <Link className="ar-btn sm" href={playHref} style={{ height: "52px", padding: "0 22px", fontSize: "15px" }}>
            <Gamepad2 aria-hidden="true" />
            Play Now
          </Link>
          <Link className="ar-btn ghost sm" href="/friends" style={{ height: "52px", padding: "0 20px", fontSize: "15px" }}>
            <Users aria-hidden="true" />
            Find Friends
          </Link>
        </div>
      </div>

      {/* The board was drawn mid-league, so it shows a Live pill. Outside
          the window the event is still where you go to read the rules and
          see the standings, so the card stays and only the pill and the
          line under it change. */}
      <Link className="event" href="/tournament">
        <span className="ic">
          <Trophy aria-hidden="true" />
        </span>
        <span style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <b className="disp" style={{ fontSize: "16px" }}>Weekend League</b>
            {isWeekendLeague
              ? <Pill tone="lime" live className="event-pill">Live</Pill>
              : <Pill tone="line" className="event-pill">Fri – Sat</Pill>}
          </span>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#C4C4CE" }}>
            {isWeekendLeague
              ? "Compete this weekend for double trophies."
              : "Opens Friday. Double trophies all weekend."}
          </span>
        </span>
        <ArrowUpRight aria-hidden="true" style={{ width: "18px", height: "18px", color: "#C6FF33", flex: "none" }} />
      </Link>
    </section>
  );
}
