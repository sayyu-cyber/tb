"use client";
import Link from "next/link";
import { Play, Flame, ArrowUpRight } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRankLock } from "@/hooks/useRankLock";
import { useTranslation } from "@/hooks/useTranslation";
import { LobbyPhoto } from "./LobbyPhoto";

export function HomeLobbyHero() {
  const { state } = useEconomy();
  const { user } = useAuth();
  const { isWeekendLeague } = useRankLock();
  const t = useTranslation();
  const username = user?.displayName || state.profile.displayName || "Player";
  return (
    <section className="lobby-scene">
      <LobbyPhoto className="absolute inset-0" />
      <div className="lobby-scene-content">
        <p className="lobby-eyebrow">{t("home_heroCategory")}</p>
        <h1>Thaasbai<span className="text-[rgb(var(--lagoon))]">.</span></h1>
        <p className="mt-3 text-sm font-semibold text-white/90 break-words">{t("home_welcomeBack").replace("{name}", username)}</p>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/65">{t("home_heroTagline")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/play" className="game-primary-action"><Play size={17} fill="currentColor" />{t("gamesel_startButton")}</Link>
          <Link href="/friends" className="game-secondary-action">{t("nav_friends")}<ArrowUpRight size={16} /></Link>
        </div>
      </div>
      <Link href="/tournament" className="lobby-event-link">
        <Flame size={18} className="text-[rgb(var(--coral))]" />
        <span className="flex-1 text-xs font-semibold">{t("home_weekendLeagueTitle")}</span>
        {isWeekendLeague && <span className="text-[10px] font-bold text-[rgb(var(--coral))]">{t("home_heroBadgeLive")}</span>}
        <ArrowUpRight size={15} />
      </Link>
    </section>
  );
}
