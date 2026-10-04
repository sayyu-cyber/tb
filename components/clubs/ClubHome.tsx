"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Crown, LogOut, Trophy, MessageCircle } from "lucide-react";
import {
  ClubDoc, MAX_MEMBERS, leaveClub, kickMember,
} from "@/lib/clubs";
import { watchSocialProfiles, type PlayerSearchResult } from "@/lib/friends";
import { useToast } from "@/contexts/ToastContext";
import { Avatar, Pill } from "@/components/arena";
import { Suit } from "@/components/game/ArenaSprite";
import { ClubChat } from "./ClubChat";

/**
 * My Club — the right-hand panel of the Clubs board
 * (design/arena/screens/app/app-06-clubs.jpg, with the chat tab from
 * app-06b).
 *
 * The header carries the crest, tag, name and member count; below it the
 * Members list or the Club Chat.
 *
 * CODE ISSUE 10. A member's trophy count was written into the club document
 * when they joined and never touched again, so the ladder here froze at
 * whatever everyone had on their join date - someone who joined at 4
 * trophies still read 4 a season later, and the list's order was wrong with
 * it. The stored `memberTrophies` is now only a fallback: the live figure
 * comes from each member's own player document, through the same
 * watchSocialProfiles the Friends screen uses. No schema change and no
 * write - the club document is left exactly as it was, and the number on
 * screen is simply the true one.
 */

const SUITS = ["S", "H", "D", "C"] as const;
const TINTS = ["t1", "t2", "t3", "t4"] as const;

function pick(id: string, size: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % size;
}

export function ClubHome({ club, myUid, myName, compact = false }: {
  club: ClubDoc;
  myUid: string;
  myName: string;
  /**
   * MClubs draws the same panel two sizes down - a 58x64 crest and a 23px
   * name instead of 64x70 and the wide `club-name` size. Only those two
   * numbers differ, so the panel is one component rather than two: it holds
   * the club chat subscription, the member watcher and the kick/leave
   * confirm, and none of those should exist twice.
   */
  compact?: boolean;
}) {
  const [tab, setTab] = useState<"members" | "chat">("members");
  const [profiles, setProfiles] = useState<Record<string, PlayerSearchResult>>({});
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const action = useRef(false);
  const { showToast } = useToast();
  const isOwner = club.ownerUid === myUid;

  useEffect(() => { if (confirm) dialog.current?.showModal(); }, [confirm]);

  // Code issue 10: live trophies for every member.
  const memberIds = JSON.stringify([...club.members].sort());
  useEffect(() => {
    return watchSocialProfiles(JSON.parse(memberIds), setProfiles, () => {
      // A failure here is not worth an error banner: the stored figures
      // still render, just without the refresh.
    });
  }, [memberIds]);

  async function handleLeave() {
    if (action.current) return;
    action.current = true; setBusy(true);
    try { await leaveClub(club.id, myUid); showToast("You left " + club.name + ".", "success"); }
    catch { showToast("Could not leave the club. Please try again.", "error"); }
    finally { action.current = false; setBusy(false); setConfirm(null); dialog.current?.close(); }
  }

  async function handleKick(uid: string) {
    if (action.current) return;
    action.current = true; setBusy(true);
    try {
      await kickMember(club.id, myUid, uid);
      showToast((club.memberNames[uid] ?? "Member") + " was removed.", "success");
    } catch {
      showToast("Could not remove that member. Please try again.", "error");
    } finally { action.current = false; setBusy(false); setConfirm(null); dialog.current?.close(); }
  }

  /** Members by trophies, highest first - the board's ladder. */
  const members = useMemo(() => club.members
    .map(uid => ({
      uid,
      name: profiles[uid]?.displayName ?? club.memberNames[uid] ?? "Player",
      // Live where we have it, the stored figure where we do not.
      trophies: profiles[uid]?.trophies ?? club.memberTrophies[uid] ?? 0,
      photoURL: profiles[uid]?.photoURL,
      owner: uid === club.ownerUid,
    }))
    .sort((a, b) => b.trophies - a.trophies || a.name.localeCompare(b.name)),
    [club, profiles]);

  const suit = SUITS[pick(club.id, SUITS.length)];
  const tint = TINTS[pick(club.id + "t", TINTS.length)];
  const confirmName = confirm === "leave" ? club.name : club.memberNames[confirm ?? ""] ?? "this member";

  return (
    <section className="panel tick club-panel" aria-label="My club">
      <div className="club-head">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>My Club</span>
          {isOwner && <Pill tone="lime"><Crown aria-hidden="true" />Owner</Pill>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span className={`crest ${tint}`} aria-hidden="true"
            style={compact ? { width: "58px", height: "64px" } : { width: "64px", height: "70px" }}>
            <Suit suit={suit} />
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
            <span className="tag">[{club.tag}]</span>
            <b className="disp club-name" style={compact ? { fontSize: "23px" } : undefined}>{club.name}</b>
            <span className="muted2 tnum">{club.members.length} / {MAX_MEMBERS} members</span>
          </div>
        </div>
        <div className="tabs" style={{ alignSelf: "flex-start" }} role="group" aria-label="Club sections">
          <button type="button" aria-pressed={tab === "members"} onClick={() => setTab("members")} data-flat>
            Members ({club.members.length})
          </button>
          <button type="button" aria-pressed={tab === "chat"} onClick={() => setTab("chat")} data-flat>
            <MessageCircle aria-hidden="true" />Club Chat
          </button>
        </div>
      </div>

      {tab === "members" ? (
        <div className="club-members">
          {members.map((member, index) => (
            <div className={`mem ${member.uid === myUid ? "me" : ""}`.trim()} key={member.uid}>
              <span className="pos">{index + 1}</span>
              <Avatar name={member.name} src={member.photoURL} seed={member.uid} size={34} radius={9} />
              <b>
                {member.owner && <Crown aria-hidden="true" />}
                {member.name}
                {member.uid === myUid && <span className="muted you">(you)</span>}
              </b>
              <span className="muted2 tnum" style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <Trophy aria-hidden="true" style={{ width: "14px", height: "14px" }} />{member.trophies}
              </span>
              {isOwner && member.uid !== myUid ? (
                <button type="button" className="kick" disabled={busy} onClick={() => setConfirm(member.uid)} data-flat>
                  Kick<span className="sr-only"> {member.name}</span>
                </button>
              ) : <span />}
            </div>
          ))}
          <button
            type="button"
            className="ar-btn ghost sm club-leave"
            disabled={busy}
            onClick={() => setConfirm("leave")}
          >
            <LogOut aria-hidden="true" />Leave Club
          </button>
        </div>
      ) : (
        <ClubChat key={`${myUid}:${club.id}`} clubId={club.id} myUid={myUid} myName={myName} />
      )}

      <dialog ref={dialog} className="dlg club-dlg" onClose={() => setConfirm(null)}>
        <h2 className="disp" style={{ margin: "0 0 8px", fontSize: "24px" }}>
          {confirm === "leave" ? "Leave club?" : "Remove member?"}
        </h2>
        <p className="muted" style={{ margin: "0 0 22px" }}>
          {confirm === "leave"
            ? `You will leave ${confirmName} and lose access to its chat.`
            : `${confirmName} will be removed from ${club.name}.`}
        </p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button type="button" className="ar-btn ghost sm" onClick={() => { setConfirm(null); dialog.current?.close(); }}>
            Cancel
          </button>
          <button
            type="button"
            className="ar-btn danger sm"
            disabled={busy}
            onClick={() => confirm === "leave" ? handleLeave() : confirm && handleKick(confirm)}
          >
            {confirm === "leave" ? "Leave" : "Remove"}
          </button>
        </div>
      </dialog>
    </section>
  );
}
