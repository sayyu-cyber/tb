"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronRight, MessageCircle, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { useTranslation } from "@/hooks/useTranslation";
import { SidebarTooltip } from "./SidebarTooltip";
import { CHATS_HREF, ONLINE_HREF } from "./sidebarItems";

/**
 * Online Players and Active Chats, in both sidebar states.
 *
 * Collapsed doesn't simply drop them: each becomes a compact tile - a live
 * green dot with two tiny avatars, and a chat glyph with an unread badge -
 * so the rail still tells you whether anything is happening without you
 * having to open the panel.
 *
 * Every number here comes from HomeSocialContext's real Firestore
 * subscriptions (friends + presence + DM conversations). Nothing is
 * fabricated: with no friends online the widget says so rather than
 * inventing a count.
 */

function initial(name: string): string {
  return (name || "?").trim().charAt(0).toUpperCase() || "?";
}

/** Overlapping avatar cluster, used by both widgets. */
function AvatarStack({
  people,
  max,
  total,
}: {
  people: { key: string; name: string; photoURL?: string; unread?: boolean }[];
  max: number;
  total: number;
}) {
  return (
    <div className="app-sidebar-stack">
      {people.slice(0, max).map((person) => (
        <span key={person.key} title={person.name}>
          {person.photoURL ? (
            <Image src={person.photoURL} width={30} height={30} alt="" unoptimized />
          ) : (
            initial(person.name)
          )}
          {person.unread && <b aria-hidden="true" />}
        </span>
      ))}
      {total > max && <span className="app-sidebar-stack-more">+{total - max}</span>}
    </div>
  );
}

export function SidebarSocial({ expanded, onNavigate }: { expanded: boolean; onNavigate: () => void }) {
  const { user } = useAuth();
  const { online, profiles, chats, loading, error, retry } = useHomeSocial();
  const t = useTranslation();

  const onlineLabel = t("nav_onlinePlayers");
  const chatsLabel = t("nav_activeChats");

  const onlinePeople = online.map((friend) => ({
    key: friend.uid,
    name: friend.name,
    photoURL: profiles[friend.uid]?.photoURL,
  }));

  const chatPeople = chats.map((chat) => {
    const other = chat.participants.find((id) => id !== user?.uid) || "";
    return {
      key: chat.id,
      name: chat.participantNames[other] || t("profile_player"),
      unread:
        chat.lastSenderUid !== user?.uid &&
        chat.lastMessageAt > (chat.lastReadAt?.[user?.uid || ""] ?? 0),
    };
  });
  const unreadCount = chatPeople.filter((chat) => chat.unread).length;

  // ── Collapsed rail ────────────────────────────────────────────────
  if (!expanded) {
    return (
      <div className="app-sidebar-social-mini">
        <SidebarTooltip label={`${onlineLabel} · ${online.length}`}>
          <Link
            href={ONLINE_HREF}
            onClick={onNavigate}
            aria-label={`${onlineLabel}: ${online.length}`}
            className="app-sidebar-mini"
          >
            <span className="app-sidebar-dot" aria-hidden="true" />
            {onlinePeople.length ? (
              <AvatarStack people={onlinePeople} max={2} total={online.length} />
            ) : (
              <Users size={15} aria-hidden="true" />
            )}
          </Link>
        </SidebarTooltip>

        <SidebarTooltip label={`${chatsLabel} · ${chats.length}`}>
          <Link
            href={CHATS_HREF}
            onClick={onNavigate}
            aria-label={`${chatsLabel}: ${chats.length}`}
            className="app-sidebar-mini"
          >
            <MessageCircle size={16} aria-hidden="true" />
            {unreadCount > 0 && <span className="app-sidebar-unread">{unreadCount}</span>}
          </Link>
        </SidebarTooltip>
      </div>
    );
  }

  // ── Expanded panel ────────────────────────────────────────────────
  if (error) {
    return (
      <div className="app-sidebar-social-error" role="alert">
        <p>{t("nav_socialError")}</p>
        <button type="button" onClick={retry}>
          {t("error_tryAgain")}
        </button>
      </div>
    );
  }

  if (loading) {
    return <div className="app-sidebar-social-skeleton" role="status" aria-label={t("nav_socialLoading")} />;
  }

  return (
    <>
      <Link href={ONLINE_HREF} onClick={onNavigate} className="app-sidebar-social">
        <header>
          <span className="app-sidebar-dot" aria-hidden="true" />
          <strong>{onlineLabel}</strong>
          <span className="app-sidebar-social-count">{online.length}</span>
          <ChevronRight size={14} aria-hidden="true" />
        </header>
        {onlinePeople.length ? (
          <AvatarStack people={onlinePeople} max={4} total={online.length} />
        ) : (
          <p>{t("nav_noFriendsOnline")}</p>
        )}
      </Link>

      <Link href={CHATS_HREF} onClick={onNavigate} className="app-sidebar-social">
        <header>
          <MessageCircle size={15} className="app-sidebar-social-glyph" aria-hidden="true" />
          <strong>{chatsLabel}</strong>
          <span className="app-sidebar-social-count">{chats.length}</span>
          <ChevronRight size={14} aria-hidden="true" />
        </header>
        {chatPeople.length ? (
          <AvatarStack people={chatPeople} max={4} total={chats.length} />
        ) : (
          <p>{t("nav_noActiveChats")}</p>
        )}
      </Link>
    </>
  );
}
