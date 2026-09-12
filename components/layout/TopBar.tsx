"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, User, Settings, LogOut, UserPlus, Search, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { RankBadge } from "@/components/ui/RankBadge";
import { Badge } from "@/components/ui/Badge";
import { isAdminEmail } from "@/lib/admin";
import { watchIncomingRequests, type FriendRequestDoc } from "@/lib/friends";
import { watchConversations, type DmConversation } from "@/lib/messages";
import CoinBalance from "@/components/economy/CoinBalance";

/** Closes a popover on an outside click or Escape - shared by the bell,
 *  search and profile menus below so all three behave the same way. */
function useOutsideClose(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, close]);
  return ref;
}

/** The app's real destinations a search box can usefully jump to: the two
 *  games, plus a short list of named modes/pages. Kept as a small static
 *  index rather than a fake "search results" list with counts or
 *  thumbnails the app has no data for - every entry here is a real route. */
function useSearchIndex() {
  const { isGuest } = useAuth();
  return useMemo(
    () => [
      { label: "Mindi", sub: "Play now", href: `/play/mindi/casual/${isGuest ? "ai" : "online"}` },
      { label: "Gin Rummy", sub: "Play now", href: `/play/gin-rummy/casual/${isGuest ? "ai" : "online"}` },
      { label: "Ranked", sub: "Mode", href: "/play/mindi/ranked" },
      { label: "Weekend League", sub: "Event", href: "/tournament" },
      { label: "Private Room", sub: "Mode", href: "/play/mindi/room" },
      { label: "Leaderboard", sub: "Page", href: "/leaderboard" },
      { label: "Friends", sub: "Page", href: "/friends" },
      { label: "Shop", sub: "Page", href: "/shop" },
      { label: "Inventory", sub: "Page", href: "/inventory" },
      { label: "Clubs", sub: "Page", href: "/clubs" },
    ],
    [isGuest]
  );
}

/** Compact search over games/modes/pages - a real (if small) index rather
 *  than decorative furniture, since the reference this section is modelled
 *  on assumes a large game catalogue this app doesn't have. */
function SearchBox() {
  const t = useTranslation();
  const router = useRouter();
  const index = useSearchIndex();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useOutsideClose(open, () => setOpen(false));

  const results = query.trim()
    ? index.filter((r) => r.label.toLowerCase().includes(query.trim().toLowerCase()))
    : index.slice(0, 5);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div ref={ref} className="relative w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] px-3.5 py-2 focus-within:border-[rgb(var(--gold)/45%)] transition-colors">
        <Search size={15} className="text-[rgb(var(--c4))] shrink-0" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results[0]) go(results[0].href);
          }}
          placeholder={t("search_placeholder")}
          aria-label={t("search_placeholder")}
          className="w-full bg-transparent text-[13px] text-[rgb(var(--text-primary))] placeholder:text-[rgb(var(--c4))] outline-none"
        />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 mt-2 rounded-2xl border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] shadow-[var(--shadow-lg)] p-1.5 z-50 max-h-72 overflow-y-auto"
          >
            {results.length === 0 ? (
              <p className="py-4 text-center text-xs text-[rgb(var(--c4))]">{t("search_noResults")}</p>
            ) : (
              results.map((r) => (
                <button
                  key={r.href}
                  onClick={() => go(r.href)}
                  className="flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left hover:bg-[rgb(var(--c1))] transition-colors"
                >
                  <span className="text-sm font-semibold text-[rgb(var(--text-primary))]">{r.label}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[rgb(var(--c4))]">{r.sub}</span>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Real notifications only: pending friend requests and DM threads with an
 *  unread message (same lastReadAt tracking FriendsRail uses) - no invented
 *  counts. */
function NotificationBell() {
  const { user } = useAuth();
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<FriendRequestDoc[]>([]);
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const ref = useOutsideClose(open, () => setOpen(false));

  useEffect(() => {
    if (!user) return;
    const unsubReq = watchIncomingRequests(user.uid, setRequests);
    const unsubConvo = watchConversations(user.uid, setConversations);
    return () => {
      unsubReq();
      unsubConvo();
    };
  }, [user]);

  if (!user) return null;

  const unreadConvos = conversations.filter(
    (c) => c.lastMessageAt > (c.lastReadAt?.[user.uid] ?? 0) && c.lastSenderUid !== user.uid && Boolean(c.lastMessage)
  );
  const count = requests.length + unreadConvos.length;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("nav_notifications")}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c5))]"
      >
        <Bell size={17} aria-hidden="true" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[rgb(var(--coral))] px-1 text-[9px] font-bold text-white shadow-[0_0_8px_-1px_rgb(var(--coral)/80%)]">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-72 rounded-2xl border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] shadow-[var(--shadow-lg)] p-2 z-50"
          >
            {count === 0 ? (
              <p className="py-6 text-center text-xs text-[rgb(var(--c4))]">{t("notifications_empty")}</p>
            ) : (
              <div className="flex flex-col gap-1">
                {requests.length > 0 && (
                  <Link
                    href="/friends"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[rgb(var(--c1))] transition-colors"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--deep)/14%)] text-[rgb(var(--deep-ink))]">
                      <UserPlus size={16} aria-hidden="true" />
                    </span>
                    <span className="text-sm text-[rgb(var(--text-primary))]">
                      {requests.length} {t("friends_requests")}
                    </span>
                  </Link>
                )}
                {unreadConvos.slice(0, 5).map((c) => {
                  const otherUid = c.participants.find((p) => p !== user.uid) ?? c.participants[0];
                  const otherName = c.participantNames[otherUid] ?? "Player";
                  return (
                    <Link
                      key={c.id}
                      href={`/messages?with=${otherUid}&name=${encodeURIComponent(otherName)}`}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-[rgb(var(--c1))] transition-colors"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgb(var(--lagoon)/14%)] text-[rgb(var(--lagoon-ink))] text-xs font-bold">
                        {otherName.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-sm text-[rgb(var(--text-primary))] truncate">
                        {t("notifications_newMessage").replace("{name}", otherName)}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileChip() {
  const { user, playerStats, logout } = useAuth();
  const { state } = useEconomy();
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useOutsideClose(open, () => setOpen(false));

  if (!user) return null;
  const admin = isAdminEmail(user.email);
  const vip = state.profile.vip?.active;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] hover:border-[rgb(var(--gold)/45%)] transition-colors"
      >
        <div className="relative h-8 w-8 rounded-full bg-gradient-to-br from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))] p-[2px]">
          <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-[rgb(var(--c1))]">
            {user.photoURL ? (
              <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <User size={14} className="text-[rgb(var(--gold-ink))]" aria-hidden="true" />
            )}
          </div>
          {vip && (
            <span
              className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[rgb(var(--orchid))] border border-[rgb(var(--c1))]"
              aria-hidden="true"
            >
              <Crown size={9} className="text-white" />
            </span>
          )}
        </div>
        <div className="hidden sm:block text-left leading-tight">
          <p className="text-xs font-bold text-[rgb(var(--text-primary))] truncate max-w-[8rem]">
            {user.displayName || t("profile_player")}
          </p>
          {admin ? (
            <Badge tone="gold" className="mt-0.5">Admin</Badge>
          ) : (
            <RankBadge rank={playerStats?.currentRank || "Unranked"} size="sm" />
          )}
        </div>
        <ChevronDown size={14} className="text-[rgb(var(--c4))]" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-48 rounded-2xl border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] shadow-[var(--shadow-lg)] p-1.5 z-50"
          >
            <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[rgb(var(--c5))] hover:bg-[rgb(var(--c1))] transition-colors"
            >
              <User size={16} aria-hidden="true" />
              {t("nav_profile")}
            </Link>
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[rgb(var(--c5))] hover:bg-[rgb(var(--c1))] transition-colors"
            >
              <Settings size={16} aria-hidden="true" />
              {t("nav_settings")}
            </Link>
            <div className="my-1 h-px bg-[rgb(var(--c3))]" />
            <button
              onClick={() => logout()}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-[rgb(var(--coral-ink))] hover:bg-[rgb(var(--coral)/10%)] transition-colors"
            >
              <LogOut size={16} aria-hidden="true" />
              {t("settings_logout")}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Premium top bar for Home/Play: a compact game/mode/page search, a
 * notification bell (real friend-request and unread-DM counts), the coin
 * balance and a profile chip with rank/VIP indicator and a quick menu.
 * Self-gates by pathname like SideNav/FriendsRail.
 */
export function TopBar() {
  const pathname = usePathname();
  const path = pathname?.replace(/\/$/, "");

  return (
    <div className="app-top-bar flex items-center justify-between gap-3 pt-1 pb-3">
      <SearchBox />
      <div className="flex items-center gap-2 ml-auto">
        <CoinBalance size="sm" />
        <NotificationBell />
        <ProfileChip />
      </div>
    </div>
  );
}
