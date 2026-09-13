"use client";
import { useEffect, useState } from "react";
import { Clock, Spade, Diamond, Users } from "lucide-react";
import { watchRoom, type RoomDoc } from "@/lib/rooms";
import { recentRoomCodes } from "@/lib/roomHistory";
import { Button } from "@/components/ui/Button";

export function RecentRooms({ uid, busy, onJoin }: { uid: string; busy: boolean; onJoin: (code: string) => void }) {
  const [codes, setCodes] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Record<string, RoomDoc | null>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [attempt, retry] = useState(0);
  const [all, setAll] = useState(false);
  useEffect(() => {
    const values = uid ? recentRoomCodes(uid) : [];
    setCodes(values); setRooms({}); setErrors({});
    const stops = values.map(code => watchRoom(code, room => setRooms(old => ({ ...old, [code]: room })), () => setErrors(old => ({ ...old, [code]: true }))));
    return () => stops.forEach(stop => stop());
  }, [uid, attempt]);
  return <section className="private-recents">
    <header><Clock size={23} /><div><h2>Recent Rooms</h2><p>Rooms you created or joined on this device.</p></div>{codes.length > 4 && <button onClick={() => setAll(!all)}>{all ? "Show less" : "View all"}</button>}</header>
    {!codes.length ? <div className="private-empty"><Clock size={28} /><strong>No recent rooms</strong><p>Rooms you create or join will appear here.</p><a href="#create-room">Create Your First Room</a></div> : <div className="private-recent-grid">
      {codes.slice(0, all ? 8 : 4).map(code => {
        if (errors[code]) return <div className="private-recent-item" key={code}><p>Could not load {code}.</p><button onClick={() => retry(value => value + 1)}>Try again</button></div>;
        const room = rooms[code];
        if (room === undefined) return <div className="private-room-skeleton" key={code} role="status" aria-label="Loading recent room" />;
        const unavailable = !room || room.status !== "waiting" || (room.players.length >= room.maxPlayers && !room.players.includes(uid)) || room.bannedUids?.includes(uid);
        const status = !room ? "Expired" : room.bannedUids?.includes(uid) ? "Unavailable" : room.status === "started" ? "Game started" : room.status === "closed" ? "Closed" : unavailable ? "Full" : "Available";
        const Icon = room?.gameType === "gin_rummy" ? Diamond : Spade;
        return <article className="private-recent-item" key={code}><Icon size={27} /><div><h3>{room?.gameType === "gin_rummy" ? "Gin Rummy" : "Mindi Room"}</h3><code>{code}</code><p><Users size={13} />{room ? room.players.length + " / " + room.maxPlayers : "--"} · {status}</p></div><Button size="sm" disabled={!!unavailable || busy} onClick={() => onJoin(code)}>Join</Button></article>;
      })}
    </div>}
  </section>;
}
