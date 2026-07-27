export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

import { Suspense } from "react";
import { RankedDuoClient } from "@/components/game/RankedDuoClient";

export default function RankedDuoPage({ params }: { params: { game: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
          <p className="text-[rgb(var(--c4))] text-sm">Loading party…</p>
        </div>
      }
    >
      <RankedDuoClient gameId={params.game} />
    </Suspense>
  );
}
