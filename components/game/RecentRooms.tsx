"use client";
import { useEffect, useState } from "react";
import { Clock, Lock, Users, ChevronRight } from "lucide-react";
import { watchRoom, type RoomDoc } from "@/lib/rooms";
import { recentRoomCodes } from "@/lib/roomHistory";
import { useTranslation } from "@/hooks/useTranslation";
import { RoomDeck } from "./RoomBoardParts";

export function RecentRooms({ uid, busy, onJoin, phone = false }: { uid: string; busy: boolean; onJoin: (code: string) => void; phone?: boolean }) {
  const t = useTranslation();
  const [codes, setCodes] = useState<string[]>([]), [rooms, setRooms] = useState<Record<string, RoomDoc | null>>({});
  const [errors, setErrors] = useState<Record<string, boolean>>({}), [attempt, retry] = useState(0), [all, setAll] = useState(false);
  useEffect(() => {
    const values = uid ? recentRoomCodes(uid) : [];
    setCodes(values); setRooms({}); setErrors({});
    const stops = values.map(code => watchRoom(code, room => setRooms(old => ({ ...old, [code]: room })), () => setErrors(old => ({ ...old, [code]: true }))));
    return () => stops.forEach(stop => stop());
  }, [uid, attempt]);
  return <section className={`${phone ? "sec" : "panel"} room-recents`} aria-label={t("room_recent")}>
    <div className={phone ? "sech" : "ph"}><div style={{ display: "flex", alignItems: "center", gap: 12 }}>{!phone && <span className="itile dim" style={{ width: 40, height: 40, borderRadius: 11 }}><Clock aria-hidden="true" /></span>}<div><h2>{t("room_recent")}</h2>{!phone && <p className="muted2" style={{ margin: "6px 0 0" }}>{t("room_recentHelp")}</p>}</div></div><button className="link" onClick={() => setAll(!all)}>{t(all ? "room_showLess" : "room_viewAll")}{!phone && <ChevronRight aria-hidden="true" />}</button></div>
    {!codes.length ? <p className="muted2">{t("room_noRecent")}</p> : <div className="room-recents-grid">
      {codes.slice(0, all ? 8 : 4).map(code => {
        if (errors[code]) return <article className={phone ? "rrow" : "rr"} key={code}><p>{t("room_recentError").replace("{code}", code)}</p><button className="minib blue" onClick={() => retry(value => value + 1)}>{t("error_tryAgain")}</button></article>;
        const room = rooms[code];
        if (room === undefined) return <article className={phone ? "rrow" : "rr"} key={code} role="status">{t("roomlobby_loadingRoom")}</article>;
        const unavailable = !room || room.status !== "waiting" || (room.players.length >= room.maxPlayers && !room.players.includes(uid)) || room.bannedUids?.includes(uid);
        const key = !room ? "room_expired" : room.bannedUids?.includes(uid) ? "room_unavailable" : room.status === "started" ? phone ? "room_startedShort" : "room_started" : room.status === "closed" ? "room_closed" : unavailable ? "room_full" : "room_available";
        const gin = room?.gameType === "gin_rummy", game = gin ? phone ? "Gin" : "Gin Rummy" : "Mindi";
        const joinButton = <button className={`minib ${unavailable ? "dim" : "lime"}`} disabled={!!unavailable || busy} onClick={() => onJoin(code)}>{t("room_joinShort")}</button>;
        const status = <span className={`pill ${key === "room_available" ? "lime" : room?.status === "started" ? "blue" : "dim"}`} style={phone ? { height: 20, padding: "0 6px", fontSize: 9 } : { marginLeft: 4 }}>{t(key)}</span>;
        return phone ? <article className={`rrow ${unavailable ? "off" : ""}`} key={code}><RoomDeck gin={gin} small /><div className="tx"><b>{code}{room?.password && <Lock aria-label={t("room_protect")} />}</b><span>{game} · {room ? `${room.players.length}/${room.maxPlayers}` : "—"}{status}</span></div>{joinButton}</article> : <article className={`rr ${unavailable ? "off" : ""}`} key={code}><div className="top1"><RoomDeck gin={gin} small /><div className="tx"><b>{t("room_gameRoom").replace("{game}", game)}</b><span className="mono cd">{code}</span></div>{room?.password && <Lock className="lockic" aria-label={t("room_protect")} />}</div><div className="foot"><span className="meta"><Users aria-hidden="true" />{room ? `${room.players.length} / ${room.maxPlayers}` : "—"}{status}</span>{joinButton}</div></article>;
      })}
    </div>}
  </section>;
}
