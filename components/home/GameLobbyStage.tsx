"use client";
import { useRef } from "react";
import Link from "next/link";
import { Play, Trophy, Users, ChevronLeft, ChevronRight, KeyRound } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useAuth } from "@/contexts/AuthContext";
import { GameDeckArt } from "@/components/game/GameDeckArt";
import { useTranslation } from "@/hooks/useTranslation";

export function GameLobbyStage() {
  const { state } = useEconomy();
  const { isGuest } = useAuth();
  const t = useTranslation();
  const rail = useRef<HTMLDivElement>(null);
  const move = (direction: number) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>(".lobby-mode");
    el.scrollBy({ left: direction * ((card?.offsetWidth ?? 280) + 24), behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  return <section className="game-lobby-stage" aria-label="Game lobby">
    <div className="lobby-stage-heading"><div><p>THE MALDIVIAN CARD CLUB</p><h1>Thaasbai</h1></div><div className="lobby-carousel-controls"><button onClick={() => move(-1)} aria-label="Previous games" title="Previous games"><ChevronLeft /></button><button onClick={() => move(1)} aria-label="Next games" title="Next games"><ChevronRight /></button></div></div>
    <div ref={rail} className="lobby-mode-rail">
      {([{ id: 'mindi', name: 'Mindi', players: '2-4', color: 'mint' }, { id: 'gin-rummy', name: 'Gin Rummy', players: '2', color: 'rose' }] as const).map(game =>
        <Link key={game.id} href={`/play/${game.id}/casual/${isGuest ? 'ai' : 'online'}`} className={`lobby-mode lobby-mode-${game.color}`}>
          <span className="lobby-mode-ribbon">{t('gamesel_casualMode')}</span><div className="lobby-mode-art"><GameDeckArt game={game.id} cardBackId={state.profile.equipped.cardBack} /></div><h2>{game.name}</h2><span className="lobby-mode-meta"><Users size={14} />{game.players} players</span><span className="lobby-mode-play"><Play size={19} fill="currentColor" />{t('nav_play')}</span>
        </Link>)}
      <Link href="/tournament" className="lobby-mode lobby-mode-gold"><span className="lobby-mode-ribbon">{t('nav_weekend')}</span><div className="lobby-mode-art lobby-trophy-art"><Trophy /></div><h2>Weekend League</h2><span className="lobby-mode-meta">{t('nav_ranked')}</span><span className="lobby-mode-play"><Trophy size={18} />{t('nav_weekend')}</span></Link>
      <Link href="/play/mindi/room" className="lobby-mode lobby-mode-blue"><span className="lobby-mode-ribbon">{t('nav_friends')}</span><div className="lobby-mode-art lobby-trophy-art"><Users /></div><h2>Private Rooms</h2><span className="lobby-mode-meta">Mindi & Gin Rummy</span><span className="lobby-mode-play"><KeyRound size={18} />{t('home_shortcutRooms')}</span></Link>
    </div>
  </section>;
}
