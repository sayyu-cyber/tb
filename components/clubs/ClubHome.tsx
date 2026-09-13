"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, Send, LogOut, Trophy } from "lucide-react";
import { ClubDoc, ClubMessage, watchClubMessages, sendClubMessage, leaveClub, kickMember } from "@/lib/clubs";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/contexts/ToastContext";
export function ClubHome({ club, myUid, myName }: { club: ClubDoc; myUid: string; myName: string }) {
  const [tab, setTab] = useState<"members" | "chat">("members");
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isOwner = club.ownerUid === myUid;
  const t = useTranslation();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);
  const action = useRef(false);
  const [confirm, setConfirm] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [chatLoaded, setChatLoaded] = useState(false);
  const [chatRetry, setChatRetry] = useState(0);

  useEffect(() => { if (confirm) dialog.current?.showModal(); }, [confirm]);

  useEffect(() => {
    if (tab !== "chat") return;
    setChatLoaded(false); setError(null); setMessages([]);
    return watchClubMessages(club.id, next => { setMessages(next); setChatLoaded(true); },
      () => { setError("Couldn't load club chat."); setChatLoaded(true); });
  }, [tab, club.id, chatRetry]);

  useEffect(() => {
    if (tab === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, tab]);

  async function handleSend() {
    if (!text.trim() || action.current) return;
    action.current = true; setBusy(true); setError(null);
    const toSend = text;
    try { await sendClubMessage(club.id, myUid, myName, toSend); setText(""); }
    catch { setError("Message not sent. Please try again."); }
    finally { action.current = false; setBusy(false); }
  }

  async function handleLeave() {
    await rosterAction(() => leaveClub(club.id, myUid), "Left club.");
  }

  async function handleKick(uid: string) {
    await rosterAction(() => kickMember(club.id, myUid, uid), "Member removed.");
  }

  async function rosterAction(run: () => Promise<void>, message: string) {
    if (action.current) return;
    action.current = true; setBusy(true); setError(null);
    try { await run(); setConfirm(null); showToast(message, "success"); }
    catch { setError("Couldn't update membership. Please try again."); setConfirm(null); }
    finally { action.current = false; setBusy(false); }
  }

  const sortedMembers = [...club.members].sort((a, b) => (club.memberTrophies[b] ?? 0) - (club.memberTrophies[a] ?? 0));

  return (
    <div className="club-detail">
      <h2 className="mb-4">{club.name}</h2>

      <div className="glass-card rounded-2xl p-4 mb-4">
        <p className="text-[rgb(var(--gold-ink))] text-sm font-bold">[{club.tag}]</p>
        {club.description && <p className="text-[rgb(var(--c4))] text-xs mt-1">{club.description}</p>}
      </div>

      {error && (
        <p className="text-[rgb(var(--coral-ink))] text-xs break-words bg-[rgb(var(--coral)/10%)] border border-[rgb(var(--coral)/30%)] rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("members")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === "members" ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"}`}
        >
          {t("clubs_membersTab").replace("{n}", String(club.members.length))}
        </button>
        <button
          onClick={() => setTab("chat")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${tab === "chat" ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"}`}
        >
          {t("clubs_chatTab")}
        </button>
      </div>

      {tab === "members" ? (
        <div className="space-y-2">
          {sortedMembers.map((uid) => (
            <div key={uid} className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {uid === club.ownerUid && <Crown size={14} className="text-[rgb(var(--gold-ink))]" />}
                <span className="text-[rgb(var(--text-primary))] text-sm">{club.memberNames[uid] || "Player"}</span>
                {uid === myUid && <span className="text-[rgb(var(--c4))] text-xs">{t("clubs_you")}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[rgb(var(--c4))] text-xs flex items-center gap-1">
                  <Trophy size={10} className="text-[rgb(var(--gold-ink))]" /> {club.memberTrophies[uid] ?? 0}
                </span>
                {isOwner && uid !== myUid && (
                  <button disabled={busy} onClick={() => setConfirm(uid)} className="text-[rgb(var(--coral-ink))] text-xs">
                    {t("clubs_kick")}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            disabled={busy}
            onClick={() => setConfirm("leave")}
            className="w-full mt-3 py-2.5 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))] text-sm font-medium flex items-center justify-center gap-2"
          >
            <LogOut size={14} /> {t("clubs_leaveClub")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col" style={{ height: "50vh" }}>
          <div className="flex-1 overflow-y-auto space-y-2 mb-2">
            {!chatLoaded && <p role="status">Loading messages...</p>}
            {error && <Button variant="secondary" onClick={() => setChatRetry(n => n + 1)}>Retry Chat</Button>}
            {chatLoaded && !error && messages.length === 0 && (
              <p className="text-[rgb(var(--c3))] text-xs text-center mt-6">{t("clubs_noMessagesYet")}</p>
            )}
            {messages.map((m) => {
              const mine = m.senderUid === myUid;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                      mine
                        ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]"
                        : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))]"
                    }`}
                  >
                    {!mine && <p className="text-[10px] text-[rgb(var(--gold-ink))] font-semibold mb-0.5">{m.senderName}</p>}
                    {m.text}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
          <div className="flex items-center gap-2">
            <input
              aria-label={t("clubs_messagePlaceholder")}
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={t("clubs_messagePlaceholder")}
              maxLength={500}
              className="flex-1 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)]"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              aria-label="Send message"
              disabled={busy || !text.trim()}
              className="p-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] disabled:opacity-40"
            >
              <Send size={16} aria-label="Send message" />
            </motion.button>
          </div>
        </div>
      )}
      {confirm && <dialog ref={dialog} className="club-create-dialog" onCancel={e => { if (busy) e.preventDefault(); else setConfirm(null); }}>
        <h2>{confirm === "leave" ? "Leave club?" : "Remove member?"}</h2>
        <p className="mt-3 text-sm">{confirm === "leave" ? isOwner ? "Ownership passes to the next member when you leave." : "You will lose access to this club chat." : "This player will be removed from your club."}</p>
        <footer><Button variant="secondary" disabled={busy} onClick={() => setConfirm(null)}>Cancel</Button>
          <Button variant="danger" loading={busy} onClick={() => confirm === "leave" ? handleLeave() : handleKick(confirm)}>Confirm</Button></footer>
      </dialog>}
    </div>
  );
}
