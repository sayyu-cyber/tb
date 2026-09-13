"use client";

import { GameSelectCard } from "@/components/game/GameSelectCard";
import { PlayLobbyHero } from "@/components/home/PlayLobbyHero";
import { WeekendLeague } from "@/components/home/WeekendLeague";
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
  return (
    <div className="play-lobby">
        <PlayLobbyHero />

      <div>
        {/* Stacked on mobile as before; side by side from md, where the
            shell is wide enough for two full cards. */}
        <div className="play-game-grid">
          {games.map((game, index) => (
            <GameSelectCard key={game.id} {...game} index={index} />
          ))}
        </div>
      </div>

      <WeekendLeague variant="play" />
    </div>
  );
}
