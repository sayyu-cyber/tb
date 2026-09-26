"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Gamepad2, MessageCircle, MoreHorizontal, User, UserX, Check, X } from "lucide-react";
import { isOnline } from "@/lib/presence";
import type { Friend, PlayerSearchResult } from "@/lib/friends";
import { Avatar, RankLabel } from "@/components/arena";
import { getRankFromTrophies } from "@/constants/ranks";

/**
 * The Friends board's own pieces
 * (design/arena/screens/app/app-04-friends.jpg and app-04b).
 *
 * `.sbtn` is a stat button, `.fr` a roster row, `.sg` a suggestion row,
 * `.menu` the row's more-menu, `.toggle` the online-only switch and
 * `.minibtn` the small pill buttons on the right. Class names are the
 * board's, so these read against styles/arena-friends.css line for line.
 */

/* ── Stat button ────────────────────────────────────────────────────── */

export function StatButton({
  icon, value, label, tone, onClick,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  tone?: "b";
  onClick: () => void;
}) {
  return (
    <button type="button" className="sbtn" onClick={onClick} data-flat>
      <span className={`si ${tone ?? ""}`.trim()} aria-hidden="true">{icon}</span>
      <span>
        <b>{value}</b>
        <span className="lbl">{label}</span>
      </span>
    </button>
  );
}

/* ── Online-only switch ─────────────────────────────────────────────── */

export function OnlineToggle({
  checked, onChange, onlineCount,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  onlineCount: number;
}) {
  return (
    <span style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 4px" }}>
      <button
        type="button"
        className="toggle"
        role="switch"
        aria-checked={checked}
        aria-label="Online only"
        onClick={() => onChange(!checked)}
        data-flat
      >
        <i />
      </button>
      <span className="muted2" style={{ whiteSpace: "nowrap" }}>Online only · {onlineCount}</span>
    </span>
  );
}

/* ── Presence line ──────────────────────────────────────────────────── */

/** "Online", or how long ago they were last seen. */
export function presenceText(lastSeen: number | null | undefined) {
  if (isOnline(lastSeen ?? null)) return { text: "Online", online: true };
  if (!lastSeen) return { text: "Offline", online: false };
  const minutes = Math.floor((Date.now() - lastSeen) / 60_000);
  if (minutes < 60) return { text: `Last seen ${Math.max(1, minutes)}m ago`, online: false };
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return { text: `Last seen ${hours}h ago`, online: false };
  return { text: `Last seen ${Math.floor(hours / 24)}d ago`, online: false };
}

/* ── Roster row ─────────────────────────────────────────────────────── */

export function FriendRow({
  friend, profile, busy, onInvite, onRemove,
}: {
  friend: Friend;
  profile: PlayerSearchResult | undefined;
  busy: boolean;
  onInvite: (game: "mindi" | "gin_rummy") => void;
  onRemove: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const name = profile?.displayName || friend.name;
  const presence = presenceText(profile?.lastSeen);

  useEffect(() => {
    if (!menuOpen) return;
    const away = (event: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(event.target as Node)) setMenuOpen(false);
    };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") setMenuOpen(false); };
    document.addEventListener("mousedown", away);
    window.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", away); window.removeEventListener("keydown", key); };
  }, [menuOpen]);

  return (
    <div className="fr" ref={wrap}>
      <Avatar name={name} src={profile?.photoURL} seed={friend.uid} size={42} radius={11}
        presence={presence.online ? "online" : "offline"} />
      <div className="nm2">
        <b>{name}</b>
        <span className={`st ${presence.online ? "on" : ""}`.trim()}>
          <i aria-hidden="true" />{presence.text}
        </span>
      </div>
      <div className="acts">
        <button
          type="button"
          className="ibtn"
          aria-label={`Invite ${name} to a game`}
          disabled={busy}
          onClick={() => onInvite("mindi")}
        >
          <Gamepad2 aria-hidden="true" />
        </button>
        <Link
          className="ibtn"
          aria-label={`Message ${name}`}
          href={`/messages?with=${encodeURIComponent(friend.uid)}&name=${encodeURIComponent(name)}`}
        >
          <MessageCircle aria-hidden="true" />
        </Link>
        <button
          type="button"
          className="ibtn"
          aria-label={`More for ${name}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={() => setMenuOpen(value => !value)}
        >
          <MoreHorizontal aria-hidden="true" />
        </button>
      </div>

      {menuOpen && (
        <div className="menu" role="menu" aria-label={name} style={{ right: "8px", top: "58px" }}>
          <Link href={`/player?uid=${encodeURIComponent(friend.uid)}`} role="menuitem">
            <User aria-hidden="true" />View Profile
          </Link>
          <button type="button" role="menuitem" disabled={busy} onClick={() => { setMenuOpen(false); onInvite("mindi"); }} data-flat>
            <Gamepad2 aria-hidden="true" />Invite to Mindi
          </button>
          <button type="button" role="menuitem" disabled={busy} onClick={() => { setMenuOpen(false); onInvite("gin_rummy"); }} data-flat>
            <Gamepad2 aria-hidden="true" />Invite to Gin Rummy
          </button>
          <div className="divider" style={{ margin: "4px 6px" }} />
          <button type="button" role="menuitem" className="danger" onClick={() => { setMenuOpen(false); onRemove(); }} data-flat>
            <UserX aria-hidden="true" />Remove Friend
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Request and invite rows ────────────────────────────────────────── */

export function RequestRow({
  name, uid, line, busy, onAccept, onDecline,
}: {
  name: string;
  uid?: string;
  line: string;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fr">
      <Avatar name={name} seed={uid ?? name} size={42} radius={11} />
      <div className="nm2"><b>{name}</b><span className="st">{line}</span></div>
      <div className="acts">
        <button type="button" className="ibtn accept" aria-label={`Accept ${name}`} disabled={busy} onClick={onAccept}>
          <Check aria-hidden="true" />
        </button>
        <button type="button" className="ibtn" aria-label={`Decline ${name}`} disabled={busy} onClick={onDecline}>
          <X aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/* ── Suggestion / recently-played row ───────────────────────────────── */

export function SuggestionRow({
  person, meta, action,
}: {
  person: { uid: string; displayName: string; photoURL?: string | null; trophies?: number };
  /** Replaces the rank line - Recently Played shows the game and date. */
  meta?: React.ReactNode;
  action: React.ReactNode;
}) {
  const trophies = person.trophies ?? 0;
  const tier = getRankFromTrophies(trophies);
  return (
    <div className="sg">
      <Avatar name={person.displayName} src={person.photoURL} seed={person.uid} size={38} radius={10} />
      <div style={{ flexGrow: 1, display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
        <b>{person.displayName}</b>
        {meta ?? <RankLabel tier={tier}>{tier} · {trophies}</RankLabel>}
      </div>
      {action}
    </div>
  );
}
