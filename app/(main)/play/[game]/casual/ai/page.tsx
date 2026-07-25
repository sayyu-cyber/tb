import { AIGameClient } from "@/components/game/AIGameClient";
import { MindiGameClient } from "@/components/game/MindiGameClient";

export function generateStaticParams() {
  return [
    { game: "mindi" },
    { game: "gin-rummy" },
  ];
}

export default function AIGamePage({ params }: { params: { game: string } }) {
  if (params.game === "mindi") {
    return <MindiGameClient mode="ai" />;
  }
  // gin-rummy still uses the placeholder mini-game pending real Gin Rummy rules.
  return <AIGameClient gameId={params.game} />;
}
