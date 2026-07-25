import { MindiGameClient } from "@/components/game/MindiGameClient";
import { GinRummyGameClient } from "@/components/game/GinRummyGameClient";

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
  return <GinRummyGameClient mode="passplay" />;
}
