"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronDown, User, Settings, LogOut, UserPlus, Search, Crown, Gamepad2, ArrowUpRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { RankBadge } from "@/components/ui/RankBadge";
import { Badge } from "@/components/ui/Badge";
import { isAdminEmail } from "@/lib/admin";
import { watchIncomingRequests, type FriendRequestDoc } from "@/lib/friends";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { useToast } from "@/contexts/ToastContext";
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
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      close();
      ref.current?.querySelector<HTMLElement>('input,button')?.focus();
    };
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
      { label: "Achievements", sub: "Progress", href: "/achievements" },
      { label: "Profile", sub: "Player", href: "/profile" },
      { label: "Settings", sub: "Preferences", href: "/settings" },
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
  const [active, setActive] = useState(0);
  const pathname = usePathname();
  const ref = useOutsideClose(open, () => setOpen(false));
  useEffect(() => { setOpen(false); setQuery(""); setActive(0); }, [pathname]);

  const results = query.trim()
    ? index.filter((r) => r.label.toLowerCase().includes(query.trim().toLowerCase()))
    : index.slice(0, 5);
  useEffect(() => {
    if (open) document.getElementById(`launcher-result-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div ref={ref} className="launcher-search relative w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] px-3.5 py-2 focus-within:border-[rgb(var(--gold)/45%)] transition-colors">
        <Search size={15} className="text-[rgb(var(--c4))] shrink-0" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setActive(0); setOpen(true); }}
          onFocus={() => setOpen(true)}
          role="combobox"
          aria-expanded={open}
          aria-controls="launcher-results"
          aria-autocomplete="list"
          aria-activedescendant={open && results[active] ? `launcher-result-${active}` : undefined}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault(); setOpen(true);
              setActive(value => results.length ? (value + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length : 0);
            }
            if (e.key === "Enter" && results[active]) { e.preventDefault(); go(results[active].href); }
            if (e.key === "Escape" || e.key === "Tab") setOpen(false);
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
            id="launcher-results"
            role="listbox"
            aria-label="Games and destinations"
            className="launcher-results absolute left-0 right-0 mt-2 border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] shadow-[var(--shadow-lg)] p-1.5 z-50 max-h-72 overflow-y-auto"
          >
            {results.length === 0 ? (
              <p className="py-4 text-center text-xs text-[rgb(var(--c4))]">{t("search_noResults")}</p>
            ) : (
              results.map((r, i) => (
                <button
                  id={`launcher-result-${i}`}
                  role="option"
                  aria-selected={active === i}
                  tabIndex={-1}
                  key={r.href}
                  onMouseDown={event => event.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(r.href)}
                  className="launcher-result"
                >
                  <Gamepad2 size={18} aria-hidden="true" />
                  <span><strong>{r.label}</strong><small>{r.sub}</small></span>
                  <ArrowUpRight size={14} aria-hidden="true" />
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
  const { user, isGuest } = useAuth();
  const { chats: conversations, error: chatError } = useHomeSocial();
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<FriendRequestDoc[]>([]);
  const [requestError, setRequestError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const uid = user?.uid;
  const pathname = usePathname();
  const ref = useOutsideClose(open, () => setOpen(false));
  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    setRequests([]); setRequestError(false);
    if (!uid || isGuest) return;
    return watchIncomingRequests(uid, setRequests, () => setRequestError(true));
  }, [uid, isGuest, attempt]);

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
            className="notification-popover absolute right-0 mt-2 w-72 rounded-xl border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] shadow-[var(--shadow-lg)] p-2 z-50"
          >
            {(requestError || chatError) && <p className="p-3 text-xs" role="status">Some notifications are unavailable. {requestError && <button className="underline" onClick={() => setAttempt(value => value + 1)}>Retry</button>}</p>}
            {count === 0 && !requestError && !chatError ? (
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
  const { showToast } = useToast();
  const t = useTranslation();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  const ref = useOutsideClose(open, () => setOpen(false));

  if (!user) return null;
  const admin = isAdminEmail(user.email);
  const vip = state.profile.vip?.active;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={`${t("nav_profile")}: ${user.displayName || t("profile_player")}`}
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
              disabled={signingOut}
              onClick={async () => {
                if (signingOut) return;
                setSigningOut(true);
                try { await logout(); } catch { showToast("Couldn't sign out. Please try again.", "error"); }
                finally { setSigningOut(false); }
              }}
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
