"use client";
import { useState } from "react";
import Link from "next/link";
import { Users, Trophy, Lock, Bot, Smartphone, Globe, ChevronRight, Check, Play, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useRankLock } from "@/hooks/useRankLock";
import { GameDeckArt } from "./GameDeckArt";

interface GameSelectCardProps {
  id: string; name: string; description: string; icon: string;
  color: string; players: string; index: number;
}
const modes = [
  { id: "online", label: "Casual", detail: "Quick & fun", Icon: Trophy },
  { id: "ai", label: "Vs AI", detail: "Practice mode", Icon: Bot },
  { id: "passplay", label: "Pass & Play", detail: "Local multiplayer", Icon: Smartphone },
] as const;

export function GameSelectCard({ id, name, description, icon, color, players }: GameSelectCardProps) {
  const [mode, setMode] = useState<typeof modes[number]["id"]>("online");
  const { state } = useEconomy();
  const { isGuest } = useAuth();
  const { isWeekendLeague } = useRankLock();
  const t = useTranslation();
  const online = mode === "online";
  return (
    <article className={`play-game play-game-${id}`} style={{ "--accent": color } as React.CSSProperties} aria-labelledby={`${id}-title`}>
      <div className="play-game-cover">
        <span className="play-player-count"><Users size={15} />{players}</span>
        <div className="play-game-intro">
          <span className="play-suit" aria-hidden="true">{icon}</span>
          <div><h2 id={`${id}-title`}>{name}</h2><p>{description}</p></div>
        </div>
        <div className="play-deck"><GameDeckArt game={id} cardBackId={state.profile.equipped.cardBack} /></div>
      </div>
      <div className="play-game-controls">
        <div className="play-mode-selector" role="group" aria-label={`${name} casual mode`}>
          {modes.map(({ id: value, label, detail, Icon }) => (
            <button key={value} type="button" aria-pressed={mode === value} onClick={() => setMode(value)}>
              <Icon size={22} aria-hidden="true" /><span><strong>{label}</strong><small>{detail}</small></span>
              {mode === value && <Check size={12} className="play-mode-check" aria-hidden="true" />}
            </button>
          ))}
        </div>
        <Link className="play-launch" href={online && isGuest ? "/login" : `/play/${id}/casual/${mode}`}>
          {online ? <Globe size={18} /> : <Play size={18} />}
          <span>{online ? (isGuest ? "Sign in to play online" : "Online") : mode === "ai" ? "Play vs AI" : "Start Pass & Play"}
            {online && id === "mindi" && !isGuest && <small>Auto-teamed, no partner needed</small>}
          </span><ChevronRight size={18} />
        </Link>
        <div className="play-mode-heading"><Crown size={15} /><span>{t("gamesel_rankedMode")}</span>{isWeekendLeague && <span className="play-event-tag">Weekend League</span>}</div>
        {isGuest ? <div className="play-restricted"><Lock size={16} /><span>{t("gamesel_signInRanked")}</span></div> : <>
          <Link className="play-ranked" href={`/play/${id}/${id === "mindi" ? "ranked-duo" : "ranked"}`}><Trophy size={19} /><span>{id === "mindi" ? t("gamesel_playRankedDuo") : t("gamesel_ranked1v1")}</span><ChevronRight size={19} /></Link>
          {id !== "mindi" && <Link className="play-duo" href={`/play/${id}/ranked-duo`}><Users size={14} />{t("gamesel_ranked2v2")}<ChevronRight size={14} /></Link>}
        </>}
        <div className="play-private">
          <div className="play-mode-heading"><Lock size={14} /><span>{t("gamesel_playWithFriends")}</span></div>
          {isGuest ? <div className="play-restricted"><Lock size={16} /><span>{t("gamesel_signInPrivateRooms")}</span></div> : <Link className="play-room" href={`/play/${id}/room`}><Lock size={17} /><span>{t("gamesel_privateRoom")}</span><ChevronRight size={18} /></Link>}
        </div>
      </div>
    </article>
  );
}
