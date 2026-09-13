"use client";
import Link from "next/link";
import { Play, Trophy, Users, ArrowUpRight } from "lucide-react";
import { useRankLock } from "@/hooks/useRankLock";
import { useTranslation } from "@/hooks/useTranslation";
import { LobbyPhoto } from "./LobbyPhoto";

export function HomeLobbyHero() {
  const { isWeekendLeague } = useRankLock();
  const t = useTranslation();
  return (
    <section className="lobby-scene">
      <LobbyPhoto className="absolute inset-0" />
      <div className="lobby-scene-content">
        <p className="lobby-eyebrow">{t("home_heroCategory")}</p>
        <h1>Thaasbai<span className="text-[rgb(var(--gold))]">.</span></h1>
        <p className="mt-3 text-sm font-semibold text-white/90 break-words">Mindi. Gin Rummy. Real Players. Higher Ranks.</p>
        <p className="mt-2 text-sm leading-relaxed text-white/65">Play. Compete. Make Friends. Climb the Ranks.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/play" className="game-primary-action"><Play size={17} fill="currentColor" />Play Now</Link>
          <Link href="/friends" className="game-secondary-action"><Users size={16} />Find Friends</Link>
        </div>
      </div>
      <Link href="/tournament" className="lobby-event-link">
        <Trophy size={30} className="text-[rgb(var(--gold))]" />
        <span className="flex-1 text-xs font-semibold">{t("home_weekendLeagueTitle")}<small className="block mt-1 font-normal text-white/70">Compete this weekend for double trophies.</small></span>
        {isWeekendLeague && <span className="text-[10px] font-bold text-[rgb(var(--coral))]">{t("home_heroBadgeLive")}</span>}
        <ArrowUpRight size={15} />
      </Link>
    </section>
  );
}
