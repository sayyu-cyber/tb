"use client";

import { ClubDoc, MAX_MEMBERS } from "@/lib/clubs";
import { Suit } from "@/components/game/ArenaSprite";
import { Meter } from "@/components/arena";

/**
 * A club in the browse grid — the Clubs board's `.club`
 * (design/arena/screens/app/app-06-clubs.jpg).
 *
 * The crest is a suit in one of four tints. Which suit and which tint come
 * from the club's own id, so a club looks the same every time it is drawn
 * and two clubs side by side rarely match - rather than every club getting
 * the same crest, which is what a fixed choice would give.
 */

const SUITS = ["S", "H", "D", "C"] as const;
const TINTS = ["t1", "t2", "t3", "t4"] as const;

/** Stable index from a club id. */
function pick(id: string, size: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % size;
}

export function ClubCard({
  club, hasClub, isMine, busy, disabled, onJoin, onOpen,
}: {
  club: ClubDoc;
  /** The player already belongs to a club, so they cannot join another. */
  hasClub: boolean;
  isMine: boolean;
  busy: boolean;
  disabled: boolean;
  onJoin: () => void;
  onOpen: () => void;
}) {
  const count = club.members.length;
  const full = count >= MAX_MEMBERS;
  const suit = SUITS[pick(club.id, SUITS.length)];
  const tint = TINTS[pick(club.id + "t", TINTS.length)];

  // The board's four button states, in the order it resolves them.
  const action = isMine ? { label: "Open Club", kind: "open" as const }
    : full ? { label: "Full", kind: "off" as const }
    : hasClub ? { label: "Already in a club", kind: "off" as const }
    : { label: busy ? "Joining..." : "Join Club", kind: "join" as const };

  return (
    <article className="club">
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <span className={`crest ${tint}`} aria-hidden="true"><Suit suit={suit} /></span>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
          <span className="tag">[{club.tag}]</span>
          <h3>{club.name}</h3>
        </div>
      </div>
      <p>{club.description}</p>
      <div className="cap">
        <span className="muted2 tnum">{count} / {MAX_MEMBERS} members</span>
        <Meter
          value={count / MAX_MEMBERS}
          // The board fills the bar lime only once the club is full; a club
          // still taking members reads blue.
          tone={full ? "lime" : "blue"}
          thin
          label={`${club.name} membership`}
          valueText={`${count} of ${MAX_MEMBERS} members`}
        />
      </div>
      {action.kind === "off" ? (
        <button type="button" className="ar-btn ghost sm" disabled style={{ alignSelf: "stretch" }}>
          {action.label}
        </button>
      ) : (
        <button
          type="button"
          className={action.kind === "open" ? "ar-btn sm" : "ar-btn ghost sm"}
          style={{ alignSelf: "stretch" }}
          disabled={disabled || busy}
          onClick={action.kind === "open" ? onOpen : onJoin}
        >
          {action.label}<span className="sr-only"> — {club.name}</span>
        </button>
      )}
    </article>
  );
}
