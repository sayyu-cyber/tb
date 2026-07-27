export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

import { Suspense } from "react";
import { RankedLiveClient } from "@/components/game/RankedLiveClient";

export default function RankedLivePage({ params }: { params: { game: string } }) {
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
