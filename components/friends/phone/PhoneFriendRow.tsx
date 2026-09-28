"use client";

import { useState } from "react";
import Link from "next/link";
import { Gamepad2, MessageCircle, MoreHorizontal, User, UserX } from "lucide-react";
import type { Friend, PlayerSearchResult } from "@/lib/friends";
import { Avatar } from "@/components/arena";
import { Sheet } from "@/components/layout/phone/Sheet";
import { presenceText } from "../FriendsPieces";

/**
 * A friend, and their actions, on a phone held upright —
 * design/arena/boards/MFriends.dc.html,
 * design/arena/screens/phone/phone-04c-friend-actions.jpg.
 *
 * The row itself is the wide screen's: same `.fr`, same avatar with its
 * presence dot, same three icon buttons. The one difference is what the
 * third one opens. On the wide screen it is a `.menu` dropdown anchored to
 * the row; at 390px a dropdown either covers the row it belongs to or runs
 * off the bottom of the list, so MOBILE.md has it open the shared bottom
 * sheet instead - which also repeats who you are acting on, so the sheet is
 * never ambiguous about that.
 *
 * Every destination is the same one the dropdown offers, in the same order.
 */
export function PhoneFriendRow({
  friend, profile, busy, onInvite, onRemove,
}: {
  friend: Friend;
  profile: PlayerSearchResult | undefined;
  busy: boolean;
  onInvite: (game: "mindi" | "gin_rummy") => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const name = profile?.displayName || friend.name;
  const presence = presenceText(profile?.lastSeen);

  return (
    <div className="fr">
      <Avatar name={name} src={profile?.photoURL} seed={friend.uid} size={42} radius={11}
        presence={presence.online ? "online" : "offline"} />
      <div className="nm2">
        <b>{name}</b>
        <span className={`st ${presence.online ? "on" : ""}`.trim()}>
          <i aria-hidden="true" />{presence.text}
        </span>
      </div>
      <div className="acts">
        <button type="button" className="ibtn" aria-label={`Invite ${name} to a game`} disabled={busy}
          onClick={() => onInvite("mindi")}>
          <Gamepad2 aria-hidden="true" />
        </button>
        <Link className="ibtn" aria-label={`Message ${name}`}
          href={`/messages?with=${encodeURIComponent(friend.uid)}&name=${encodeURIComponent(name)}`}>
          <MessageCircle aria-hidden="true" />
        </Link>
        <button type="button" className="ibtn" aria-label={`More for ${name}`} aria-expanded={open}
          onClick={() => setOpen(true)}>
          <MoreHorizontal aria-hidden="true" />
        </button>
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} label={name}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
          <Avatar name={name} src={profile?.photoURL} seed={friend.uid} size={44} radius={12}
            presence={presence.online ? "online" : "offline"} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <b className="disp" style={{ fontSize: 18, letterSpacing: ".02em" }}>{name}</b>
            <span className={`st ${presence.online ? "on" : ""}`.trim()}>
              <i aria-hidden="true" />{presence.text}
            </span>
          </div>
        </div>
        <div className="acts2">
          <Link href={`/player?uid=${encodeURIComponent(friend.uid)}`} onClick={() => setOpen(false)}>
            <User aria-hidden="true" />View Profile
          </Link>
          <button type="button" disabled={busy} onClick={() => { setOpen(false); onInvite("mindi"); }} data-flat>
            <Gamepad2 aria-hidden="true" />Invite to Mindi
          </button>
          <button type="button" disabled={busy} onClick={() => { setOpen(false); onInvite("gin_rummy"); }} data-flat>
            <Gamepad2 aria-hidden="true" />Invite to Gin Rummy
          </button>
          <button type="button" className="danger" onClick={() => { setOpen(false); onRemove(); }} data-flat>
            <UserX aria-hidden="true" />Remove Friend
          </button>
        </div>
        <button type="button" className="ar-btn ghost full" style={{ marginTop: 14 }} onClick={() => setOpen(false)} data-flat>
          Cancel
        </button>
      </Sheet>
    </div>
  );
}
