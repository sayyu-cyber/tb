"use client";
import Link from "next/link";
import { ArrowUpRight, Play, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { GameDeckArt } from "@/components/game/GameDeckArt";

const games = [
  { id: "mindi", name: "Mindi", accent: "var(--lagoon)", players: "2-4" },
  { id: "gin-rummy", name: "Gin Rummy", accent: "var(--coral)", players: "2" },
];
export function QuickPlayButtons() {
  const { isGuest } = useAuth();
  const { state } = useEconomy();
  const t = useTranslation();
  return (
    <section>
      <div className="game-section-heading">
        <h2>{t("home_quickPlay")}</h2>
        <Link href="/play">{t("gamesel_selectMode")}<ArrowUpRight size={14} /></Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {games.map(game => (
          <Link key={game.id} href={`/play/${game.id}/casual/${isGuest ? "ai" : "online"}`} className="game-cover group" style={{ "--accent": game.accent } as React.CSSProperties}>
            <div className="game-cover-art"><GameDeckArt game={game.id} cardBackId={state.profile.equipped.cardBack} /></div>
            <div className="game-cover-bottom">
              <div className="min-w-0"><h3>{game.name}</h3><span className="mt-1 flex items-center gap-1.5 text-xs text-[rgb(var(--c4))]"><Users size={12} />{game.players} / {t("gamesel_casualMode")}</span></div>
              <span className="game-play-icon"><Play size={19} fill="currentColor" /></span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
