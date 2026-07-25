"use client";

import { useSearchParams } from "next/navigation";
import { MindiOnlineClient } from "@/components/game/MindiOnlineClient";
import { GinRummyOnlineClient } from "@/components/game/GinRummyOnlineClient";

export function RankedLiveClient({ gameId }: { gameId: string }) {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("m");

  if (!matchId) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center px-6 text-center">
        <p className="text-[#3A3A3A] text-sm">No match found. Go back to Play and search again.</p>
      </div>
    );
  }

  if (gameId === "mindi") return <MindiOnlineClient matchId={matchId} />;
  return <GinRummyOnlineClient matchId={matchId} />;
}
