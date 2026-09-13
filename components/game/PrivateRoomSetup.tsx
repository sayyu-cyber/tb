"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Users, Plus, Lock, Hash, ClipboardPaste, Eye, EyeOff, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useToast } from "@/contexts/ToastContext";
import { Button } from "@/components/ui/Button";
import { createRoom, getRoom, joinRoom } from "@/lib/rooms";
import { rememberRoom } from "@/lib/roomHistory";
import { RecentRooms } from "./RecentRooms";

const games = [{ id: "mindi", name: "Mindi", type: "mindi" }, { id: "gin-rummy", name: "Gin Rummy", type: "gin_rummy" }] as const;
const normalize = (code: string) => code.replace(/\s/g, "").toUpperCase();
const validCode = (code: string) => /^[A-Z2-9]{6}$/.test(code);
const message = (error: unknown) => error instanceof Error ? error.message : "Your connection was interrupted. Please try again.";

export function PrivateRoomSetup({ gameId }: { gameId: string }) {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const { getActiveRoomCards } = useEconomy();
  const { showToast } = useToast();
  const [selected, setSelected] = useState(gameId);
  const [players, setPlayers] = useState("4");
  const [protectedRoom, setProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [joinPassword, setJoinPassword] = useState("");
  const [promptCode, setPromptCode] = useState<string | null>(null);
  const [error, setError] = useState<{ area: "create" | "join"; text: string } | null>(null);
  const [busy, setBusy] = useState<"create" | "join" | null>(null);
  const pending = useRef(false);
  const modal = useRef<HTMLDialogElement>(null);
  const canHost = !isGuest && !!user && getActiveRoomCards().length > 0;
  useEffect(() => { setSelected(gameId); }, [gameId]);
  useEffect(() => {
    if (promptCode) modal.current?.showModal();
    else modal.current?.close();
  }, [promptCode]);
  const enter = (roomCode: string, type: string) => {
    rememberRoom(user!.uid, roomCode);
    router.push(`/play/${type === "mindi" ? "mindi" : "gin-rummy"}/room?code=${roomCode}`);
  };
  async function create() {
    if (pending.current || !canHost || (protectedRoom && !password.trim())) return;
    pending.current = true; setBusy("create"); setError(null);
    try {
      const game = games.find(item => item.id === selected) || games[0];
      const roomCode = await createRoom(user!.uid, user!.displayName || "Player", game.type, protectedRoom ? password : null, "casual", players === "2" ? "ffa1v1" : "team2v2");
      showToast("Room created", "success"); enter(roomCode, game.type);
    } catch (err) { setError({ area: "create", text: message(err) }); }
    finally { pending.current = false; setBusy(null); }
  }
  async function join(value = code, suppliedPassword = "") {
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
      if (room.status !== "waiting") throw new Error("This game has already started or the room has closed.");
      if (room.bannedUids?.includes(user.uid)) throw new Error("You cannot join this room.");
      if (room.players.length >= room.maxPlayers && !room.players.includes(user.uid)) throw new Error("This room is full.");
      if (room.password && !suppliedPassword) { setPromptCode(roomCode); setJoinPassword(""); return; }
      await joinRoom(roomCode, user.uid, user.displayName || "Player", suppliedPassword);
      setPromptCode(null); showToast("Joined room", "success"); enter(roomCode, room.gameType);
    } catch (err) { setError({ area: "join", text: message(err) }); }
    finally { pending.current = false; setBusy(null); }
  }
  async function paste() {
    try { setCode(normalize(await navigator.clipboard.readText()).slice(0, 6)); }
    catch { showToast("Clipboard unavailable. Paste your code into the field.", "error"); }
  }
  return <div className="private-room-page">
    <Link href="/play" className="private-back"><ArrowLeft size={19} />Back to Play</Link>
    <header className="private-heading"><Users size={43} /><h1>Private Room</h1><p>Play with friends using a room code</p><small>Create your own room or join an existing one. Play your way, with your people.</small></header>
    <div className="private-actions">
      <form id="create-room" className="private-action private-create" onSubmit={event => { event.preventDefault(); void create(); }}>
        <header><span><Plus size={34} /></span><div><h2>Create a Room</h2><p>Set your game, invite friends, and play on your own terms.</p></div></header>
        <fieldset disabled={!!busy}><div className="private-fields">
          <label>Select Game<select value={selected} onChange={event => setSelected(event.target.value)}>{games.map(game => <option value={game.id} key={game.id}>{game.name}</option>)}</select></label>
          <label>Max Players<select value={selected === "mindi" ? players : "2"} onChange={event => setPlayers(event.target.value)}>{selected === "mindi" && <option value="4">4 - Teams</option>}<option value="2">2 - Head to head</option></select></label>
        </div>
        <label className="private-password-toggle"><Lock size={17} /><span>Password <small>Optional</small></span><input type="checkbox" role="switch" checked={protectedRoom} onChange={event => { setProtected(event.target.checked); setPassword(""); }} aria-label="Protect room with password" /></label>
        {protectedRoom && <div className="private-password-field"><input aria-label="Room password" type={showPassword ? "text" : "password"} placeholder="Enter room password" maxLength={32} value={password} onChange={event => setPassword(event.target.value)} required autoComplete="new-password" /><button type="button" title={showPassword ? "Hide password" : "Show password"} aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div>}
        </fieldset>
        {!canHost && <p className="private-notice">{isGuest || !user ? <Link href="/login">Sign in to create private rooms.</Link> : <>An active Room Card is required to host. <Link href="/room-cards">Manage Room Cards</Link></>}</p>}
        {error?.area === "create" && <p className="private-error" role="alert">{error.text}</p>}
        <Button fullWidth type="submit" loading={busy === "create"} disabled={!!busy || !canHost || (protectedRoom && !password.trim())}>{busy === "create" ? "Creating Room..." : "Create Room"}<ArrowRight size={18} /></Button>
      </form>
      <form className="private-action private-join" onSubmit={event => { event.preventDefault(); void join(); }}>
        <header><span><Users size={33} /></span><div><h2>Join with a Code</h2><p>Enter a room code to join your friends&apos; game.</p></div></header>
        <label htmlFor="room-code">Room Code</label>
        <div className="private-code-field"><Hash size={25} /><input id="room-code" placeholder="Enter code (e.g. ABC234)" value={code} maxLength={6} autoCapitalize="characters" autoComplete="off" spellCheck={false} onChange={event => setCode(normalize(event.target.value))} disabled={!!busy} /><button type="button" onClick={paste} aria-label="Paste room code" title="Paste room code" disabled={!!busy}><ClipboardPaste size={20} /></button></div>
        {error?.area === "join" && !promptCode && <p className="private-error" role="alert">{error.text}</p>}
        {isGuest && <p className="private-notice"><Link href="/login">Sign in to join private rooms.</Link></p>}
        <Button fullWidth type="submit" variant="secondary" disabled={!!busy || isGuest || !user} loading={busy === "join"}>{busy === "join" ? "Joining..." : "Join Room"}<ArrowRight size={18} /></Button>
      </form>
    </div>
    <RecentRooms uid={isGuest ? "" : user?.uid || ""} busy={!!busy} onJoin={value => { void join(value); }} />
    <dialog ref={modal} className="private-modal" onCancel={event => { if (busy) event.preventDefault(); else { setPromptCode(null); setError(null); } }} aria-labelledby="room-password-title">
      <form onSubmit={event => { event.preventDefault(); void join(promptCode!, joinPassword); }}>
        <button type="button" className="private-modal-close" aria-label="Close password prompt" disabled={!!busy} onClick={() => { setPromptCode(null); setError(null); }}><X size={20} /></button>
        <Lock size={29} /><h2 id="room-password-title">Room Password</h2><p>This room is protected.</p>
        <input autoFocus aria-label="Join room password" type="password" autoComplete="current-password" placeholder="Enter room password" value={joinPassword} maxLength={32} onChange={event => setJoinPassword(event.target.value)} required disabled={!!busy} />
        {error?.area === "join" && <p role="alert" className="private-error">{error.text}</p>}
        <div className="private-modal-actions"><Button variant="secondary" type="button" disabled={!!busy} onClick={() => { setPromptCode(null); setError(null); }}>Cancel</Button><Button type="submit" loading={busy === "join"} disabled={!!busy || !joinPassword}>Join Room</Button></div>
      </form>
    </dialog>
  </div>;
}
