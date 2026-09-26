"use client";

import { useState } from "react";
import { ArenaSprite } from "@/components/game/ArenaSprite";
import { ArenaHomeHero } from "@/components/home/arena/ArenaHomeHero";
import { ArenaLockBar, ArenaStatsStrip } from "@/components/home/arena/ArenaHomeStats";
import { ArenaQuickPlay } from "@/components/home/arena/ArenaQuickPlay";
import {
  ArenaRankCard, ArenaLeagueCard, ArenaShortcuts, ArenaUpdates, ArenaHomeFooter,
} from "@/components/home/arena/ArenaHomeLower";

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
 */
export default function HomePage() {
  // The board draws a static "All Modes" select. The app has a casual and a
  // ranked pool per game, so the choice is real and changes where the two
  // covers send you.
  const [mode, setMode] = useState<"casual" | "ranked">("casual");

  return (
    <div className="arena-home ar-page" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <ArenaSprite />
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
  );
}
