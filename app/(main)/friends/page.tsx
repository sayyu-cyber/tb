"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, UserPlus, Check, X, Trophy, Users, Gamepad2 } from "lucide-react";
import { useRouter } from "next/navigation";
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

export default function FriendsPage() {
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const uid = user?.uid ?? "";
  const myName = user?.displayName ?? "Player";

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
        <PageHeader title="Friends" />
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-[#3A3A3A] text-sm">Sign in to add friends and send invites.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Friends" />

      {invites.length > 0 && (
        <div className="space-y-2 mb-4">
          {invites.map((invite) => (
            <div key={invite.id} className="glass-card rounded-xl p-3 flex items-center justify-between border border-[#D4AF37]/30">
              <p className="text-white text-sm">
                <span className="text-[#D4AF37] font-semibold">{invite.fromName}</span> invited you to a room
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    router.push(`/play/${invite.gameType === "mindi" ? "mindi" : "gin-rummy"}/room?code=${invite.code}`);
                    dismissRoomInvite(invite.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] text-xs font-semibold"
                >
                  Join
                </button>
                <button onClick={() => dismissRoomInvite(invite.id)} className="px-3 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#3A3A3A] text-xs">
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 mb-4">
        {(["friends", "requests", "search"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium capitalize ${
              tab === t ? "bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F]" : "bg-[#1A1A1A] border border-[#2A2A2A] text-[#3A3A3A]"
            }`}
          >
            {t === "requests" && incoming.length > 0 ? `Requests (${incoming.length})` : t}
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
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search by username"
              className="flex-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50"
            />
            <button onClick={handleSearch} className="px-4 rounded-xl bg-[#1A1A1A] border border-[#2A2A2A]">
              <Search size={18} className="text-[#D4AF37]" />
            </button>
          </div>

          {searching && <p className="text-[#3A3A3A] text-sm text-center">Searching…</p>}

          <div className="space-y-2">
            {results.map((r) => {
              const alreadyFriend = friends.some((f) => f.uid === r.uid);
              const alreadySent = sentTo.includes(r.uid) || outgoing.some((o) => o.to === r.uid);
              return (
                <div key={r.uid} className="glass-card rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-medium">{r.displayName}</p>
                    <p className="text-[#3A3A3A] text-xs flex items-center gap-1">
                      <Trophy size={10} /> {r.trophies}
                    </p>
                  </div>
                  {alreadyFriend ? (
                    <span className="text-[#3A3A3A] text-xs">Friends</span>
                  ) : alreadySent ? (
                    <span className="text-[#3A3A3A] text-xs">Requested</span>
                  ) : (
                    <button onClick={() => handleAddFriend(r)} className="p-2 rounded-lg bg-[#1A1A1A] border border-[#D4AF37]/30">
                      <UserPlus size={16} className="text-[#D4AF37]" />
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
            <p className="text-[#3A3A3A] text-xs uppercase tracking-wider mb-2">Incoming</p>
            {incoming.length === 0 ? (
              <p className="text-[#2A2A2A] text-xs">No pending requests</p>
            ) : (
              <div className="space-y-2">
                {incoming.map((r) => (
                  <div key={r.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                    <p className="text-white text-sm">{r.fromName}</p>
                    <div className="flex gap-2">
                      <button onClick={() => respondToRequest(r.id, true)} className="p-2 rounded-lg bg-green-900/30 border border-green-700/40">
                        <Check size={14} className="text-green-400" />
                      </button>
                      <button onClick={() => respondToRequest(r.id, false)} className="p-2 rounded-lg bg-red-900/30 border border-red-700/40">
                        <X size={14} className="text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-[#3A3A3A] text-xs uppercase tracking-wider mb-2">Sent</p>
            {outgoing.length === 0 ? (
              <p className="text-[#2A2A2A] text-xs">No outgoing requests</p>
            ) : (
              <div className="space-y-2">
                {outgoing.map((r) => (
                  <div key={r.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                    <p className="text-white text-sm">{r.toName}</p>
                    <button onClick={() => cancelOrRemove(r.id)} className="text-[#3A3A3A] text-xs">
                      Cancel
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
              <Users size={28} className="text-[#2A2A2A] mx-auto mb-2" />
              <p className="text-[#3A3A3A] text-sm">No friends yet — search for players to add them.</p>
            </div>
          ) : (
            friends.map((f) => (
              <div key={f.requestId} className="glass-card rounded-xl p-3 flex items-center justify-between">
                <p className="text-white text-sm font-medium">{f.name}</p>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInvite(f, "mindi")}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#D4AF37] text-xs flex items-center gap-1"
                  >
                    <Gamepad2 size={12} /> Mindi
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleInvite(f, "gin-rummy")}
                    className="px-2.5 py-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A] text-[#D4AF37] text-xs flex items-center gap-1"
                  >
                    <Gamepad2 size={12} /> Gin
                  </motion.button>
                  <button onClick={() => cancelOrRemove(f.requestId)} className="text-red-400/70 text-xs">
                    Remove
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
