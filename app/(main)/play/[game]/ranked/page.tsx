export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

import { RankedQueueClient } from "@/components/game/RankedQueueClient";

export default function RankedPage({ params }: { params: { game: string } }) {
  return <RankedQueueClient gameId={params.game} />;
}
