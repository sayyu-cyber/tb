import { PassPlayClient } from "@/components/game/PassPlayClient";
import { MindiGameClient } from "@/components/game/MindiGameClient";

export function generateStaticParams() {
  return [
    { game: "mindi" },
    { game: "gin-rummy" },
  ];
}

export default function PassPlayPage({ params }: { params: { game: string } }) {
  if (params.game === "mindi") {
    return <MindiGameClient mode="passplay" />;
  }
  // gin-rummy still uses the placeholder mini-game pending real Gin Rummy rules.
  return <PassPlayClient gameId={params.game} />;
}
