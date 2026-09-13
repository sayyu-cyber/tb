"use client";
import { useRef, useState } from "react";
import { Users, Search, X } from "lucide-react";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { useToast } from "@/contexts/ToastContext";
import { sendRoomInvite } from "@/lib/friends";
import type { RoomDoc } from "@/lib/rooms";
import { Button } from "@/components/ui/Button";

export function RoomInviteDialog({ room, myUid }: { room: RoomDoc; myUid: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { friends, online, loading, error, retry } = useHomeSocial();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const pending = useRef(false);
  async function invite(uid: string) {
    if (pending.current) return;
    pending.current = true; setBusy(uid);
    try {
      await sendRoomInvite(myUid, room.playerNames[myUid] || "Player", uid, room.code, room.gameType);
      setSent(old => [...old, uid]); showToast("Invitation sent", "success");
    } catch { showToast("Could not send invitation. Try again.", "error"); }
    finally { pending.current = false; setBusy(null); }
  }
  return <>
    <Button variant="secondary" className="mb-4" onClick={() => dialog.current?.showModal()}><Users size={18} />Invite Friends</Button>
    <dialog ref={dialog} className="private-modal" aria-labelledby="room-invite-title">
      <button className="private-modal-close" onClick={() => dialog.current?.close()} aria-label="Close invitations"><X size={20} /></button>
      <h2 id="room-invite-title">Invite Friends</h2>
      <label className="private-invite-search"><Search size={18} /><input aria-label="Search friends" placeholder="Search friends" value={search} onChange={event => setSearch(event.target.value)} /></label>
      {!loading && !error && friends.length > 0 && !friends.some(friend => friend.name.toLowerCase().includes(search.toLowerCase())) && <p>No friends match your search.</p>}
      {loading ? <p role="status">Loading friends...</p> : error ? <div role="alert">Could not load friends.<button onClick={retry}>Try again</button></div> : !friends.length ? <p>No friends yet. Add friends from the Friends page.</p> :
        friends.filter(friend => friend.name.toLowerCase().includes(search.toLowerCase())).sort((a,b) => Number(online.some(item => item.uid === b.uid)) - Number(online.some(item => item.uid === a.uid))).map(friend => {
          const joined = room.players.includes(friend.uid);
          const invited = sent.includes(friend.uid);
          return <div className="private-invite-person" key={friend.uid}><span><strong>{friend.name}</strong><small>{online.some(item => item.uid === friend.uid) ? "Online" : "Offline"}</small></span><Button size="sm" disabled={joined || invited || !!busy || room.players.length >= room.maxPlayers} loading={busy === friend.uid} onClick={() => invite(friend.uid)}>{joined ? "Joined" : invited ? "Sent" : room.players.length >= room.maxPlayers ? "Room full" : "Invite"}</Button></div>;
        })}
    </dialog>
  </>;
}
