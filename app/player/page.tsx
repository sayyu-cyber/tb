import { Suspense } from "react";
import { PlayerProfileClient } from "@/components/game/PlayerProfileClient";

export default function PlayerProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
          <p className="text-[#3A3A3A] text-sm">Loading profile…</p>
        </div>
      }
    >
      <PlayerProfileClient />
    </Suspense>
  );
}
