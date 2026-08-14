import { Suspense } from "react";
import { RankedLiveClient } from "@/components/game/RankedLiveClient";
import { LoadingScreen } from "@/components/layout/LoadingScreen";

// Must stay a SERVER component - see the note in the ranked/live page: a
// client component cannot export generateStaticParams().
export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

// Reuses RankedLiveClient as-is - it just watches a match by id and renders
// the right game client, with no Ranked-specific logic of its own (the
// on-screen "Ranked"/"Casual"/"Weekend League" label comes from the match
// document's own `pool` field, read inside MindiOnlineClient /
// GinRummyOnlineClient).
export default function CasualOnlineLivePage({ params }: { params: { game: string } }) {
  return (
    <Suspense fallback={<LoadingScreen labelKey="common_loadingMatch" />}>
      <RankedLiveClient gameId={params.game} />
    </Suspense>
  );
}
