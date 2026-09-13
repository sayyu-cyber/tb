"use client";
import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { GameDeckArt } from "@/components/game/GameDeckArt";
import { LoadoutPreview } from "./LoadoutPreview";

const games = [
  { id: "mindi", name: "Mindi", accent: "var(--lagoon)", players: "2-4" },
  { id: "gin-rummy", name: "Gin Rummy", accent: "var(--coral)", players: "2" },
];
export function QuickPlayButtons() {
  const { isGuest } = useAuth();
  const { state } = useEconomy();
  const t = useTranslation();
  const [mode, setMode] = useState("all");
  return (
    <section className="home-quick-play">
      <div className="game-section-heading">
        <div><h2>{t("home_quickPlay")}</h2><p>Jump into a game or choose your mode.</p></div>
        <label className="home-mode-filter"><span>Select Mode</span><select value={mode} onChange={event => setMode(event.target.value)} aria-label="Select quick play mode"><option value="all">All Modes</option><option value="ai">Vs AI</option><option value="passplay">Pass & Play</option>{!isGuest && <option value="online">Online</option>}</select></label>
      </div>
      <div className="home-quick-grid">
        {games.map(game => (
          <Link key={game.id} href={`/play/${game.id}/casual/${mode === "all" || (isGuest && mode === "online") ? (isGuest ? "ai" : "online") : mode}`} className="game-cover group" style={{ "--accent": game.accent } as React.CSSProperties}>
            <div className="game-cover-art"><span className="mode-ribbon">{t("gamesel_casualMode")}</span><GameDeckArt game={game.id} cardBackId={state.profile.equipped.cardBack} /></div>
            <div className="game-cover-bottom">
              <div className="min-w-0"><h3>{game.name}</h3><span className="mt-1 flex items-center gap-1.5 text-xs text-[rgb(var(--c4))]"><Users size={12} />{game.players} / {mode === "ai" ? "Vs AI" : mode === "passplay" ? "Pass & Play" : t("gamesel_casualMode")}</span></div>
              <span className="game-play-icon"><ArrowUpRight size={20} /></span>
            </div>
          </Link>
        ))}
        <LoadoutPreview compact />
      </div>
    </section>
  );
}
