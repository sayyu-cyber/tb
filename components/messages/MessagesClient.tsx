"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Send, MessageCircle, RefreshCw, Gamepad2, User, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { isOnline } from "@/lib/presence";
import { createRoom } from "@/lib/rooms";
import { sendRoomInvite } from "@/lib/friends";
import {
  ensureConversation, watchMessages, watchConversations, sendMessage, markConversationRead,
  DmMessage, DmConversation,
} from "@/lib/messages";
import { Avatar, RankLabel } from "@/components/arena";
import { getRankFromTrophies } from "@/constants/ranks";

/**
 * Messages — design/arena/screens/app/app-05-messages.jpg, from the
 * Messages board.
 *
 * APP_SCREENS.md calls this board "a proposal": it puts the conversation
 * list and the open chat side by side, where the app showed one at a time
 * behind a ?with= parameter. The parameter still drives which thread is
 * open - so every existing link into a conversation (the Friends row's
 * Message button, the sidebar's Active Chats) still works - but the list
 * stays visible beside it, and picking a conversation swaps the pane
 * without a navigation.
 *
 * Under 900px there is no room for two panes, so it falls back to one at a
 * time with a back arrow, which is the behaviour it had before.
 */

const MAX = 500;

export function MessagesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const t = useTranslation();
  const myUid = user?.uid ?? "";
  const myName = user?.displayName ?? "Player";

  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  const withUid = searchParams.get("with");
  const withName = searchParams.get("name") ?? "Player";

  useEffect(() => {
    if (!myUid || isGuest) return;
    setLoaded(false);
    setLoadError(false);
    return watchConversations(
      myUid,
      (list) => { setConversations(list); setLoaded(true); },
      () => { setLoadError(true); setLoaded(true); },
    );
  }, [myUid, isGuest, retryKey]);

  /** Who a conversation is with, from my point of view. */
  function other(conversation: DmConversation) {
    const uid = conversation.participants.find(p => p !== myUid) ?? conversation.participants[0];
    return { uid, name: conversation.participantNames[uid] ?? "Player" };
  }

  // The open thread: the ?with= parameter, or the newest conversation once
  // the list arrives, so the screen is never an empty right-hand pane.
  const openUid = withUid ?? (conversations.length ? other(conversations[0]).uid : null);
  const openName = withUid
    ? withName
    : conversations.length ? other(conversations[0]).name : "";

  function open(uid: string, name: string) {
    router.replace(`/messages?with=${encodeURIComponent(uid)}&name=${encodeURIComponent(name)}`, { scroll: false });
  }

  if (isGuest) {
    return (
      <div className="arena-messages ar-page">
        <section className="panel tick" style={{ padding: "40px", textAlign: "center" }}>
          <MessageCircle aria-hidden="true" style={{ width: "34px", height: "34px", color: "#3A3A46" }} />
          <p className="muted" style={{ marginTop: "12px" }}>{t("messages_signInPrompt")}</p>
        </section>
      </div>
    );
  }

  return (
    <div className={`arena-messages ar-page msg-page ${openUid ? "has-open" : ""}`.trim()}>
      <section className="panel tick msg-list" aria-label="Conversations">
        <div className="msg-head">
          <span className="lbl dash" style={{ color: "#C6FF33" }}>Direct messages</span>
          <h1 className="disp chrome msg-title">{t("page_messages")}</h1>
        </div>

        {!loaded ? (
          <p className="muted2" style={{ padding: "0 8px" }}>Loading conversations...</p>
        ) : loadError ? (
          <div style={{ padding: "0 8px" }}>
            <p className="muted2">{t("messages_loadError")}</p>
            <button type="button" className="minibtn lime" onClick={() => setRetryKey(k => k + 1)} data-flat>
              <RefreshCw aria-hidden="true" />{t("error_tryAgain")}
            </button>
          </div>
        ) : conversations.length === 0 ? (
          <p className="muted2" style={{ padding: "0 8px" }}>{t("messages_noConversationsYet")}</p>
        ) : (
          conversations.map((conversation) => {
            const person = other(conversation);
            const mine = conversation.lastSenderUid === myUid;
            const seen = conversation.lastReadAt?.[myUid] ?? 0;
            const unread = !mine && conversation.lastMessageAt > seen;
            return (
              <button
                type="button"
                className={`conv ${unread ? "unread" : ""}`.trim()}
                key={conversation.id}
                aria-current={person.uid === openUid}
                onClick={() => open(person.uid, person.name)}
                data-flat
              >
                <Avatar name={person.name} seed={person.uid} size={44} radius={11} />
                <span className="tx">
                  <b>{person.name}</b>
                  <span>
                    {mine && conversation.lastMessage ? t("messages_youPrefix") : ""}
                    {conversation.lastMessage || t("messages_noMessagesYet")}
                  </span>
                </span>
                <span className="when">
                  {conversation.lastMessageAt > 0 && (
                    <span className="muted2">{when(conversation.lastMessageAt)}</span>
                  )}
                  {unread && <i className="udot" aria-label="Unread" />}
                </span>
              </button>
            );
          })
        )}

        <p className="muted2 msg-hint">
          Message a friend from the Friends tab to start a new conversation.
        </p>
      </section>

      {openUid ? (
        <ChatView
          key={openUid}
          myUid={myUid}
          myName={myName}
          otherUid={openUid}
          otherName={openName}
          onBack={() => router.replace("/messages", { scroll: false })}
        />
      ) : (
        <section className="panel msg-chat msg-empty" aria-label="No conversation open">
          <MessageCircle aria-hidden="true" />
          <p className="muted">Pick a conversation, or message a friend from the Friends tab.</p>
        </section>
      )}
    </div>
  );
}

/** "Today", "Sep 25" - the board's two forms. */
function when(timestamp: number) {
  const date = new Date(timestamp);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();
  return sameDay ? "Today" : date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChatView({
  myUid, myName, otherUid, otherName, onBack,
}: {
  myUid: string;
  myName: string;
  otherUid: string;
  otherName: string;
  onBack: () => void;
}) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const t = useTranslation();
  const { showToast } = useToast();
  const { profiles } = useHomeSocial();
  const profile = profiles[otherUid];
  const online = isOnline(profile?.lastSeen ?? null);

  useEffect(() => {
    if (!myUid || !otherUid) return;
    let unsub: (() => void) | undefined;
    ensureConversation(myUid, myName, otherUid, otherName)
      .then((id) => {
        setConversationId(id);
        unsub = watchMessages(id, setMessages);
        // Opening the thread is "reading" it - marks it seen for the
        // sidebar's Active Chats count and this screen's unread dot.
        markConversationRead(id, myUid).catch(() => {});
      })
      .catch((err) => setError(String(err)));
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUid, otherUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    // Keep "read" current while the thread stays open and new messages
    // arrive - otherwise a message that lands mid-conversation would still
    // show as unread until the thread is reopened.
    if (conversationId) markConversationRead(conversationId, myUid).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  async function handleSend() {
    if (!conversationId || !text.trim()) return;
    const toSend = text;
    setText("");
    await sendMessage(conversationId, myUid, toSend).catch((err) => setError(String(err)));
  }

  /** The board's "Invite to Mindi" - the same action the Friends row runs. */
  async function invite() {
    if (inviting) return;
    setInviting(true);
    try {
      const code = await createRoom(myUid, myName, "mindi", null);
      await sendRoomInvite(myUid, myName, otherUid, code, "mindi");
      router.push(`/play/mindi/room?code=${encodeURIComponent(code)}`);
    } catch {
      showToast("Could not create the room. Please try again.", "error");
    } finally {
      setInviting(false);
    }
  }

  // Messages grouped under the board's day separator.
  const days = useMemo(() => {
    const groups: { label: string; items: DmMessage[] }[] = [];
    for (const message of messages) {
      const label = when(message.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.items.push(message);
      else groups.push({ label, items: [message] });
    }
    return groups;
  }, [messages]);

  const trophies = profile?.trophies ?? 0;

  return (
    <section className="panel msg-chat" aria-label={`Chat with ${otherName}`}>
      <header className="msg-chat-head">
        <button type="button" className="ibtn msg-back" aria-label={t("a11y_goBack")} onClick={onBack}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <Avatar name={otherName} src={profile?.photoURL} seed={otherUid} size={48} radius={12}
          presence={online ? "online" : "offline"} />
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", flexGrow: 1, minWidth: 0 }}>
          <b className="disp" style={{ fontSize: "20px", letterSpacing: ".02em" }}>{otherName}</b>
          <span style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span className={`st ${online ? "on" : ""}`.trim()}>
              <i aria-hidden="true" />{online ? "Online" : "Offline"}
            </span>
            {profile && <RankLabel tier={getRankFromTrophies(trophies)} />}
          </span>
        </div>
        <button type="button" className="ar-btn blue sm" onClick={invite} disabled={inviting}>
          <Gamepad2 aria-hidden="true" />Invite to Mindi
        </button>
        <a className="ibtn" aria-label={`View ${otherName}'s profile`} href={`/player?uid=${encodeURIComponent(otherUid)}`}>
          <User aria-hidden="true" />
        </a>
      </header>

      {error && (
        <p role="alert" className="msg-error">{error}</p>
      )}

      <div className="msg-thread">
        {messages.length === 0 && (
          <p className="muted2" style={{ alignSelf: "center", marginTop: "20px" }}>
            {t("messages_sayHelloTo").replace("{name}", otherName)}
          </p>
        )}
        {days.map((group) => (
          <div key={group.label} className="msg-day-group">
            <span className="day">{group.label}</span>
            {group.items.map((message) => (
              <div className={`bub ${message.senderUid === myUid ? "me" : "them"}`} key={message.id}>
                {message.text}
              </div>
            ))}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="composer">
        <label className="field">
          <input
            aria-label={t("messages_placeholder")}
            value={text}
            onChange={(event) => setText(event.target.value.slice(0, MAX))}
            onKeyDown={(event) => { if (event.key === "Enter") handleSend(); }}
            placeholder={t("messages_placeholder")}
            maxLength={MAX}
          />
          <span className="counter" aria-hidden="true">{text.length} / {MAX}</span>
        </label>
        <button
          type="button"
          className="ar-btn msg-send"
          aria-label={t("a11y_sendMessage")}
          onClick={handleSend}
          disabled={!text.trim()}
        >
          <Send aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
