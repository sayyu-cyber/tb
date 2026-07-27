export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

import { Suspense } from "react";
import { RankedLiveClient } from "@/components/game/RankedLiveClient";

// Reuses RankedLiveClient as-is - it just watches a match by id and renders
// the right game client, with no Ranked-specific logic of its own (the
// on-screen "Ranked"/"Casual"/"Weekend League" label comes from the match
// document's own `pool` field, read inside MindiOnlineClient /
// GinRummyOnlineClient).
export default function CasualOnlineLivePage({ params }: { params: { game: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
          <p className="text-[rgb(var(--c4))] text-sm">Loading match…</p>
        </div>
      }
    >
      <RankedLiveClient gameId={params.game} />
    </Suspense>
  );
}
