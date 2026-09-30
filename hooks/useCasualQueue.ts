"use client";

/**
 * The Casual Online queue, as a hook.
 *
 * Shared by the full-screen queue and the inline Play lobby:
 *
 *   - the full-screen queue at /play/<game>/casual/online, which is what
 *     CasualOnlineClient still renders;
 *   - the Play lobby (design/arena/boards/Lobby.dc.html), whose CTA turns
 *     into "Finding a table" with "Tap again to stop looking" under it. The
 *     board queues from the lobby rather than sending you to another
 *     screen, so the lobby needs the same queue without the same UI.
 *
 * Join/leave requests are serialized across cancellations, formation polls
 * never overlap, and inactive/unmounted queues cannot navigate later.
 */

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { joinQueue, leaveQueue, tryFormMatch, watchForMatch, matchmakingErrorMessage, GameType } from "@/lib/matchmaking";
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
  const { user, isGuest } = useAuth();
  const [matchFound, setMatchFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigatedRef = useRef(false);
  const queueLifecycleRef = useRef<Promise<void>>(Promise.resolve());

  const { gameType, neededPlayers, label } = gameConfig(gameId);

  useEffect(() => {
    if (!active || !user?.uid || isGuest) return;

    const uid = user.uid;
    let cancelled = false;
    let found = false;
    let attempting = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let navigation: ReturnType<typeof setTimeout> | undefined;
    let unwatch = () => {};
    // A fresh look: leaving the queue and starting again must not be blocked
    // by the ref from the previous run.
    navigatedRef.current = false;
    setMatchFound(false);
    setError(null);

    function goToMatch(matchId: string) {
      if (navigatedRef.current || cancelled) return;
      navigatedRef.current = true;
      found = true;
      queueLifecycleRef.current = queueLifecycleRef.current.then(() => leaveQueue(uid)).catch(() => {});
      setError(null);
      setMatchFound(true);
      navigation = setTimeout(() => {
        router.push(`/play/${gameId}/casual/online/live?m=${matchId}`);
      }, 900);
    }

    const attempt = async () => {
      if (found || cancelled || attempting) return;
      attempting = true;
      try {
        const matchId = await tryFormMatch(uid, gameType, neededPlayers, (players) => buildInitialState(gameType, players), "casual");
        if (matchId) goToMatch(matchId);
        else if (!cancelled && !found) setError(current => current?.startsWith("Matchmaking error:") ? null : current);
      } catch (err) {
        if (!cancelled && !found) setError(`Matchmaking error: ${matchmakingErrorMessage(err)}`);
      } finally {
        attempting = false;
      }
    };
    // Start only after the join completes. Serialize leave/join when someone
    // cancels or switches games while the previous request is still in flight.
    const joined = queueLifecycleRef.current.then(async () => {
      if (cancelled) return;
      await joinQueue(uid, gameType, "casual");
      if (cancelled) return;
      unwatch = watchForMatch(uid, gameType, (matchId) => {
        goToMatch(matchId);
      }, (err) => {
        if (!cancelled && !found) setError(`Match lookup error: ${matchmakingErrorMessage(err)}`);
      }, "casual");
      void attempt();
      interval = setInterval(() => void attempt(), 2500);
    });
    queueLifecycleRef.current = joined.catch((err) => {
      if (!cancelled) setError(`Couldn't join queue: ${matchmakingErrorMessage(err)}`);
    });

    return () => {
      cancelled = true;
      clearInterval(interval);
      clearTimeout(navigation);
      unwatch();
      if (!found) {
        queueLifecycleRef.current = queueLifecycleRef.current.then(() => leaveQueue(uid)).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, user?.uid, isGuest, gameType, neededPlayers, gameId]);

  return { matchFound, error, label, neededPlayers };
}
