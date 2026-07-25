export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

import { Suspense } from "react";
import { RankedLiveClient } from "@/components/game/RankedLiveClient";

export default function RankedLivePage({ params }: { params: { game: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
          <p className="text-[#3A3A3A] text-sm">Loading match…</p>
        </div>
      }
    >
      <RankedLiveClient gameId={params.game} />
    </Suspense>
  );
}
