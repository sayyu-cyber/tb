import { Suspense } from "react";
import { RankedDuoClient } from "@/components/game/RankedDuoClient";
import { LoadingScreen } from "@/components/layout/LoadingScreen";

// Must stay a SERVER component - see the note in the ranked/live page: a
// client component cannot export generateStaticParams().
export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

export default function RankedDuoPage({ params }: { params: { game: string } }) {
  return (
    <Suspense fallback={<LoadingScreen labelKey="rankedduo_loadingParty" />}>
      <RankedDuoClient gameId={params.game} />
    </Suspense>
  );
}
