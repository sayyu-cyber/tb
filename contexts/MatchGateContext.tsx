"use client";

import { createContext, useContext, useEffect, useState } from "react";

/**
 * What the rotate gate says while a hand is running —
 * design/arena/MOBILE.md "A table held upright", drawn on
 * design/arena/boards/MRotate.dc.html.
 *
 * The gate covers a LIVE table: nothing pauses and nothing is forfeited, so
 * it has to say what is happening behind it rather than just "rotate". The
 * table is the only thing that knows whose turn it is, so the table
 * publishes here and the gate reads. One gate, mounted by the shell for the
 * whole match route, means it is also up during the cut, the deal and the
 * hand result - and in those moments there is no turn to report, which is
 * why every field below is optional and why the gate must read well with
 * none of them.
 */

export interface MatchGateTurn {
  /** True when the player on this device is the one to act. */
  mine: boolean;
  /** Who is playing, when it is not you. */
  name?: string;
  /** Epoch ms the turn expires, or null where the game has no clock. */
  deadline?: number | null;
  /** What the clock started from, so the ring can show the fraction left. */
  seconds?: number;
  /** The turn's instruction: "Follow spades", "Discard a card". */
  detail?: string;
}

export interface MatchGateStatus {
  /** The chip at the top: the game and the mode, e.g. "Mindi · Casual online". */
  label: string;
  /** The right of that row: "Trick 9 of 13", "24 left in the stock". */
  progress?: string;
  turn?: MatchGateTurn | null;
  /** Opens the screen's own leave-and-confirm flow. */
  onLeave?: () => void;
}

/**
 * Two contexts rather than one, on purpose. A table both publishes and
 * re-renders constantly; if it subscribed to the value it publishes, every
 * publish would re-render it, produce a fresh status object, and publish
 * again. Splitting them means the table only ever reads the setter, which
 * `useState` guarantees is stable, so the loop cannot form.
 */
const StatusContext = createContext<MatchGateStatus | null>(null);
const PublishContext = createContext<(status: MatchGateStatus | null) => void>(() => {});

export function MatchGateProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<MatchGateStatus | null>(null);
  return (
    <PublishContext.Provider value={setStatus}>
      <StatusContext.Provider value={status}>{children}</StatusContext.Provider>
    </PublishContext.Provider>
  );
}

/** Read by the gate. */
export function useMatchGateStatus(): MatchGateStatus | null {
  return useContext(StatusContext);
}

/**
 * Called by a table, once, with a status rebuilt on each of its renders.
 *
 * Compared field by field rather than by identity, so a table that
 * re-renders without changing anything the gate shows does not wake it.
 * `onLeave` is compared by identity, so pass a stable handler - the tables
 * pass `setModal` from `useState`, which never changes.
 */
export function usePublishMatchGate(status: MatchGateStatus | null) {
  const publish = useContext(PublishContext);
  const fingerprint = status
    ? [status.label, status.progress, status.turn?.mine, status.turn?.name,
       status.turn?.deadline, status.turn?.seconds, status.turn?.detail].join("\u0000")
    : "";

  useEffect(() => {
    publish(status);
    // The fingerprint stands in for the fields; `status` itself is a new
    // object on every render and would defeat the comparison.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publish, fingerprint, status?.onLeave]);

  // A table that unmounts mid-hand (leaving, or the hand ending) must not
  // leave its last turn on the gate.
  useEffect(() => () => publish(null), [publish]);
}
