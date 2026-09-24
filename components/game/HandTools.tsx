"use client";
import { ArrowDownWideNarrow } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { HandSort } from "@/lib/cardSort";

export type HandOrder = HandSort | "melds" | "custom";

/**
 * `custom` is only offered once the player has actually dragged a card into
 * their own order - an option that reorders nothing would be a dead control.
 */
/**
 * `suit` is offered unless a game asks for melds instead - Gin Rummy sorts by
 * meld and by rank only, because grouping by suit hides the sets.
 */
export function HandTools({ order, onChange, melds = false, rank: rankOnly = false, custom = false }: { order: HandOrder; onChange: (order: HandOrder) => void; melds?: boolean; rank?: boolean; custom?: boolean }) {
  return <label className="hand-sort"><ArrowDownWideNarrow size={17} aria-hidden="true" /><select aria-label="Sort hand" value={order} onChange={event => onChange(event.target.value as HandOrder)}>{melds && <option value="melds">By meld</option>}{!rankOnly && <option value="suit">By suit</option>}<option value="rank">By rank</option>{custom && <option value="custom">My order</option>}</select></label>;
}

/** Arrow keys inspect playable cards; Enter/Space still selects, never plays. */
export function navigateHand(event: KeyboardEvent<HTMLDivElement>) {
  // Alt+Arrow is reserved for moving a card within the hand (see MindiTable),
  // so it must not also move focus.
  if (event.altKey || event.ctrlKey || event.metaKey || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
  if (index < 0 || !buttons.length) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
  buttons[next].focus({ preventScroll: true });
}
