export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

import { CasualOnlineClient } from "@/components/game/CasualOnlineClient";

export default function CasualOnlinePage({ params }: { params: { game: string } }) {
  return <CasualOnlineClient gameId={params.game} />;
}
