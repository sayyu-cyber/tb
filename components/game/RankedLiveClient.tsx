"use client";

import { useSearchParams } from "next/navigation";
import { MindiOnlineClient } from "@/components/game/MindiOnlineClient";
import { GinRummyOnlineClient } from "@/components/game/GinRummyOnlineClient";
import { useTranslation } from "@/hooks/useTranslation";

export function RankedLiveClient({ gameId }: { gameId: string }) {
  const t = useTranslation();
  const searchParams = useSearchParams();
  const matchId = searchParams.get("m");

  if (!matchId) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center px-6 text-center">
        <p className="text-[rgb(var(--c4))] text-sm">{t("empty_noMatchFound")}</p>
      </div>
    );
  }

  if (gameId === "mindi") return <MindiOnlineClient matchId={matchId} />;
  return <GinRummyOnlineClient matchId={matchId} />;
}
