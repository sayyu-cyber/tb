"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Users, Crown, Send, LogOut, Trophy } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  ClubDoc,
  ClubMessage,
  watchMyClub,
  watchClubList,
  watchClubMessages,
  createClub,
  joinClub,
  leaveClub,
  kickMember,
  sendClubMessage,
} from "@/lib/clubs";
import { useTranslation } from "@/hooks/useTranslation";

export function ClubsClient() {
  const { user, playerStats, isGuest } = useAuth();
  const myUid = user?.uid ?? "";
  const myName = user?.displayName ?? "Player";
  const myTrophies = playerStats?.trophies ?? 0;
  const t = useTranslation();

  const [myClub, setMyClub] = useState<ClubDoc | null | undefined>(undefined);

  useEffect(() => {
    if (!myUid || isGuest) {
      setMyClub(null);
      return;
    }
    return watchMyClub(myUid, setMyClub);
  }, [myUid, isGuest]);

  if (isGuest) {
    return (
      <div className="pt-4 pb-32 px-4">
        <PageHeader title={t("page_clubs")} />
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-[rgb(var(--c4))] text-sm">{t("clubs_signInPrompt")}</p>
        </div>
      </div>
    );
  }

  if (myClub === undefined) {
    return (
      <div className="pt-4 pb-32 px-4">
        <PageHeader title={t("page_clubs")} />
        <p className="text-[rgb(var(--c4))] text-sm text-center mt-6">{t("clubs_loading")}</p>
      </div>
    );
  }

  return myClub ? (
    <ClubHome club={myClub} myUid={myUid} myName={myName} />
  ) : (
    <ClubBrowser myUid={myUid} myName={myName} myTrophies={myTrophies} />
  );
}

function ClubBrowser({ myUid, myName, myTrophies }: { myUid: string; myName: string; myTrophies: number }) {
  const [clubs, setClubs] = useState<ClubDoc[]>([]);
  const [mode, setMode] = useState<"browse" | "create">("browse");
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const t = useTranslation();

  useEffect(() => watchClubList(setClubs), []);

  async function handleCreate() {
    if (!name.trim() || !tag.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createClub(myUid, myName, myTrophies, name, tag, description);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleJoin(clubId: string) {
    setError(null);
    try {
      await joinClub(clubId, myUid, myName, myTrophies);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_clubs")} />

      {error && (
        <p className="text-red-400 text-xs break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("browse")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${mode === "browse" ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"}`}
        >
          {t("clubs_browse")}
        </button>
        <button
          onClick={() => setMode("create")}
          className={`flex-1 py-2 rounded-xl text-sm font-medium ${mode === "create" ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"}`}
        >
          {t("clubs_create")}
        </button>
      </div>

      {mode === "create" ? (
        <div className="glass-card rounded-2xl p-5 space-y-3">
          <input
            aria-label={t("clubs_namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("clubs_namePlaceholder")}
            maxLength={30}
            className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)]"
          />
          <input
            aria-label={t("clubs_tagPlaceholder")}
            value={tag}
            onChange={(e) => setTag(e.target.value.toUpperCase())}
            placeholder={t("clubs_tagPlaceholder")}
            maxLength={5}
            className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)]"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("clubs_descriptionPlaceholder")}
            maxLength={200}
            rows={3}
            className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)] resize-none"
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            disabled={busy || !name.trim() || !tag.trim()}
            onClick={handleCreate}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold disabled:opacity-50"
          >
            {busy ? t("clubs_creating") : t("clubs_createClub")}
          </motion.button>
        </div>
      ) : clubs.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center">
          <Users size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
          <p className="text-[rgb(var(--c4))] text-sm">{t("clubs_noClubsYet")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {clubs.map((c) => (
            <div key={c.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-[rgb(var(--text-primary))] text-sm font-medium truncate">
                  {c.name} <span className="text-[rgb(var(--gold))] text-xs">[{c.tag}]</span>
                </p>
                <p className="text-[rgb(var(--c4))] text-xs flex items-center gap-1">
                  <Users size={10} /> {c.members.length} {t("clubs_members")}
                </p>
              </div>
              <button
                onClick={() => handleJoin(c.id)}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-xs font-semibold shrink-0"
              >
                {t("clubs_join")}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ClubHome({ club, myUid, myName }: { club: ClubDoc; myUid: string; myName: string }) {
  const [tab, setTab] = useState<"members" | "chat">("members");
  const [messages, setMessages] = useState<ClubMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isOwner = club.ownerUid === myUid;
  const t = useTranslation();

  useEffect(() => {
    if (tab !== "chat") return;
    return watchClubMessages(club.id, setMessages);
  }, [tab, club.id]);

  useEffect(() => {
    if (tab === "chat") bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, tab]);

  async function handleSend() {
    if (!text.trim()) return;
    const toSend = text;
    setText("");
    await sendClubMessage(club.id, myUid, myName, toSend).catch((err) => setError(String(err)));
  }

  async function handleLeave() {
    await leaveClub(club.id, myUid).catch((err) => setError(String(err)));
  }

  async function handleKick(uid: string) {
    await kickMember(club.id, myUid, uid).catch((err) => setError(String(err)));
  }

  const sortedMembers = [...club.members].sort((a, b) => (club.memberTrophies[b] ?? 0) - (club.memberTrophies[a] ?? 0));

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={club.name} />

      <div className="glass-card rounded-2xl p-4 mb-4">
        <p className="text-[rgb(var(--gold))] text-sm font-bold">[{club.tag}]</p>
        {club.description && <p className="text-[rgb(var(--c4))] text-xs mt-1">{club.description}</p>}
      </div>

      {error && (
        <p className="text-red-400 text-xs break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">{error}</p>
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
                {uid === club.ownerUid && <Crown size={14} className="text-[rgb(var(--gold))]" />}
                <span className="text-[rgb(var(--text-primary))] text-sm">{club.memberNames[uid] || "Player"}</span>
                {uid === myUid && <span className="text-[rgb(var(--c4))] text-xs">{t("clubs_you")}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[rgb(var(--c4))] text-xs flex items-center gap-1">
                  <Trophy size={10} className="text-[rgb(var(--gold))]" /> {club.memberTrophies[uid] ?? 0}
                </span>
                {isOwner && uid !== myUid && (
                  <button onClick={() => handleKick(uid)} className="text-red-400 text-xs">
                    {t("clubs_kick")}
                  </button>
                )}
              </div>
            </div>
          ))}
          <button
            onClick={handleLeave}
            className="w-full mt-3 py-2.5 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))] text-sm font-medium flex items-center justify-center gap-2"
          >
            <LogOut size={14} /> {t("clubs_leaveClub")}
          </button>
        </div>
      ) : (
        <div className="flex flex-col" style={{ height: "50vh" }}>
          <div className="flex-1 overflow-y-auto space-y-2 mb-2">
            {messages.length === 0 && (
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
                    {!mine && <p className="text-[10px] text-[rgb(var(--gold))] font-semibold mb-0.5">{m.senderName}</p>}
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
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={t("clubs_messagePlaceholder")}
              maxLength={500}
              className="flex-1 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)]"
            />
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSend}
              disabled={!text.trim()}
              className="p-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] disabled:opacity-40"
            >
              <Send size={16} />
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
