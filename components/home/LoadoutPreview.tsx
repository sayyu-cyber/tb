"use client";
import Link from "next/link";
import { ArrowUpRight, Package, Check } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { GameDeckArt } from "@/components/game/GameDeckArt";
import { TABLE_THEME_STYLES } from "@/components/game/GameArena";
import { ALL_COSMETICS } from "@/data/cosmetics";

export function LoadoutPreview({ compact = false }: { compact?: boolean }) {
  const { state } = useEconomy();
  const t = useTranslation();
  const { tableTheme, cardBack } = state.profile.equipped;
  const theme = TABLE_THEME_STYLES[tableTheme] ?? TABLE_THEME_STYLES.tt_default;
  const cardName = ALL_COSMETICS.find(item => item.id === cardBack)?.name;
  const tableName = ALL_COSMETICS.find(item => item.id === tableTheme)?.name;
  return (
    <section className={compact ? "home-featured-loadout" : undefined}>
      {!compact && <div className="game-section-heading"><h2>{t("home_shortcutInventory")}</h2><Package size={16} className="text-[rgb(var(--lagoon))]" /></div>}
      <Link href="/inventory" className="loadout-preview group">
        <span className="loadout-equipped"><Check size={12} />{compact ? "EQUIPPED" : t("home_shortcutInventory")}</span>
        <div className="loadout-table" style={{ backgroundColor: theme.base, backgroundImage: theme.pattern, borderColor: theme.glow, boxShadow: `inset 0 0 35px ${theme.glow}30, 0 12px 0 #080b0c, 0 22px 25px #0006` }} />
        <GameDeckArt cardBackId={cardBack} />
        <div className="loadout-caption relative flex items-center justify-between gap-2 px-4 pb-4"><span className="min-w-0"><strong className="block text-sm text-[rgb(var(--c5))] truncate">{cardName || "Classic Cards"}</strong><span className="block mt-1 text-xs text-[rgb(var(--c4))] truncate">{tableName || "Classic Table"}</span></span><ArrowUpRight size={17} /></div>
      </Link>
    </section>
  );
}
