"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Sparkles, Play } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { WeekendLeague } from "@/components/home/WeekendLeague";
import { CardFan } from "@/components/game/PlayingCard";
import { TOKEN } from "@/constants/theme";
import { riseIn, staggerParent } from "@/lib/motion";

/**
 * Only the two games that actually exist. The reference mockup also showed
 * "Dhivehi 21" and "Raiveri", which have no rules engine or backend in this
 * app - listing them here would be a dead link dressed up as a feature.
 */
const GAMES = [
  { id: "mindi", name: "Mindi", subtitle: "Maldivian Classic", accent: TOKEN.lagoon },
  { id: "gin-rummy", name: "Gin Rummy", subtitle: "Strategic Fun", accent: TOKEN.deep },
] as const;

/**
 * Desktop-only right rail: Season Progress (the existing WeekendLeague
 * countdown card, unchanged) stacked above a Quick Play list. Self-gates by
 * pathname exactly like SideNav - only Home and Play want this column, and
 * mounting it centrally in MainLayout means neither page has to know it
 * exists.
 *
 * Deliberately has no "X players online" stat: the reference mockup shows
 * one, but nothing in this app counts concurrent players, so a number here
 * would be fabricated.
 */
export function RightRail() {
  const pathname = usePathname();
  const { isGuest } = useAuth();
  const t = useTranslation();

  const path = pathname?.replace(/\/$/, "");
  if (path !== "/home" && path !== "/play") return null;

  return (
    <aside className="hidden xl:flex xl:flex-col xl:w-72 shrink-0 sticky top-0 h-screen overflow-y-auto border-l border-[rgb(var(--c3))] px-4 py-5 gap-5">
      <WeekendLeague />

      <div>
        <div className="mb-3 flex items-center gap-2 px-1">
          <Sparkles size={15} className="text-[rgb(var(--gold-ink))]" aria-hidden="true" />
          <h3 className="text-sm font-bold tracking-tight text-[rgb(var(--text-primary))]">{t("home_quickPlay")}</h3>
        </div>

        <motion.div variants={staggerParent(0.06)} initial="hidden" animate="show" className="flex flex-col gap-3">
          {GAMES.map((game) => (
            <motion.div
              key={game.id}
              variants={riseIn}
              style={{ ["--accent" as string]: game.accent } as React.CSSProperties}
              className="surface-accent edge-light rounded-2xl p-3 flex items-center gap-3"
            >
              <div className="shrink-0 pl-1">
                <CardFan count={3} size="xs" hideOverflowCount />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-bold text-[rgb(var(--text-primary))] truncate">{game.name}</h4>
                <p className="text-[10px] text-[rgb(var(--c4))] truncate">{game.subtitle}</p>
              </div>
              <Link
                href={`/play/${game.id}/casual/${isGuest ? "ai" : "online"}`}
                className="shrink-0 flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold
                           bg-gradient-to-b from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))]
                           text-[#0C0E12] shadow-[0_2px_10px_-2px_rgb(var(--gold)/50%)]"
              >
                <Play size={12} fill="#0C0E12" aria-hidden="true" />
                {t("nav_play")}
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </aside>
  );
}
