"use client";

import { useState } from "react";
import { ArenaSprite } from "@/components/game/ArenaSprite";
import { ArenaHomeHero } from "@/components/home/arena/ArenaHomeHero";
import { ArenaLockBar, ArenaStatsStrip } from "@/components/home/arena/ArenaHomeStats";
import { ArenaQuickPlay } from "@/components/home/arena/ArenaQuickPlay";
import {
  ArenaRankCard, ArenaLeagueCard, ArenaShortcuts, ArenaUpdates, ArenaHomeFooter,
} from "@/components/home/arena/ArenaHomeLower";
import { PhoneHome } from "@/components/home/phone/PhoneHome";

/**
 * Home — design/arena/screens/app/app-01-home.jpg, from the Home board.
 *
 * `arena-home` is the namespace the board's own CSS was ported under
 * (styles/arena-home.css); the shell already carries `arena-app` for the
 * shared pieces. The column is the board's: a 22px gap between sections,
 * in the board's order.
 *
 * ArenaSprite mounts the suit symbols the fanned cards reference. It is a
 * <defs>-only SVG, so it takes no space.
 *
 * TWO COMPOSITIONS, ONE PAGE. Held upright a phone gets MHome
 * (design/arena/boards/MHome.dc.html): the same ten sections in the same
 * order, recomposed for 390px. Both are in the DOM and CSS decides which is
 * on screen (`.portrait-view` / `.landscape-view` in
 * styles/arena-phone-shell.css), so there is no breakpoint in JavaScript and
 * no flash of the wrong one. Everything either draws reads the same hooks,
 * so the two cannot disagree about the same player.
 */
export default function HomePage() {
  // The board draws a static "All Modes" select. The app has a casual and a
  // ranked pool per game, so the choice is real and changes where the two
  // covers send you.
  const [mode, setMode] = useState<"casual" | "ranked">("casual");

  return (
    <>
      <ArenaSprite />
      <div className="landscape-view">
        <div className="arena-home ar-page" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
          <ArenaHomeHero />
          <ArenaLockBar />
          <ArenaStatsStrip />
          <ArenaQuickPlay mode={mode} onMode={setMode} />
          <section className="lower">
            <ArenaRankCard />
            <ArenaLeagueCard />
            <ArenaShortcuts />
          </section>
          <ArenaUpdates />
          <ArenaHomeFooter />
        </div>
      </div>
      <div className="portrait-view">
        <PhoneHome mode={mode} onMode={setMode} />
      </div>
    </>
  );
}
