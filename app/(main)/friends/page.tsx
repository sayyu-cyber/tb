"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, Check, X, Trophy, Users, Gamepad2, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  searchPlayers,
  sendFriendRequest,
  respondToRequest,
  cancelOrRemove,
  watchIncomingRequests,
  watchOutgoingRequests,
  watchFriends,
  watchRoomInvites,
  dismissRoomInvite,
  sendRoomInvite,
  PlayerSearchResult,
  FriendRequestDoc,
  Friend,
  RoomInviteDoc,
} from "@/lib/friends";
import { createRoom } from "@/lib/rooms";
import { useTranslation } from "@/hooks/useTranslation";

export default function FriendsPage() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const uid = user?.uid ?? "";
  const myName = user?.displayName ?? "Player";
  const t = useTranslation();

  const [tab, setTab] = useState<"friends" | "requests" | "search">("friends");
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [incoming, setIncoming] = useState<FriendRequestDoc[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestDoc[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [invites, setInvites] = useState<RoomInviteDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string[]>([]);

  useEffect(() => {
    if (!uid || isGuest) return;
    const unsubIncoming = watchIncomingRequests(uid, setIncoming);
    const unsubOutgoing = watchOutgoingRequests(uid, setOutgoing);
    const unsubFriends = watchFriends(uid, setFriends);
    const unsubInvites = watchRoomInvites(uid, setInvites);
    return () => {
      unsubIncoming();
      unsubOutgoing();
      unsubFriends();
      unsubInvites();
    };
  }, [uid, isGuest]);

  async function handleSearch() {
    if (!searchText.trim()) return;
    setSearching(true);
    setError(null);
    try {
      const found = await searchPlayers(uid, searchText);
      setResults(found);
    } catch (err) {
      setError(String(err));
    } finally {
      setSearching(false);
    }
  }

  async function handleAddFriend(target: PlayerSearchResult) {
    try {
      await sendFriendRequest(uid, myName, target.uid, target.displayName);
      setSentTo((prev) => [...prev, target.uid]);
    } catch (err) {
      setError(String(err));
    }
  }

  async function handleInvite(friend: Friend, gameId: "mindi" | "gin-rummy") {
    try {
      const gameType = gameId === "mindi" ? "mindi" : "gin_rummy";
      const code = await createRoom(uid, myName, gameType, null);
      await sendRoomInvite(uid, myName, friend.uid, code, gameType);
      router.push(`/play/${gameId}/room?code=${code}`);
    } catch (err) {
      setError(String(err));
    }
  }

  if (isGuest) {
    return (
      <div className="pt-4 pb-32 px-4">
        <PageHeader title={t("page_friends")} />
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-[rgb(var(--c4))] text-sm">{t("friends_signInPrompt")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_friends")} />

      {invites.length > 0 && (
        <div className="space-y-2 mb-4">
          {invites.map((invite) => (
            <div key={invite.id} className="glass-card rounded-xl p-3 flex items-center justify-between border border-[rgb(var(--gold)/30%)]">
              <p className="text-[rgb(var(--text-primary))] text-sm">
                <span className="text-[rgb(var(--gold))] font-semibold">{invite.fromName}</span> {t("friends_invitedToRoom")}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    router.push(`/play/${invite.gameType === "mindi" ? "mindi" : "gin-rummy"}/room?code=${invite.code}`);
                    dismissRoomInvite(invite.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-xs font-semibold"
                >
                  {t("friends_join")}
                </button>
                <button onClick={() => dismissRoomInvite(invite.id)} className="px-3 py-1.5 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))] text-xs">
                  {t("friends_dismiss")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(["friends", "requests", "search"] as const).map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              tab === tabKey ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"
            }`}
          >
            {tabKey === "requests"
              ? incoming.length > 0
                ? `${t("friends_tabRequests")} (${incoming.length})`
                : t("friends_tabRequests")
              : tabKey === "search"
              ? t("friends_tabSearch")
              : t("friends_tabFriends")}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-xs break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      {tab === "search" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              aria-label={t("friends_searchPlaceholder")}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder={t("friends_searchPlaceholder")}
              maxLength={24}
              className="flex-1 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)]"
            />
            <button aria-label={t("a11y_search")} onClick={handleSearch} className="px-4 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
              <Search size={18} className="text-[rgb(var(--gold))]" />
            </button>
          </div>

          {searching && <p className="text-[rgb(var(--c4))] text-sm text-center">{t("friends_searching")}</p>}

          <div className="space-y-2">
            {results.map((r) => {
              const alreadyFriend = friends.some((f) => f.uid === r.uid);
              const alreadySent = sentTo.includes(r.uid) || outgoing.some((o) => o.to === r.uid);
              return (
                <div key={r.uid} className="glass-card rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[rgb(var(--text-primary))] text-sm font-medium">{r.displayName}</p>
                    <p className="text-[rgb(var(--c4))] text-xs flex items-center gap-1">
                      <Trophy size={10} /> {r.trophies}
                    </p>
                  </div>
                  {alreadyFriend ? (
                    <span className="text-[rgb(var(--c4))] text-xs">{t("friends_alreadyFriends")}</span>
                  ) : alreadySent ? (
                    <span className="text-[rgb(var(--c4))] text-xs">{t("friends_requested")}</span>
                  ) : (
                    <button aria-label={t("a11y_addFriend")} onClick={() => handleAddFriend(r)} className="p-2 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--gold)/30%)]">
                      <UserPlus size={16} className="text-[rgb(var(--gold))]" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "requests" && (
        <div className="space-y-5">
          <div>
            <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-2">{t("friends_incoming")}</p>
            {incoming.length === 0 ? (
              <p className="text-[rgb(var(--c3))] text-xs">{t("friends_noPendingRequests")}</p>
            ) : (
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div key={r.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                    <p className="text-[rgb(var(--text-primary))] text-sm">{r.fromName}</p>
                    <div className="flex gap-2">
                      <button aria-label={t("a11y_acceptRequest")} onClick={() => respondToRequest(r.id, true)} className="p-2 rounded-lg bg-green-900/30 border border-green-700/40">
                        <Check size={14} className="text-green-400" />
                      </button>
                      <button aria-label={t("a11y_declineRequest")} onClick={() => respondToRequest(r.id, false)} className="p-2 rounded-lg bg-red-900/30 border border-red-700/40">
                        <X size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-2">{t("friends_sent")}</p>
            {outgoing.length === 0 ? (
              <p className="text-[rgb(var(--c3))] text-xs">{t("friends_noOutgoingRequests")}</p>
            ) : (
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <div key={r.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                    <p className="text-[rgb(var(--text-primary))] text-sm">{r.toName}</p>
                    <button onClick={() => cancelOrRemove(r.id)} className="text-[rgb(var(--c4))] text-xs">
                      {t("friends_cancel")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "friends" && (
        <div className="space-y-2">
          {friends.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <Users size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
              <p className="text-[rgb(var(--c4))] text-sm">{t("friends_noFriendsYet")}</p>
            </div>
          ) : (
            friends.map((f) => (
              <div key={f.requestId} className="glass-card rounded-xl p-3 flex items-center justify-between">
                <Link href={`/player?uid=${f.uid}`} className="text-[rgb(var(--text-primary))] text-sm font-medium hover:text-[rgb(var(--gold))] transition-colors">
                  {f.name}
                </Link>
                <div className="flex gap-2">
                  <Link href={`/messages?with=${f.uid}&name=${encodeURIComponent(f.name)}`}>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      className="px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--gold))] text-xs flex items-center gap-1"
                    >
                      <MessageCircle size={12} /> {t("friends_message")}
                    </motion.button>
                  </Link>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInvite(f, "mindi")}
                    className="px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--gold))] text-xs flex items-center gap-1"
                  >
                    <Gamepad2 size={12} /> Mindi
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInvite(f, "gin-rummy")}
                    className="px-2.5 py-1.5 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--gold))] text-xs flex items-center gap-1"
                  >
                    <Gamepad2 size={12} /> Gin
                  </motion.button>
                  <button onClick={() => cancelOrRemove(f.requestId)} className="text-red-400/70 text-xs">
                    {t("friends_remove")}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
