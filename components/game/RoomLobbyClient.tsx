"use client";

import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PrivateRoomSetup } from "./PrivateRoomSetup";
import { RoomWaitingRoom } from "./RoomWaitingRoom";
import { GameType } from "@/lib/matchmaking";
import { dealMindiHand, openMindiHand, openMindiHandFFA1v1 } from "@/lib/mindiEngine";
import { dealGinHand } from "@/lib/ginRummyEngine";
import { cutForFirstPlay } from "@/lib/openingCut";
import type { MindiOnlineState } from "@/components/game/MindiOnlineClient";
import type { GinOnlineState } from "@/components/game/GinRummyOnlineClient";

function gameTypeFor(gameId: string): GameType {
  return gameId === "mindi" ? "mindi" : "gin_rummy";
}

export function buildInitialState(
  gameType: GameType,
  players: string[],
  mindiMode: "team2v2" | "ffa1v1" = "team2v2"
): MindiOnlineState | GinOnlineState {
  if (gameType === "mindi") {
    if (mindiMode === "ffa1v1") {
      // Two-seat draw for the 1v1 variant, then deal - see openMindiHandFFA1v1.
      const { deal, draw } = openMindiHandFFA1v1(1);
      return {
        handsByUid: { [players[0]]: deal.hands[0], [players[1]]: deal.hands[1] },
        firstDraw: draw,
        trumpSuit: deal.trumpSuit,
        turnSeat: deal.leader,
        trick: [],
        tensCaptured: { A: 0, B: 0 },
        tricksWon: { A: 0, B: 0 },
        tricksPlayed: 0,
        outcome: null,
        numPlayers: 2,
      };
    }
    const { deal, draw } = openMindiHand(3);
    const handsByUid: Record<string, ReturnType<typeof dealMindiHand>["hands"][0]> = {};
    for (let seat = 0; seat < 4; seat++) handsByUid[players[seat]] = deal.hands[seat as 0 | 1 | 2 | 3];
    return {
      handsByUid,
      firstDraw: draw,
      trumpSuit: deal.trumpSuit,
      turnSeat: deal.leader,
      trick: [],
      tensCaptured: { A: 0, B: 0 },
      tricksWon: { A: 0, B: 0 },
      tricksPlayed: 0,
      outcome: null,
      numPlayers: 4,
    };
  }
  // Cut for first play before dealing, exactly as Mindi does. The cut is
  // stored so both clients replay the same ceremony, and its winner takes the
  // opening turn rather than it always falling to players[0].
  const cut = cutForFirstPlay<string>([players[0], players[1]]);
  const deal = dealGinHand();
  return {
    hands: { [players[0]]: deal.playerHand, [players[1]]: deal.opponentHand },
    stock: deal.stock,
    discard: deal.discard,
    turn: cut.winner,
    phase: "draw",
    firstCut: cut,
    turnDeadline: null,
    result: null,
  };
}

export function RoomLobbyClient({ gameId }: { gameId: string }) {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const gameType = gameTypeFor(gameId);
  const code = searchParams.get("code");

  if (!code) {
    return <PrivateRoomSetup gameId={gameId} />;
  }
  return <RoomWaitingRoom gameId={gameId} gameType={gameType} code={code} myUid={user?.uid ?? ""} buildInitialState={buildInitialState} />;
}
