"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus, Lock, Hash, ClipboardPaste, Eye, EyeOff, X, Check, Info, ChevronLeft, ChevronRight, CircleAlert } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "@/hooks/useTranslation";
import { createRoom, getRoom, joinRoom, watchRoom, type RoomDoc } from "@/lib/rooms";
import { watchRoomInvites, dismissRoomInvite, type RoomInviteDoc } from "@/lib/friends";
import { rememberRoom } from "@/lib/roomHistory";
import { Sheet } from "@/components/layout/phone/Sheet";
import { ArenaSprite } from "./ArenaSprite";
import { RecentRooms } from "./RecentRooms";
import { RoomCardBadge, RoomDeck, SeatGlyph, useRoomPhone } from "./RoomBoardParts";
import { rememberRoomReturn } from "@/lib/authReturn";

const games = [{ id: "mindi", name: "Mindi", type: "mindi" }, { id: "gin-rummy", name: "Gin Rummy", type: "gin_rummy" }] as const;
const normalize = (code: string) => code.replace(/\s/g, "").toUpperCase();
const validCode = (code: string) => /^[A-Z2-9]{6}$/.test(code);
const message = (error: unknown) => error instanceof Error ? error.message : "Your connection was interrupted. Please try again.";

/** Rooms / MRooms / MRoomsCreate, with one live set of room subscriptions. */
export function PrivateRoomSetup({ gameId, autoJoinCode, inviteToken, onEntered }: { gameId: string; autoJoinCode?: string; inviteToken?: string; onEntered?: () => void }) {
  const router = useRouter(), t = useTranslation(), phone = useRoomPhone();
  const { user, isGuest } = useAuth();
  const { getActiveRoomCards } = useEconomy();
  const { showToast } = useToast();
  const [selected, setSelected] = useState(gameId), [tab, setTab] = useState<"join" | "create">("join");
  const [players, setPlayers] = useState("4"), [protectedRoom, setProtected] = useState(false);
  const [password, setPassword] = useState(""), [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState(autoJoinCode || ""), [joinPassword, setJoinPassword] = useState(""), [joinEye, setJoinEye] = useState(false);
  const [prompt, setPrompt] = useState<{ code: string; host: string } | null>(null);
  const [error, setError] = useState<{ area: "create" | "join"; text: string } | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const pending = useRef(false), modal = useRef<HTMLDialogElement>(null), codeInput = useRef<HTMLInputElement>(null);
  const pasteTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const [invites, setInvites] = useState<RoomInviteDoc[]>([]), [inviteRooms, setInviteRooms] = useState<Record<string, RoomDoc | null>>({});
  const [inviteError, setInviteError] = useState(false), [inviteAttempt, setInviteAttempt] = useState(0);
  const uid = !isGuest ? user?.uid ?? "" : "";
  const card = uid ? getActiveRoomCards()[0] : undefined, canHost = !!uid && !!card, gin = selected === "gin-rummy";
  useEffect(() => { setSelected(gameId); }, [gameId]);
  useEffect(() => {
    if (!phone && prompt) { modal.current?.showModal(); modal.current?.querySelector<HTMLInputElement>("input")?.focus(); }
    else modal.current?.close();
  }, [prompt, phone]);
  useEffect(() => {
    setInvites([]); setInviteError(false);
    if (!uid) return;
    return watchRoomInvites(uid, setInvites, () => setInviteError(true));
  }, [uid, inviteAttempt]);
  useEffect(() => {
    setInviteRooms({});
    const stops = [...new Set(invites.map(item => item.code))].map(value => watchRoom(value, room => setInviteRooms(old => ({ ...old, [value]: room })), () => setInviteRooms(old => ({ ...old, [value]: null }))));
    return () => stops.forEach(stop => stop());
  }, [invites]);
  useEffect(() => () => pasteTimers.current.forEach(clearTimeout), []);
  const enter = (roomCode: string, type: string) => {
    rememberRoom(user!.uid, roomCode);
    if (roomCode === autoJoinCode && onEntered) { onEntered(); return; }
    router.push(`/play/${type === "mindi" ? "mindi" : "gin-rummy"}/room?code=${roomCode}`);
  };
  async function create() {
    if (pending.current || !canHost || (protectedRoom && !password.trim())) return;
    pending.current = true; setBusy("create"); setError(null);
    try {
      const game = games.find(item => item.id === selected) || games[0];
      const roomCode = await createRoom(user!.uid, user!.displayName || "Player", game.type, protectedRoom ? password : null, "casual", !gin && players === "4" ? "team2v2" : "ffa1v1");
      showToast(t("room_created"), "success"); enter(roomCode, game.type);
    } catch (err) { setError({ area: "create", text: message(err) }); }
    finally { pending.current = false; setBusy(null); }
  }
  async function join(value = code, suppliedPassword = "", token = inviteToken) {
    if (pending.current) return;
    const roomCode = normalize(value); setCode(roomCode); setError(null);
    if (!roomCode) { setError({ area: "join", text: "Enter a room code." }); return; }
    if (!validCode(roomCode)) { setError({ area: "join", text: "That room code does not look valid. Use the six-character code." }); return; }
    if (!user || isGuest) { setError({ area: "join", text: "Sign in to join a private room." }); return; }
    pending.current = true; setBusy("join");
    try {
      const room = await getRoom(roomCode);
      if (!room) throw new Error("Room not found. Check the code and try again.");
      if (room.mode === "rankedDuo") throw new Error("This is a ranked party. Join it from Ranked mode.");
      if (room.players.includes(user.uid)) { enter(roomCode, room.gameType); return; }
      if (room.password && !suppliedPassword && !token && !room.players.includes(user.uid)) { setPrompt({ code: roomCode, host: room.playerNames[room.ownerUid] || t("room_host") }); setJoinPassword(""); setJoinEye(false); return; }
      await joinRoom(roomCode, user.uid, user.displayName || "Player", suppliedPassword, token);
      await Promise.allSettled(invites.filter(item => item.code === roomCode).map(item => dismissRoomInvite(item.id)));
      setPrompt(null); showToast(t("room_joined"), "success"); enter(roomCode, room.gameType);
    } catch (err) { setError({ area: "join", text: message(err) }); }
    finally { pending.current = false; setBusy(null); }
  }
  useEffect(() => {
    if (autoJoinCode && uid) void join(autoJoinCode);
    // Automatic entry runs once per account/link; manual retries use the form.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoJoinCode, inviteToken, uid]);
  async function paste() {
    try {
      const value = normalize(await navigator.clipboard.readText()).slice(0, 6);
      setCode(""); setError(null); pasteTimers.current.forEach(clearTimeout);
      pasteTimers.current = Array.from(value, (_, i) => setTimeout(() => setCode(value.slice(0, i + 1)), (i + 1) * 70));
      codeInput.current?.focus();
    } catch { showToast(t("room_clipboardUnavailable"), "error"); }
  }
  const closePrompt = useCallback(() => { if (!pending.current) { setPrompt(null); setError(null); } }, []);
  const resumeAfterLogin = () => {
    if (validCode(code)) rememberRoomReturn(`/play/${gameId}/room?code=${encodeURIComponent(code)}${inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : ''}`);
  };
  const title = (create: boolean) => <div className="room-panel-title"><span className={`itile ${create ? "" : "b"}`}>{create ? <Plus aria-hidden="true" /> : <Hash aria-hidden="true" />}</span><div><h2 className="disp">{t(create ? "room_create" : "room_joinCode")}</h2><p className="muted">{t(create ? "room_pickGame" : "room_askCode")}</p></div></div>;
  const createForm = <form id="create-room" className="panel tick room-form" onSubmit={event => { event.preventDefault(); void create(); }}>
    {title(true)}
    <div className="stack3"><span className="flabel">{t("room_game")}</span><div className="room-game-grid" role="group" aria-label={t("room_game")}>
      {games.map(game => <button type="button" className="gtile" aria-pressed={selected === game.id} disabled={!!busy} onClick={() => { setSelected(game.id); if (game.id === "gin-rummy") setPlayers("2"); }} key={game.id}><RoomDeck gin={game.id === "gin-rummy"} /><span className="tx"><b>{game.name}</b>{!phone && <span className="thaana" lang="dv" dir="rtl" style={{ alignSelf: "flex-start", fontSize: 15 }}>{game.id === "mindi" ? "މިންޑި" : "ޖިން ރަމީ"}</span>}<span>{t(game.id === "mindi" ? phone ? "room_mindiSeatsShort" : "room_mindiSeats" : "room_ginSeats")}</span></span><span className="ck"><Check aria-hidden="true" /></span></button>)}
    </div></div>
    <div className="stack3"><span className="flabel">{t("room_seats")}</span><div className="tabs seats" role="group" aria-label={t("room_seats")}>
      <button type="button" aria-pressed={!gin && players === "4"} disabled={!!busy || gin} onClick={() => setPlayers("4")}><SeatGlyph four />{t(phone ? "room_fourShort" : "room_four")}</button>
      <button type="button" aria-pressed={gin || players === "2"} disabled={!!busy} onClick={() => setPlayers("2")}><SeatGlyph four={false} />{t(phone ? "room_twoShort" : "room_two")}</button>
    </div><p className="help">{t(gin ? "room_ginHelp" : players === "4" ? "room_teamHelp" : "room_duelHelp")}</p></div>
    <div className="stack3"><span className="flabel">{t("room_password")}<span style={{ letterSpacing: ".1em", color: "#6E6E7C" }}>{t("room_optional")}</span></span>
      <div className={`pwrow ${protectedRoom ? "on" : ""}`}><span className="ti"><Lock aria-hidden="true" /></span><div className="tx" style={{ flex: "1 1 0" }}><b>{t("room_lock")}</b><span>{t(protectedRoom ? "room_passwordOnly" : "room_anyoneCode")}</span></div><button type="button" className="sw" role="switch" aria-checked={protectedRoom} aria-label={t("room_protect")} disabled={!!busy} onClick={() => { setProtected(!protectedRoom); setPassword(""); setShowPassword(false); }} /></div>
      {protectedRoom && <div className="pwf"><input aria-label={t("room_password")} type={showPassword ? "text" : "password"} placeholder={t("room_enterPassword")} maxLength={32} value={password} onChange={event => setPassword(event.target.value)} required autoComplete="new-password" disabled={!!busy} /><button type="button" className="ibtn" aria-label={t(showPassword ? "room_hidePassword" : "room_showPassword")} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div>}
    </div>
    {error?.area === "create" && <p className="err" role="alert">{error.text}</p>}
    <div className="stack3" style={{ gap: 12 }}><button className="ar-btn full" type="submit" disabled={!!busy || !canHost || (protectedRoom && !password.trim())}>{busy === "create" && <i className="spin" />}{t(busy === "create" ? "room_creating" : "room_create")}{!busy && <ArrowRight aria-hidden="true" />}</button><p className="help room-card-note"><Info aria-hidden="true" /><span>{!uid ? <Link href="/login">Sign in to create private rooms.</Link> : t(card ? "room_covered" : "room_activateCard")}</span></p></div>
  </form>;
  const joinForm = <form className="panel tick b room-form room-join-form" onSubmit={event => { event.preventDefault(); void join(); }}>
    {title(false)}
    <div className={`code ${error?.area === "join" && error.text.startsWith("Room not found") ? "bad" : ""}`} role="group" aria-label={t("room_code")}>
      {Array.from({ length: 6 }, (_, i) => <i key={`${i}-${code[i] || ""}`} className={code[i] ? "on" : i === code.length ? "cur" : ""} aria-hidden="true">{code[i] || ""}</i>)}
      <input ref={codeInput} aria-label={t("room_code")} value={code} maxLength={6} autoCapitalize="characters" autoComplete="off" spellCheck={false} onChange={event => { pasteTimers.current.forEach(clearTimeout); setCode(normalize(event.target.value).slice(0,6)); setError(null); }} disabled={!!busy} />
    </div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: phone ? 10 : 12, marginTop: phone ? -4 : -6 }}><button type="button" className="lnk" onClick={paste} disabled={!!busy}><ClipboardPaste aria-hidden="true" />{t("room_paste")}</button><span className="muted2" style={phone ? { fontSize: 11.5 } : undefined}>{t(phone ? "room_codeHintShort" : "room_codeHint")}</span></div>
    {error?.area === "join" && !prompt && <p className="err" role="alert"><CircleAlert aria-hidden="true" />{error.text}</p>}
    {!uid && <p className="help"><Link href="/login" onClick={resumeAfterLogin}>Sign in to join private rooms.</Link></p>}
    <button className="ar-btn blue full" type="submit" disabled={!!busy || !uid || code.length < 6}>{t(busy === "join" ? "room_joining" : "room_join")}<ArrowRight aria-hidden="true" /></button>
  </form>;
  const invitePanel = <section className={`${phone ? "sec" : "panel"} room-invites`} aria-label={t("room_invites")}>
    <div className={phone ? "sech" : "ph"}><h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>{t("room_invites")}<span className="pill blue" style={{ height: phone ? 20 : 22 }}>{invites.length}</span></h2><Link className="link b" href="/friends">{t("nav_friends")}{!phone && <ChevronRight aria-hidden="true" />}</Link></div>
    {inviteError ? <div role="alert"><p>{t("room_inviteLoadError")}</p><button className="minib blue" onClick={() => setInviteAttempt(n => n + 1)}>{t("error_tryAgain")}</button></div> : !invites.length ? <p className="muted2">{t("room_noInvites")}</p> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{invites.map(invite => {
      const room = inviteRooms[invite.code], loaded = room !== undefined;
      const full = !!room && room.players.length >= room.maxPlayers;
      const disabled = !loaded || !room || room.status !== "waiting" || full || room.bannedUids?.includes(uid);
      const age = Math.max(0, Math.floor((Date.now() - invite.createdAt) / 60000));
      const line = `${invite.gameType === "mindi" ? "Mindi" : "Gin Rummy"} · ${full ? t("room_tableFull").toLowerCase() : room ? t(phone ? "room_inviteSeatsShort" : "room_inviteSeats").replace("{n}", String(room.players.length)).replace("{max}", String(room.maxPlayers)) : t("room_unavailable")} · ${t("room_minutesAgo").replace("{n}", String(age))}`;
      return <div className="inv" key={invite.id}><span className={`av ${invite.gameType === "gin_rummy" ? "them" : ""}`}>{invite.fromName[0]}</span><div className="tx"><b>{t("room_invitedYou").replace("{name}", invite.fromName)}</b><span>{line}</span></div><button className={`minib ${disabled ? "dim" : "lime"}`} disabled={!!disabled || !!busy} onClick={() => { void join(invite.code, "", invite.id); }}>{t(full ? "room_full" : disabled ? "room_unavailable" : "room_joinShort")}</button></div>;
    })}</div>}
  </section>;
  const passwordBody = <form onSubmit={event => { event.preventDefault(); if (prompt) void join(prompt.code, joinPassword); }} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span className="itile" style={{ width: phone ? 44 : 52, height: phone ? 44 : 52 }}><Lock aria-hidden="true" /></span><div><h2 id="room-password-title" className="disp" style={{ margin: 0, fontSize: phone ? 24 : 28 }}>{t("room_passwordTitle")}</h2><p className="muted2" style={{ margin: "5px 0 0" }}>{t("room_lockedAsk").replace("{code}", prompt?.code ?? "").replace("{host}", prompt?.host ?? "")}</p></div></div>
    <div className="pwf"><input tabIndex={0} aria-label={t("room_joinPassword")} type={joinEye ? "text" : "password"} autoComplete="current-password" placeholder={t("room_enterPassword")} value={joinPassword} maxLength={32} onChange={event => setJoinPassword(event.target.value)} required disabled={!!busy} /><button type="button" className="ibtn" aria-label={t(joinEye ? "room_hidePassword" : "room_showPassword")} onClick={() => setJoinEye(!joinEye)}>{joinEye ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}</button></div>
    {error?.area === "join" && <p role="alert" className="err">{error.text}</p>}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: phone ? 10 : 12, marginTop: phone ? 0 : 8 }}><button className={`ar-btn ghost ${phone ? "full" : "sm"}`} type="button" disabled={!!busy} onClick={closePrompt}>{t("common_cancel")}</button><button className={`ar-btn blue ${phone ? "full" : "sm"}`} type="submit" disabled={!!busy || !joinPassword}>{t("room_join")}</button></div>
  </form>;
  return <><ArenaSprite /><div className={`arena-app arena-phone arena-rooms ${phone ? "arena-mrooms" : ""}`}>
    {phone && <header className="mtop room-top"><Link href="/play" className="ibtn mback" aria-label={t("roomlobby_backToPlay")}><ChevronLeft aria-hidden="true" /></Link><span className="ttl">{t("nav_play")}</span><div className="tr" /></header>}
    <main className={`room-page ${phone ? "m mpage" : "ar-page"}`}>
    <div className={phone ? "mh" : "phead"}><div>{!phone && <Link href="/play" className="back2"><ArrowLeft aria-hidden="true" />{t("roomlobby_backToPlay")}</Link>}<span className="lbl dash" style={{ display: "flex", color: "#C6FF33" }}>{t("room_people")}</span><h1 className="disp chrome" style={phone ? { fontSize: 42 } : undefined}>{t("room_title")}</h1><p className={phone ? "sub muted" : "sub2"}>{t("room_intro")}</p></div>{!phone && <RoomCardBadge card={card} phone={false} />}</div>
    {phone && <><RoomCardBadge card={card} phone /><div className="tabs room-tabs" role="tablist" aria-label={t("room_title")}><button role="tab" aria-selected={tab === "join"} onClick={() => setTab("join")}><Hash aria-hidden="true" />{t("room_joinTab")}</button><button role="tab" aria-selected={tab === "create"} onClick={() => setTab("create")}><Plus aria-hidden="true" />{t("room_create")}</button></div></>}
    {phone ? tab === "create" ? createForm : <>{joinForm}{invitePanel}<RecentRooms uid={uid} busy={!!busy} onJoin={value => { void join(value); }} phone /></> : <><div className="room-setup-grid">{createForm}<div style={{ display: "flex", flexDirection: "column", gap: 20 }}>{joinForm}{invitePanel}</div></div><RecentRooms uid={uid} busy={!!busy} onJoin={value => { void join(value); }} /></>}
    {!phone && <dialog ref={modal} className="dlg room-password" onCancel={event => { if (busy) event.preventDefault(); else closePrompt(); }} aria-labelledby="room-password-title"><button type="button" className="ibtn" aria-label={t("common_close")} disabled={!!busy} onClick={closePrompt} style={{ position: "absolute", right: 16, top: 16, width: 38, height: 38 }}><X aria-hidden="true" /></button>{passwordBody}</dialog>}
  </main></div><Sheet open={phone && !!prompt} onClose={closePrompt} label={t("room_passwordTitle")} headingId="room-password-title" namespace="arena-rooms arena-mrooms room-password" className="m qsheet tick">{passwordBody}</Sheet></>;
}
