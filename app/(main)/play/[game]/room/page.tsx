export function generateStaticParams() {
  return [{ game: "mindi" }, { game: "gin-rummy" }];
}

import { Suspense } from "react";
import { RoomLobbyClient } from "@/components/game/RoomLobbyClient";

export default function RoomPage({ params }: { params: { game: string } }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
          <p className="text-[rgb(var(--c4))] text-sm">Loading…</p>
        </div>
      }
    >
      <RoomLobbyClient gameId={params.game} />
    </Suspense>
  );
}
