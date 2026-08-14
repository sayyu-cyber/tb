import { Suspense } from "react";
import { RankedLiveClient } from "@/components/game/RankedLiveClient";
import { LoadingScreen } from "@/components/layout/LoadingScreen";

// Must stay a SERVER component: a file cannot both be marked "use client"
// and export generateStaticParams(), which output:'export' needs in order
// to pre-render the two [game] values. The translated loading state lives
// in <LoadingScreen>, which is the client component instead.
export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

export default function RankedLivePage({ params }: { params: { game: string } }) {
  return (
    <Suspense fallback={<LoadingScreen labelKey="common_loadingMatch" />}>
      <RankedLiveClient gameId={params.game} />
    </Suspense>
  );
}
