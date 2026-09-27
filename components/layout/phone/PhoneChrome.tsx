"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { watchIncomingRequests, type FriendRequestDoc } from "@/lib/friends";
import { PhoneTopBar } from "./PhoneTopBar";
import { PhoneNav } from "./PhoneNav";
import { MoreSheet } from "./MoreSheet";

/**
 * The phone shell — design/arena/MOBILE.md "The phone shell".
 *
 * The top bar, the five-slot navigation and the More sheet. It renders on
 * every shelled screen alongside the desktop chrome; CSS decides which of
 * the two is on screen (styles/arena-phone-shell.css), so there is no
 * breakpoint in JavaScript, no flash of the wrong shell on first paint,
 * and nothing to re-run when the phone turns.
 *
 * The two counts it shows are the same ones the desktop top bar shows -
 * incoming friend requests, and conversations whose last message is newer
 * than your last read and is not your own - read from the same watchers,
 * so the badges cannot say different numbers on the two shells.
 */
export function PhoneChrome() {
  const pathname = usePathname();
  const { user, isGuest } = useAuth();
  const { chats } = useHomeSocial();
  const [more, setMore] = useState(false);
  const [requests, setRequests] = useState<FriendRequestDoc[]>([]);

  // A destination chosen from the sheet should leave it behind.
  useEffect(() => { setMore(false); }, [pathname]);

  useEffect(() => {
    setRequests([]);
    if (!user?.uid || isGuest) return;
    // A failure here just leaves the badge off; it is a count, not a
    // destination, and the Friends page reports its own errors.
    return watchIncomingRequests(user.uid, setRequests, () => setRequests([]));
  }, [user?.uid, isGuest]);

  const unread = user
    ? chats.filter((chat) =>
        chat.lastMessageAt > (chat.lastReadAt?.[user.uid] ?? 0) &&
        chat.lastSenderUid !== user.uid &&
        Boolean(chat.lastMessage)
      ).length
    : 0;

  return (
    <>
      <div className="mstage" aria-hidden="true" />
      <PhoneTopBar notifications={requests.length + unread} />
      <PhoneNav onMore={() => setMore(true)} requests={requests.length} />
      <MoreSheet open={more} onClose={() => setMore(false)} unread={unread} />
    </>
  );
}
