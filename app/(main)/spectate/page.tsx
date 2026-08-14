"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SpectateClient } from "@/components/game/SpectateClient";
import { useTranslation } from "@/hooks/useTranslation";

function SpectatePageInner() {
  const searchParams = useSearchParams();
  const matchId = searchParams.get("m");
  const t = useTranslation();

  if (!matchId) {
    return (
      <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center px-6 text-center">
        <p className="text-[rgb(var(--c4))] text-sm">{t("empty_noMatchSpecified")}</p>
      </div>
    );
  }
  return <SpectateClient matchId={matchId} />;
}

export default function SpectatePage() {
  const t = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
          <p className="text-[rgb(var(--c4))] text-sm">{t("error_loading")}</p>
        </div>
      }
    >
      <SpectatePageInner />
    </Suspense>
  );
}
