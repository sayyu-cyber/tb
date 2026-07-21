import { AIGameClient } from "@/components/game/AIGameClient";

export function generateStaticParams() {
  return [
    { game: "mindi" },
    { game: "gin-rummy" },
  ];
}

export default function AIGamePage({ params }: { params: { game: string } }) {
  return <AIGameClient gameId={params.game} />;
}
