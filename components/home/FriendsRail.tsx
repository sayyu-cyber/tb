"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, MessageCircle, UserPlus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { watchFriends, watchIncomingRequests, type Friend } from "@/lib/friends";
import { watchConversations, type DmConversation } from "@/lib/messages";
import { watchLastSeen, isOnline } from "@/lib/presence";
import { getActiveMatchId } from "@/lib/matchmaking";
import { cn } from "@/lib/utils";

const VISIBLE_FRIENDS = 6;
const VISIBLE_CHATS = 3;
const IN_GAME_POLL_MS = 30_000;

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

/**
 * One friend avatar: gold ring (matches the rest of the app's avatar
 * treatment), a status dot from real presence data (lib/presence.ts -
 * green if their heartbeat is recent, grey otherwise, never fabricated),
 * and an "In Game" pill when lib/matchmaking's getActiveMatchId finds them
 * in a live match - the same lookup Spectator Mode already uses, so this
 * reuses a real signal instead of inventing one.
 */
function FriendAvatar({ friend }: { friend: Friend }) {
  const t = useTranslation();
  const [lastSeen, setLastSeen] = useState<number | null>(null);
  const [inGame, setInGame] = useState(false);

  useEffect(() => watchLastSeen(friend.uid, setLastSeen), [friend.uid]);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      getActiveMatchId(friend.uid)
        .then((active) => !cancelled && setInGame(Boolean(active)))
        .catch(() => {});
    };
    check();
    const interval = setInterval(check, IN_GAME_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [friend.uid]);

  const online = isOnline(lastSeen);

  return (
    <Link href="/friends" title={friend.name} className="relative flex shrink-0">
      <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] p-[2px]">
        <span className="flex h-full w-full items-center justify-center rounded-full bg-[rgb(var(--c2))] text-[10px] font-bold text-[rgb(var(--gold-ink))]">
          {initials(friend.name)}
        </span>
      </div>
      <span
        className={cn(
          "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[rgb(var(--c1))]",
          online ? "bg-[rgb(var(--lagoon))]" : "bg-[rgb(var(--c4))]"
        )}
        aria-hidden="true"
      />
      {inGame && (
        <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[rgb(var(--coral))] px-1 py-[1px] text-[7px] font-bold uppercase tracking-wide text-white shadow-[var(--shadow-sm)]">
          {t("friends_inGame")}
        </span>
      )}
    </Link>
  );
}

/**
 * Right-side rail: a friends capsule (who's online, who's in a match)
 * stacked above a chats capsule (recent conversations, with a real unread
 * dot). Sized and gated the same way as SideNav's collapsed rail - same
 * 72px width, same md+ breakpoint, same border/background - so the two
 * read as a matching pair on opposite edges of the screen. Self-gates by
 * pathname like SideNav; only Home and Play want this column.
 *
 * Everything here is backed by real data: online status by heartbeat
 * (lib/presence.ts), in-game by the same lookup Spectator Mode uses,
 * unread by a per-user lastReadAt on the conversation doc (lib/messages.ts).
 * No player counts or statuses are invented.
 */
export function FriendsRail() {
  const pathname = usePathname();
  const { user } = useAuth();
  const t = useTranslation();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requestCount, setRequestCount] = useState(0);
  const [conversations, setConversations] = useState<DmConversation[]>([]);

  const path = pathname?.replace(/\/$/, "");
  const shouldShow = path === "/home" || path === "/play";

  useEffect(() => {
    if (!shouldShow || !user) return;
    const unsubFriends = watchFriends(user.uid, setFriends);
    const unsubRequests = watchIncomingRequests(user.uid, (reqs) => setRequestCount(reqs.length));
    const unsubConvos = watchConversations(user.uid, setConversations);
    return () => {
      unsubFriends();
      unsubRequests();
      unsubConvos();
    };
  }, [shouldShow, user]);

  if (!shouldShow || !user) return null;

  return (
    <aside
      className="hidden md:flex md:flex-col w-[76px] shrink-0 sticky top-0 h-screen overflow-y-auto items-center gap-6
                 border-l border-[rgb(var(--c3))] bg-[rgb(var(--c1))] px-2 py-5"
    >
      {/* Friends capsule */}
      <div className="flex flex-col items-center gap-3 rounded-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] px-2 py-3 shadow-[var(--shadow-sm)]">
        <Link
          href="/friends"
          aria-label={t("nav_friends")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--deep)/16%)] text-[rgb(var(--deep-ink))] hover:bg-[rgb(var(--deep)/26%)] transition-colors"
        >
          <Users size={16} aria-hidden="true" />
        </Link>

        {friends.length === 0 ? (
          <p className="max-w-[3.5rem] text-center text-[9px] leading-tight text-[rgb(var(--c4))]">
            {t("friends_noneYet")}
          </p>
        ) : (
          friends.slice(0, VISIBLE_FRIENDS).map((friend) => <FriendAvatar key={friend.uid} friend={friend} />)
        )}

        {friends.length > VISIBLE_FRIENDS && (
          <Link
            href="/friends"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--c1))] border border-[rgb(var(--c3))] text-[10px] font-bold text-[rgb(var(--c5))]"
          >
            +{friends.length - VISIBLE_FRIENDS}
          </Link>
        )}
      </div>

      {/* Chats capsule */}
      <div className="flex flex-col items-center gap-3 rounded-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] px-2 py-3 shadow-[var(--shadow-sm)]">
        <Link
          href="/messages"
          aria-label={t("page_messages")}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--gold)/16%)] text-[rgb(var(--gold-ink))] hover:bg-[rgb(var(--gold)/26%)] transition-colors"
        >
          <MessageCircle size={16} aria-hidden="true" />
        </Link>

        <Link
          href="/friends"
          aria-label={t("friends_requests")}
          className="relative flex h-9 w-9 items-center justify-center rounded-full bg-[rgb(var(--c1))] border border-[rgb(var(--c3))] text-[rgb(var(--c5))]"
        >
          <UserPlus size={16} aria-hidden="true" />
          {requestCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[rgb(var(--coral))] px-1 text-[9px] font-bold text-white">
              {requestCount}
            </span>
          )}
        </Link>

        {conversations.slice(0, VISIBLE_CHATS).map((c) => {
          const otherUid = c.participants.find((p) => p !== user.uid) ?? c.participants[0];
          const otherName = c.participantNames[otherUid] ?? "Player";
          const unread = c.lastMessageAt > (c.lastReadAt?.[user.uid] ?? 0) && c.lastSenderUid !== user.uid && Boolean(c.lastMessage);
          return (
            <Link
              key={c.id}
              href={`/messages?with=${otherUid}&name=${encodeURIComponent(otherName)}`}
              title={otherName}
              className="relative flex shrink-0"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[rgb(var(--lagoon))] to-[rgb(var(--lagoon-deep))] p-[2px]">
                <span className="flex h-full w-full items-center justify-center rounded-full bg-[rgb(var(--c2))] text-[10px] font-bold text-[rgb(var(--lagoon-ink))]">
                  {initials(otherName)}
                </span>
              </div>
              {unread && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[rgb(var(--coral))] border-2 border-[rgb(var(--c2))]" aria-hidden="true" />
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
