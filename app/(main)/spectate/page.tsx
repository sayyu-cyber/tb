"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpectateClient } from "@/components/game/SpectateClient";

function SpectatePageInner() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("m");

  if (!matchId) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center px-6 text-center">
        <p className="text-[rgb(var(--c4))] text-sm">No match specified.</p>
      </div>
    );
  }
  return <SpectateClient matchId={matchId} />;
}

export default function SpectatePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
          <p className="text-[rgb(var(--c4))] text-sm">Loading…</p>
        </div>
      }
    >
      <SpectatePageInner />
    </Suspense>
  );
}
