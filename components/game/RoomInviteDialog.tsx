"use client";
import { useRef, useState } from "react";
import { Search } from "lucide-react";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "@/hooks/useTranslation";
import { sendRoomInvite } from "@/lib/friends";
import type { RoomDoc } from "@/lib/rooms";

/** The historical component name is retained for callers. Invitations are
 * now built into the room page, with the same live social data and sending. */
export function RoomInviteDialog({ room, myUid, phone = false }: { room: RoomDoc; myUid: string; phone?: boolean }) {
  const { friends, online, profiles, loading, error, retry } = useHomeSocial();
  const { showToast } = useToast(), t = useTranslation();
  const [search, setSearch] = useState(""), [sent, setSent] = useState<string[]>([]), [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  async function invite(uid: string) {
    if (pending.current || room.status !== "waiting" || room.players.length >= room.maxPlayers || room.players.includes(uid) || sent.includes(uid) || room.bannedUids?.includes(uid)) return;
    pending.current = true; setBusy(uid);
    try {
      await sendRoomInvite(myUid, room.playerNames[myUid] || "Player", uid, room.code, room.gameType);
      setSent(old => [...old, uid]); showToast(t("room_invitationSent"), "success");
    } catch { showToast(t("room_invitationFailed"), "error"); }
    finally { pending.current = false; setBusy(null); }
  }
  const matches = friends.filter(friend => friend.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => Number(online.some(item => item.uid === b.uid)) - Number(online.some(item => item.uid === a.uid)));
  return <section id="room-friends" className={`${phone ? "sec" : "panel tick b"} room-invite-friends`} aria-label={t("room_inviteFriends")}>
    <div className={phone ? "sech" : "ph"} style={{ paddingRight: phone ? 0 : 4 }}><h2>{t("room_inviteFriends")}</h2><span className="muted2">{t("room_nOnline").replace("{n}",String(online.length))}</span></div>
    {!phone && <label className="field" style={{ marginRight: 4 }}><Search aria-hidden="true" /><input aria-label={t("room_searchFriends")} placeholder={t("room_searchFriends")} value={search} onChange={event => setSearch(event.target.value)} /></label>}
    <div className="room-friend-list" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {loading ? <p role="status">{t("room_friendsLoading")}</p> : error ? <div role="alert"><p>{t("room_friendsError")}</p><button className="minib blue" onClick={retry}>{t("error_tryAgain")}</button></div> : !friends.length ? <p className="muted2">{t("room_noFriends")}</p> : !matches.length ? <p className="muted2">{t("room_noMatches")}</p> : matches.map(friend => {
        const joined = room.players.includes(friend.uid), invited = sent.includes(friend.uid), isOnline = online.some(item => item.uid === friend.uid), full = room.players.length >= room.maxPlayers;
        const banned = room.bannedUids?.includes(friend.uid);
        const lastSeen = profiles[friend.uid]?.lastSeen;
        const status = joined ? t("room_inThisRoom") : isOnline ? t("room_online") : lastSeen ? t("room_lastSeen").replace("{n}",String(Math.max(1,Math.floor((Date.now()-lastSeen)/60000)))) : t("room_offline");
        const index = room.seatOrder?.indexOf(friend.uid) ?? room.players.indexOf(friend.uid);
        return <div className="frow" key={friend.uid}><span className={`ava ${joined && index % 2 === 0 ? "" : "b"}`} style={{ width: 38, height: 38, marginRight: 0, fontSize: 16, boxShadow: "none" }}>{friend.name[0]}<i className={`on ${isOnline || joined ? "" : "off"}`} /></span><div className="tx"><b>{friend.name}</b><span className={isOnline || joined ? "on" : ""}>{status}</span></div><button className={`minib ${joined ? "ok" : invited ? "sent" : full || banned ? "dim" : "blue"}`} disabled={joined || invited || !!busy || full || !!banned || room.status !== "waiting"} onClick={() => invite(friend.uid)}>{t(joined ? "room_joinedShort" : invited ? "room_sent" : full ? "room_full" : banned ? "room_unavailable" : "room_inviteShort")}</button></div>;
      })}
    </div>
  </section>;
}
