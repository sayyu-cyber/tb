"use client";

import { Suspense } from "react";
import { PlayerProfileClient } from "@/components/game/PlayerProfileClient";
import { useTranslation } from "@/hooks/useTranslation";

export default function PlayerProfilePage() {
  const t = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
          <p className="text-[rgb(var(--c4))] text-sm">{t("loading_profile")}</p>
        </div>
      }
    >
      <PlayerProfileClient />
    </Suspense>
  );
}
