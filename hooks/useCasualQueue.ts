"use client";

/**
 * The Casual Online queue, as a hook.
 *
 * This is the matchmaking effect that used to live inside
 * components/game/CasualOnlineClient.tsx, lifted out unchanged so two
 * screens can share it:
 *
 *   - the full-screen queue at /play/<game>/casual/online, which is what
 *     CasualOnlineClient still renders;
 *   - the Play lobby (design/arena/boards/Lobby.dc.html), whose CTA turns
 *     into "Finding a table" with "Tap again to stop looking" under it. The
 *     board queues from the lobby rather than sending you to another
 *     screen, so the lobby needs the same queue without the same UI.
 *
 * Nothing about the matchmaking changed in the move: same joinQueue, same
 * 2.5s tryFormMatch poll, same watchForMatch, same cleanup that leaves the
 * queue if you walk away before a table forms. The only addition is
 * `active` - passing false keeps the hook mounted but out of the queue, so
 * the lobby can start and stop looking without unmounting anything.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { joinQueue, leaveQueue, tryFormMatch, watchForMatch, GameType } from "@/lib/matchmaking";
import { dealMindiHand, openMindiHand } from "@/lib/mindiEngine";
import { dealGinHand } from "@/lib/ginRummyEngine";
import { cutForFirstPlay } from "@/lib/openingCut";
import type { MindiOnlineState } from "@/components/game/MindiOnlineClient";
import type { GinOnlineState } from "@/components/game/GinRummyOnlineClient";

export function gameConfig(gameId: string): { gameType: GameType; neededPlayers: number; label: string } {
  if (gameId === "mindi") return { gameType: "mindi", neededPlayers: 4, label: "Mindi" };
  return { gameType: "gin_rummy", neededPlayers: 2, label: "Gin Rummy" };
}

function buildInitialState(gameType: GameType, players: string[]): MindiOnlineState | GinOnlineState {
  if (gameType === "mindi") {
    // openMindiHand draws for first play before dealing, so the leader is the
    // draw winner rather than whoever sits left of the dealer.
    const { deal, draw } = openMindiHand(3);
    const handsByUid: Record<string, ReturnType<typeof dealMindiHand>["hands"][0]> = {};
    for (let seat = 0; seat < 4; seat++) handsByUid[players[seat]] = deal.hands[seat as 0 | 1 | 2 | 3];
    const state: MindiOnlineState = {
      handsByUid,
      firstDraw: draw,
      trumpSuit: deal.trumpSuit,
      turnSeat: deal.leader,
      trick: [],
      tensCaptured: { A: 0, B: 0 },
      tricksWon: { A: 0, B: 0 },
      tricksPlayed: 0,
      outcome: null,
    };
    return state;
  }

  // Cut for first play before dealing, exactly as Mindi does. The cut is
  // stored so both clients replay the same ceremony, and its winner takes the
  // opening turn rather than it always falling to players[0].
  const cut = cutForFirstPlay<string>([players[0], players[1]]);
  const deal = dealGinHand();
  const state: GinOnlineState = {
    hands: { [players[0]]: deal.playerHand, [players[1]]: deal.opponentHand },
    stock: deal.stock,
    discard: deal.discard,
    turn: cut.winner,
    phase: "draw",
    firstCut: cut,
    turnDeadline: null,
    result: null,
  };
  return state;
}

export interface CasualQueue {
  /** A table has formed; the navigation to it is already in flight. */
  matchFound: boolean;
  /** Surfaced rather than swallowed - matchmaking failing silently is worse. */
  error: string | null;
  /** "Mindi" or "Gin Rummy". */
  label: string;
  /** 4 for Mindi, 2 for Gin Rummy. */
  neededPlayers: number;
}

export function useCasualQueue(gameId: string, active: boolean): CasualQueue {
  const router = useRouter();
  const { user } = useAuth();
  const [matchFound, setMatchFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigatedRef = useRef(false);

  const { gameType, neededPlayers, label } = gameConfig(gameId);

  useEffect(() => {
    if (!active || !user?.uid) return;

    const uid = user.uid;
    let cancelled = false;
    // A fresh look: leaving the queue and starting again must not be blocked
    // by the ref from the previous run.
    navigatedRef.current = false;
    setMatchFound(false);
    setError(null);

    function goToMatch(matchId: string) {
      if (navigatedRef.current || cancelled) return;
      navigatedRef.current = true;
      setMatchFound(true);
      setTimeout(() => {
        router.push(`/play/${gameId}/casual/online/live?m=${matchId}`);
      }, 900);
    }

    joinQueue(uid, gameType, "casual").catch((err) => setError(`Couldn't join queue: ${String(err)}`));

    const unwatch = watchForMatch(
      uid,
      gameType,
      (matchId) => {
        leaveQueue(uid);
        goToMatch(matchId);
      },
      (err) => setError(`Match lookup error: ${String(err)}`),
      "casual"
    );

    const attempt = async () => {
      if (navigatedRef.current || cancelled) return;
      try {
        const matchId = await tryFormMatch(uid, gameType, neededPlayers, (players) => buildInitialState(gameType, players), "casual");
        if (matchId) goToMatch(matchId);
      } catch (err) {
        setError(`Matchmaking error: ${String(err)}`);
      }
    };
    attempt();
    const interval = setInterval(attempt, 2500);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unwatch();
      if (!navigatedRef.current) leaveQueue(uid);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, user?.uid, gameType, neededPlayers, gameId]);

  return { matchFound, error, label, neededPlayers };
}
