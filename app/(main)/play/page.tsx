"use client";

import { motion } from "framer-motion";
import { GameSelectCard } from "@/components/game/GameSelectCard";
import { PlayLobbyHero } from "@/components/home/PlayLobbyHero";
import { WeekendLeague } from "@/components/home/WeekendLeague";
import { useTranslation } from "@/hooks/useTranslation";
import { TOKEN } from "@/constants/theme";

// Both games used to render in identical gold, which made the two headline
// modes of the whole app visually interchangeable. Each now owns a hue and
// a suit from the palette (see constants/theme.ts).
const games = [
  {
    id: "mindi",
    name: "Mindi",
    description: "The classic Maldivian card game. Outsmart your opponents with strategy and skill.",
    icon: "♠",
    color: TOKEN.lagoon,
    players: "2-4 Players",
  },
  {
    id: "gin-rummy",
    name: "Gin Rummy",
    description: "Form sets and runs to declare Gin. A timeless card game of skill and luck.",
    icon: "♦",
    color: TOKEN.coral,
    players: "2 Players",
  },
];

export default function PlayPage() {
  const t = useTranslation();
  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <PlayLobbyHero />
      </motion.div>

      <div>
        <h2 className="text-[rgb(var(--c4))] text-[11px] font-bold uppercase tracking-widest mb-3 px-1">
          {t("play_subtitle")}
        </h2>
        {/* Stacked on mobile as before; side by side from md, where the
            shell is wide enough for two full cards. */}
        <div className="space-y-5 md:space-y-0 md:grid md:grid-cols-2 md:gap-5 md:items-start">
          {games.map((game, index) => (
            <GameSelectCard key={game.id} {...game} index={index} />
          ))}
        </div>
      </div>

      <WeekendLeague />
    </div>
  );
}
