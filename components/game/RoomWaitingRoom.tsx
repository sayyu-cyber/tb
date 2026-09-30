"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftRight, Ban, Check, Copy, Crown, ChevronLeft, Ellipsis, Info, Layers, Lock, LogOut, Play, RefreshCw, Share2, Smartphone, Ticket, User, Users, UserPlus, UserX } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/contexts/ToastContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { usePhonePortrait } from "@/hooks/usePhonePortrait";
import { useCanLockOrientation } from "@/hooks/useOrientationLock";
import { lockLandscape, releaseLandscape } from "@/lib/orientationLock";
import { getPublicProfile, type PublicProfile } from "@/lib/publicProfile";
import { rememberRoom } from "@/lib/roomHistory";
import { banPlayer, kickPlayer, leaveRoom, setSeatOrder, startRoomMatch, watchRoom, type RoomDoc } from "@/lib/rooms";
import type { GameType } from "@/lib/matchmaking";
import type { MindiOnlineState } from "./MindiOnlineClient";
import type { GinOnlineState } from "./GinRummyOnlineClient";
import { Sheet } from "@/components/layout/phone/Sheet";
import { TurningPhone } from "@/components/layout/phone/TurningPhone";
import { ArenaSprite } from "./ArenaSprite";
import { useRoomPhone } from "./RoomBoardParts";
import { RoomInviteDialog } from "./RoomInviteDialog";

type InitialState = (type: GameType, players: string[], mode?: "team2v2" | "ffa1v1") => MindiOnlineState | GinOnlineState;

/** RoomLobby / MRoomLobby / MRoomLobbyFull. The seated order is canonical;
 * only its visual position rotates to put the viewer at the bottom. */
export function RoomWaitingRoom({ gameId, gameType, code, myUid, buildInitialState }: { gameId: string; gameType: GameType; code: string; myUid: string; buildInitialState: InitialState }) {
  const router = useRouter(), t = useTranslation(), phone = useRoomPhone(), portrait = usePhonePortrait(), canLock = useCanLockOrientation();
  const { showToast } = useToast(), { getActiveRoomCards } = useEconomy();
  const [room, setRoom] = useState<RoomDoc | null>(null), [loaded, setLoaded] = useState(false), [loadError, setLoadError] = useState(false), [retry, setRetry] = useState(0);
  const [removed, setRemoved] = useState<"kicked" | "banned" | null>(null), [error, setError] = useState("");
  const [copied, setCopied] = useState(false), [starting, setStarting] = useState(false), [menuUid, setMenuUid] = useState<string | null>(null), [fresh, setFresh] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PublicProfile | null>>({});
  const seated = useRef(false), previous = useRef<string[]>([]), pending = useRef(false), copyTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => {
    setRoom(null); setLoaded(false); setLoadError(false); setRemoved(null); seated.current = false; previous.current = [];
    return watchRoom(code, next => {
      if (next?.players.includes(myUid)) { seated.current = true; rememberRoom(myUid, code); }
      else if (next?.status === "waiting" && (seated.current || next.bannedUids?.includes(myUid))) setRemoved(next.bannedUids?.includes(myUid) ? "banned" : "kicked");
      setFresh(next?.players.filter(uid => previous.current.length > 0 && !previous.current.includes(uid)) ?? []);
      previous.current = next?.players ?? []; setRoom(next); setLoaded(true);
    }, () => { setLoadError(true); setLoaded(true); });
  }, [code, myUid, retry]);
  const playerKey = room?.players.join("|") ?? "";
  useEffect(() => {
    let active = true;
    const players = playerKey ? playerKey.split("|") : [];
    void Promise.all(players.map(async uid => [uid, await getPublicProfile(uid).catch(() => null)] as const)).then(values => { if (active) setProfiles(Object.fromEntries(values)); });
    return () => { active = false; };
  }, [playerKey]);
  useEffect(() => () => clearTimeout(copyTimer.current), []);
  // Every player sees the sheet from the stored start snapshot. Navigation
  // waits for landscape so the ceremony cannot run behind a portrait gate.
  const matchReady = room?.status === "started" && !!room.matchId;
  useEffect(() => {
    if (matchReady && !portrait && !removed) router.replace(`/play/${room?.gameType === "mindi" ? "mindi" : "gin-rummy"}/ranked/live?m=${room?.matchId}`);
  }, [matchReady, portrait, removed, room?.matchId, room?.gameType, router]);
  const isOwner = room?.ownerUid === myUid;
  const full = !!room && room.players.length === room.maxPlayers;
  const hostName = room?.playerNames[room.ownerUid] || t("room_host");
  const rawOrder = room?.seatOrder?.filter(uid => room.players.includes(uid)) ?? [];
  const order = room ? [...rawOrder, ...room.players.filter(uid => !rawOrder.includes(uid))] : [];
  const gameName = (room?.gameType ?? gameType) === "mindi" ? "Mindi" : "Gin Rummy";
  const teams = room?.maxPlayers === 4 && room.gameType === "mindi";
  async function copy(value = code, shared = false) {
    try {
      await navigator.clipboard.writeText(value); setCopied(!shared);
      showToast(t(shared ? "room_linkCopied" : "room_codeCopied"), "success");
      clearTimeout(copyTimer.current); copyTimer.current = setTimeout(() => setCopied(false), 1500);
    } catch { showToast(t("toast_copyFailed"), "error"); }
  }
  async function share() {
    const url = new URL(`/play/${gameId}/room?code=${encodeURIComponent(code)}`, location.origin).href;
    if (navigator.share) {
      try { await navigator.share({ title: t("room_gameRoom").replace("{game}", gameName), text: code, url }); }
      catch (err) { if (!(err instanceof Error && err.name === "AbortError")) await copy(url, true); }
    } else await copy(url, true);
  }
  const handleLeave = useCallback(async () => {
    await leaveRoom(code, myUid).catch(() => {}); await releaseLandscape(); router.push("/play");
  }, [code, myUid, router]);
  async function mutate(action: () => Promise<unknown>) {
    if (pending.current) return;
    pending.current = true; setError(""); setMenuUid(null);
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : String(err)); }
    finally { pending.current = false; }
  }
  async function start() {
    if (!room || !isOwner || !full || pending.current || matchReady) return;
    if (phone) void lockLandscape(); // Start's tap is the required user gesture.
    setStarting(true);
    await mutate(() => startRoomMatch(code, myUid, players => buildInitialState(room.gameType, players, room.mindiMode ?? "team2v2")));
    setStarting(false);
  }
  const closeMenu = useCallback(() => setMenuUid(null), []);
  useEffect(() => {
    if (!menuUid || phone) return;
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") closeMenu(); };
    const click = (event: PointerEvent) => { if (!(event.target as Element).closest(".menu2,.seat .ibtn")) closeMenu(); };
    window.addEventListener("keydown", key); window.addEventListener("pointerdown", click);
    return () => { window.removeEventListener("keydown", key); window.removeEventListener("pointerdown", click); };
  }, [menuUid, phone, closeMenu]);
  const namespaces = `arena-app arena-phone arena-roomlobby ${phone ? "arena-mroomlobby" : ""}`;
  const pageClass = `room-page room-waiting-page ${phone ? "m mpage" : "ar-page"}`;
  if (loadError || !loaded || !room || removed || room.status === "closed") {
    const key = loadError ? "roomlobby_loadError" : !loaded ? "roomlobby_loadingRoom" : removed === "banned" ? "roomlobby_bannedMsg" : removed ? "roomlobby_removedMsg" : !room ? "roomlobby_notFound" : "roomlobby_closed";
    return <div className={namespaces}><main className={pageClass}><section className="panel tick room-state" role={loadError ? "alert" : "status"}>
      <span className={`itile ${loadError ? "b" : ""}`}>{!loaded ? <RefreshCw aria-hidden="true" className="spin" /> : removed === "banned" ? <Ban aria-hidden="true" /> : <Users aria-hidden="true" />}</span><p>{t(key)}</p>
      {loadError ? <button className="ar-btn blue" onClick={() => setRetry(n => n + 1)}><RefreshCw aria-hidden="true" />{t("error_tryAgain")}</button> : loaded && <Link className="ar-btn" href="/play">{t("roomlobby_backToPlay")}</Link>}
    </section></main></div>;
  }
  const card = isOwner ? getActiveRoomCards()[0] : undefined;
  const name = (uid?: string) => uid ? room.playerNames[uid] || t("profile_player") : t("room_openSeat").toLowerCase();
  const passwordText = room.password ? t("room_passwordOn") : t("room_passwordOff");
  const passwordDetail = room.password ? `${t("room_on")}${isOwner ? ` · ${room.password}` : ""}` : t("room_off");
  const passwordLabel = room.password && isOwner && !phone ? `${t("room_password")} · ${room.password}` : passwordText;
  const countLine = t(phone ? "room_phoneSeatCount" : "room_inviteSeats").replace("{n}", String(room.players.length)).replace("{max}", String(room.maxPlayers)).replace("{mode}", t(teams ? "room_twoTeams" : "room_oneOnOne")).toLowerCase();
  const rotateOpen = portrait && (starting || matchReady);
  const codeTiles = <div className="bigcode" aria-label={code}>{Array.from(code, (char, i) => <i key={i}>{char}</i>)}</div>;
  const passwordPill = <span className="pill line" style={{ height: 22 }}><Lock aria-hidden="true" />{passwordLabel}</span>;
  const codeCard = phone ? <section className="panel tick b room-code-card" aria-label={t("room_code")}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><span className="lbl dash" style={{ color: "#8AF0F5" }}>{t("room_code")}</span>{passwordPill}</div>{codeTiles}<div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><button className="minib blue" style={{ height: 42, justifyContent: "center" }} onClick={() => void copy()}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{t("room_copyCode")}</button><button className="minib dim" style={{ height: 42, justifyContent: "center", color: "#fff", cursor: "pointer" }} onClick={share}><Share2 aria-hidden="true" />{t("room_shareLink")}</button></div></section> : <div className="codebox" aria-label={`${t("room_code")} ${code}`}><div style={{ display: "flex", flexDirection: "column", gap: 10 }}><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span className="lbl" style={{ color: "#8AF0F5" }}>{t("room_code")}</span>{passwordPill}</div>{codeTiles}</div><div style={{ display: "flex", flexDirection: "column", gap: 8 }}><button className="ibtn" aria-label={t("room_copyCode")} onClick={() => void copy()}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button><button className="ibtn" aria-label={t("room_shareLink")} onClick={share}><Share2 aria-hidden="true" /></button></div></div>;
  const menu = menuUid ? <><button data-flat role={phone ? undefined : "menuitem"} onClick={() => { router.push(`/player?uid=${encodeURIComponent(menuUid)}`); closeMenu(); }}><User aria-hidden="true" />{t("room_viewProfile")}</button>{isOwner && menuUid !== myUid && <><button data-flat role={phone ? undefined : "menuitem"} onClick={() => void mutate(() => kickPlayer(code, myUid, menuUid))}><UserX aria-hidden="true" />{t("room_remove")}</button><button data-flat className="danger" role={phone ? undefined : "menuitem"} onClick={() => void mutate(() => banPlayer(code, myUid, menuUid))}><Ban aria-hidden="true" />{t("room_ban")}</button></>}</> : null;
  const myIndex = Math.max(0, order.indexOf(myUid));
  const seatItems = Array.from({ length: room.maxPlayers }, (_, index) => {
    const uid = order[index], position = (index - myIndex + room.maxPlayers) % room.maxPlayers;
    const spot = room.maxPlayers === 2 ? [0,2][position] : position;
    const blue = teams ? index % 2 === 1 : uid !== myUid;
    const rank = profiles[uid];
    const line = uid === room.ownerUid ? `${t("room_host")}${phone && uid === myUid ? ` · ${t("room_you").toLowerCase()}` : ""}` : rank ? `${rank.currentRank} · ${rank.trophies}` : t("profile_player");
    const cls = `${phone ? "st3" : "seat"} ${!uid ? "open" : blue ? "b" : ""} ${fresh.includes(uid) ? "join" : ""}`;
    const left = phone ? spot === 1 ? "-6px" : spot === 3 ? "calc(100% - 90px)" : "calc(50% - 48px)" : spot === 1 ? "0" : spot === 3 ? "calc(100% - 216px)" : "calc(50% - 108px)";
    const top = phone ? [252,126,0,126][spot] : spot === 0 ? "calc(100% - 72px)" : spot === 2 ? 0 : "calc(50% - 36px)";
    const avatar = <span className={`av ${blue ? "them" : ""}`}>{uid ? name(uid)[0] : <UserPlus aria-hidden="true" />}</span>;
    if (phone) return <button key={index} type="button" className={cls} style={{ left, top }} onClick={() => { if (uid && uid !== myUid) setMenuUid(uid); else if (!uid) document.getElementById("room-friends")?.scrollIntoView({behavior:"smooth"}); }} aria-label={uid ? `${name(uid)}, ${line}` : t("room_openSeat")}>
      {avatar}<b>{uid ? name(uid) : t("room_openSeat")}{uid === room.ownerUid && <Crown aria-hidden="true" />}</b><span>{uid ? line : t("room_inviteShort")}</span>
    </button>;
    return <div className={cls} style={{ left, top }} key={index}>{avatar}<div className="tx"><b>{uid ? name(uid) : t("room_openSeat")}{uid === room.ownerUid && <Crown aria-label={t("room_host")} />}{uid === myUid && <span className="you">{t("room_you")}</span>}</b><span>{uid && <i className={`dot ${blue ? "them" : ""}`} />}{uid ? line : t("room_inviteFriend")}</span></div>{isOwner && uid && uid !== myUid && <button className="ibtn" aria-label={t("room_optionsFor").replace("{name}", name(uid))} aria-expanded={menuUid === uid} onClick={() => setMenuUid(menuUid === uid ? null : uid)}><Ellipsis aria-hidden="true" /></button>}</div>;
  });
  const startControl = isOwner ? <button className="ar-btn full" style={{ width: phone ? "100%" : 300, height: phone ? 56 : undefined, fontSize: phone ? 16 : undefined }} disabled={!full || starting || matchReady} onClick={start}>{starting || matchReady ? <i className="spin" /> : full && <Play aria-hidden="true" />}{starting || matchReady ? t("room_starting") : full ? t("room_startMatch") : `${t("room_waitingPlayers")} · ${room.players.length}/${room.maxPlayers}`}</button> : <span className="muted" role="status" style={{ display: "inline-flex", alignItems: "center", gap: 10, height: 58 }}><span className="pulse" style={{ width: 10, height: 10 }} />{t("room_waitHost").replace("{host}", hostName)}</span>;
  const swap = isOwner && teams ? <button className={`ar-btn ghost ${phone ? "full" : "sm"}`} style={phone ? { height: 46, marginTop: 8, fontSize: 13 } : undefined} disabled={order.length < 3 || starting || matchReady} onClick={() => void mutate(() => { const next = [...order]; [next[1],next[2]] = [next[2],next[1]]; return setSeatOrder(code, myUid, next); })}><ArrowLeftRight aria-hidden="true" />{t("room_swapPartners")}</button> : null;
  const details = [[Layers,t("room_game"),`${gameName} · ${t("room_nSeats").replace("{n}", String(room.maxPlayers))}`],[Lock,t("room_password"),passwordDetail],[Ticket,t("room_card"),card ? t("room_minutesLeft").replace("{n}", String(Math.ceil((card.remainingTime ?? 0)/60000))) : isOwner ? t("room_noCard") : hostName],[Crown,t("room_host"),isOwner ? t("room_you") : hostName]] as const;
  return <><ArenaSprite /><div className={namespaces}><main className={pageClass}>
    {phone ? <header className="mtop room-top"><button className="ibtn mback" aria-label={t("roomlobby_leaveRoom")} onClick={handleLeave}><ChevronLeft aria-hidden="true" /></button><span className="ttl">{t("room_gameRoom").replace("{game}",gameName)}</span><div className="tr"><button className="ibtn" aria-label={t("room_shareLink")} onClick={share}><Share2 aria-hidden="true" /></button></div></header> : <div className="phead"><div><button className="back2" onClick={handleLeave}><LogOut aria-hidden="true" />{t("roomlobby_leaveRoom")}</button><span className="lbl dash" style={{ display: "flex", color: "#C6FF33" }}>{t("room_privateMode").replace("{game}", gameName).replace("{mode}", t(teams ? "room_twoTeams" : "room_oneOnOne"))}</span><h1 className="disp chrome">{t("room_gameRoom").replace("{game}", gameName)}</h1></div>{codeCard}</div>}
    {phone && codeCard}{error && <p className="err" role="alert">{error}</p>}
    <div className="room-lobby-grid"><section className="panel tick room-seats" aria-label={t("room_seats")}>
      <div className={phone ? "sech" : "ph"}><h2>{t("room_seats")}</h2><span className={phone ? "muted2" : "count3"} style={phone ? { marginLeft: "auto" } : undefined}>{countLine}</span>{!phone && swap}</div>
      <div className={phone ? "arena3" : "arena2"}><div className={phone ? "oval3" : "oval"} aria-hidden="true" /><div className={phone ? "mid3" : "mid2"} role="status">{!full && <span className="pulse" style={phone ? { width: 10, height: 10 } : undefined} />}<b>{starting || matchReady ? t("room_starting") : full ? t("room_tableFull") : t(phone ? "room_moreToGo" : "room_waitMore").replace("{n}", String(room.maxPlayers - room.players.length))}</b><span>{full ? t(isOwner ? phone ? "room_startReadyShort" : "room_startReady" : "room_waitHost").replace("{host}",hostName) : t(phone ? room.maxPlayers === 4 ? "room_needFourSeats" : "room_needTwoSeats" : "room_needSeats").replace("{n}", String(room.maxPlayers))}</span></div>{seatItems}{!phone && menuUid && <div className="menu2" role="menu" style={{ right: 0, top: 237 }}>{menu}</div>}</div>
      <div className="room-seat-footer">{teams && <><span className="teamk"><i />{t("roomlobby_teamA")} · {name(order[0])} &amp; {name(order[2])}</span><span className="teamk b"><i />{t("roomlobby_teamB")} · {name(order[1])} &amp; {name(order[3])}</span></>}{!phone && <div style={{ marginLeft: "auto" }}>{startControl}</div>}</div>{phone && swap}
    </section><div className="room-lobby-side"><RoomInviteDialog room={room} myUid={myUid} phone={phone} /><section className="panel room-details" aria-label={t("room_details")}>{details.filter((_,i) => !phone || i < 3).map(([Symbol,label,value]) => <div className="dl3" key={label}><span><Symbol aria-hidden="true" />{label}</span><b>{value}</b></div>)}</section></div></div>
    {phone && <div className="dock2">{startControl}</div>}
  </main></div>
  <Sheet open={phone && !!menuUid} onClose={closeMenu} label={name(menuUid ?? undefined)} namespace="arena-roomlobby arena-mroomlobby" className="m room-seat-sheet" style={{display:"flex",flexDirection:"column",gap:14}}><div style={{ display: "flex", alignItems: "center", gap: 12, paddingTop: 4 }}><span className={`av ${order.indexOf(menuUid ?? "") % 2 ? "them" : ""}`} style={{ width: 48, height: 48, borderRadius: 12, fontSize: 20 }}>{name(menuUid ?? undefined)[0]}</span><div><h2 className="disp" style={{ margin: 0, fontSize: 22 }}>{name(menuUid ?? undefined)}</h2><p className="muted2" style={{margin:"5px 0 0"}}>{profiles[menuUid ?? ""] ? `${profiles[menuUid!]?.currentRank} · ${profiles[menuUid!]?.trophies}` : t("profile_player")}{teams && ` · ${t(order.indexOf(menuUid ?? "") % 2 ? "roomlobby_teamB" : "roomlobby_teamA")}`}</p></div></div><div className="acts2">{menu}</div><button className="ar-btn ghost full" onClick={closeMenu}>{t("common_cancel")}</button></Sheet>
  <Sheet open={rotateOpen} onClose={handleLeave} label={t("rotate_title")} headingId="room-rotate-title" namespace="arena-mroomlobby" className="tick" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}><TurningPhone small /><span className="lbl dash" style={{ color: "#C6FF33" }}>{t("room_matchStarting")}</span><h2 id="room-rotate-title" className="disp chrome" style={{ margin: 0, fontSize: 32 }}>{t("rotate_title")}</h2><p className="body" style={{ margin: 0, maxWidth: 300, fontSize: 14 }}>{t("room_rotateBody")}</p><div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 2 }}>{order.map((uid,i) => <span className={`av ${i % 2 ? "them" : ""}`} key={uid} style={{ width: 30, height: 30, borderRadius: 8, fontSize: 13 }}>{name(uid)[0]}</span>)}<span className="muted2" style={{ marginLeft: 4 }}>{t(room.maxPlayers === 4 ? "room_allFourSeated" : "room_bothSeated")}</span></div>{canLock && <button className="ar-btn full" onClick={() => void lockLandscape()}><Smartphone aria-hidden="true" />{t("rotate_goLandscape")}</button>}<button className="ar-btn ghost full" style={{ marginTop: 6 }} onClick={handleLeave}><LogOut aria-hidden="true" />{t("roomlobby_leaveRoom")}</button><p className="hint2" style={{ margin: "2px 4px 0", textAlign: "left" }}><Info aria-hidden="true" /><span>{t(canLock ? "rotate_androidHint" : "rotate_lockHint")}</span></p></Sheet>
  </>;
}
