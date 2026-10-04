"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Send, MessageCircle, RefreshCw, Gamepad2, User, ArrowLeft, Info, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { isOnline } from "@/lib/presence";
import { createRoom } from "@/lib/rooms";
import { sendRoomInvite } from "@/lib/friends";
import {
  watchConversations, sendMessage, markConversationRead,
  DmMessage, DmConversation,
} from "@/lib/messages";
import { Avatar, RankLabel } from "@/components/arena";
import { getRankFromTrophies } from "@/constants/ranks";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { presenceText } from "@/components/friends/FriendsPieces";
import { useMessageHistory } from "./useMessageHistory";
import { useHistoryScroll } from "./useHistoryScroll";
import { MessageHistoryControls } from "./MessageHistoryControls";

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
 *
 * A phone gets LMessages and LChat (design/arena/boards/LMessages.dc.html,
 * LChat.dc.html): a fixed screen with both panes, the threads on the left
 * and the open chat on the right - or "Select a conversation" until one is
 * picked, since a phone does not open the newest one by itself.
 *
 * Only one composition mounts, and the reason matters here: the thread
 * holds a live message subscription and marks the conversation read, so
 * exactly one of it may exist.
 */

const MAX = 500;

export function MessagesClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isGuest } = useAuth();
  const t = useTranslation();
  const phone = usePhoneLayout();
  const { profiles } = useHomeSocial();
  const myUid = user?.uid ?? "";
  const myName = user?.displayName ?? "Player";

  const [conversationState, setConversationState] = useState<{
    uid: string; conversations: DmConversation[]; loaded: boolean; loadError: boolean;
  }>({ uid: "", conversations: [], loaded: false, loadError: false });
  const { conversations, loaded, loadError } = conversationState.uid === myUid
    ? conversationState : { conversations: [], loaded: false, loadError: false };
  const [retryKey, setRetryKey] = useState(0);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  const withUid = searchParams.get("with");
  const withName = searchParams.get("name") ?? "Player";

  useEffect(() => {
    setConversationState({ uid: myUid, conversations: [], loaded: false, loadError: false });
    if (!myUid || isGuest) return;
    let active = true;
    const stop = watchConversations(
      myUid,
      (list) => { if (active) setConversationState({ uid: myUid, conversations: list, loaded: true, loadError: false }); },
      () => { if (active) setConversationState({ uid: myUid, conversations: [], loaded: true, loadError: true }); },
    );
    return () => { active = false; stop(); };
  }, [myUid, isGuest, retryKey]);

  /** Who a conversation is with, from my point of view. */
  function other(conversation: DmConversation) {
    const uid = conversation.participants.find(p => p !== myUid) ?? conversation.participants[0];
    return { uid, name: conversation.participantNames[uid] ?? "Player" };
  }

  // The open thread: the ?with= parameter, or the newest conversation once
  // the list arrives, so the screen is never an empty right-hand pane.
  const openUid = withUid ?? (!phone && dismissedFor !== myUid && conversations.length ? other(conversations[0]).uid : null);
  const openName = withUid
    ? withName
    : conversations.length ? other(conversations[0]).name : "";

  function open(uid: string, name: string) {
    setDismissedFor(null);
    router.replace(`/messages?with=${encodeURIComponent(uid)}&name=${encodeURIComponent(name)}`, { scroll: false });
  }
  function backToList() {
    setDismissedFor(myUid);
    router.replace("/messages", { scroll: false });
  }

  if (isGuest) {
    const prompt = (
      <section className="panel tick" style={{ padding: "40px", textAlign: "center" }}>
        <MessageCircle aria-hidden="true" style={{ width: "34px", height: "34px", color: "#3A3A46" }} />
        <p className="muted" style={{ marginTop: "12px" }}>{t("messages_signInPrompt")}</p>
        <Link href="/login" className="ar-btn sm" style={{ marginTop: 16 }}>{t("login_signIn")}</Link>
      </section>
    );
    // No board draws Messages signed out; on a phone the prompt sits in the
    // landscape page, clear of the rail, like every other screen.
    return phone
      ? <div className="arena-land is-m is-land arena-lmessages"><div className="mpage">{prompt}</div></div>
      : <div className="arena-messages ar-page">{prompt}</div>;
  }

  if (phone) {
    // LMessages: the threads and the open chat side by side, as on the
    // wide screen, at 844x390.
    return (
      <div className="arena-land is-m is-land arena-lmessages">
        <div className="mpage fx">
          <div className="cols mm fit stretch">
            <section className="panel tick cl" aria-label="Conversations">
              <div className="scrl">
                {!loaded ? (
                  <p className="muted2" style={{ margin: 8, fontSize: 12.5 }}>Loading conversations...</p>
                ) : loadError ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 8, margin: 8 }}>
                    <p className="muted2" style={{ margin: 0, fontSize: 12.5 }}>{t("messages_loadError")}</p>
                    <button type="button" className="minibtn lime" onClick={() => setRetryKey(k => k + 1)} data-flat>{t("error_tryAgain")}</button>
                  </div>
                ) : conversations.length === 0 ? (
                  <p className="muted2" style={{ margin: 8, fontSize: 12.5 }}>{t("messages_noConversationsYet")}</p>
                ) : conversations.map((conversation) => {
                  const person = other(conversation);
                  const mine = conversation.lastSenderUid === myUid;
                  const seen = conversation.lastReadAt?.[myUid] ?? 0;
                  const unread = !mine && conversation.lastMessageAt > seen;
                  const presence = presenceText(profiles[person.uid]?.lastSeen);
                  return [
                    <button type="button" key={conversation.id} className={`conv ${unread ? "unread" : ""}`.trim()}
                      aria-current={person.uid === openUid} onClick={() => open(person.uid, person.name)} data-flat>
                      <Avatar name={person.name} src={profiles[person.uid]?.photoURL} seed={person.uid} size={42} radius={10}
                        presence={presence.online ? "online" : "offline"} style={{ fontSize: 17 }} />
                      <span className="tx">
                        <span className="l1">
                          <b>{person.name}</b>
                          <span>{conversation.lastMessageAt > 0 ? when(conversation.lastMessageAt) : ""}</span>
                        </span>
                        <span className="l2">
                          <span>{mine && conversation.lastMessage ? t("messages_youPrefix") : ""}{conversation.lastMessage || t("messages_noMessagesYet")}</span>
                          {unread && <i className="udot" aria-label="Unread" />}
                        </span>
                      </span>
                    </button>,
                    <div className="cdiv" key={`${conversation.id}-div`} />,
                  ];
                })}
                <p className="tip"><Info aria-hidden="true" />Message a friend from the Friends tab to start a new conversation.</p>
              </div>
            </section>
            <section className="panel cp" aria-label="Open conversation">
              {openUid ? (
                <ChatView key={`${myUid}:${openUid}`} land myUid={myUid} myName={myName}
                  otherUid={openUid} otherName={openName} onBack={backToList} />
              ) : (
                <div className="em">
                  <div className="mart" aria-hidden="true">
                    <span className="mb t"><i data-ar-loop /><i data-ar-loop /><i data-ar-loop /></span>
                    <span className="mb m"><i style={{ width: 70 }} /><i style={{ width: 46 }} /></span>
                  </div>
                  <h2 className="disp" style={{ margin: 0, fontSize: 22, letterSpacing: "-.01em" }}><span className="chrome">{t("messages_selectTitle")}</span></h2>
                  <p style={{ margin: 0, maxWidth: 270, fontSize: 13, lineHeight: 1.45, fontWeight: 500, color: "#A4A4B2" }}>{t("messages_selectBody")}</p>
                  <Link className="ar-btn blue sm" href="/friends" style={{ marginTop: 4 }}><Users aria-hidden="true" />{t("messages_goFriends")}</Link>
                </div>
              )}
            </section>
          </div>
        </div>
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
          key={`${myUid}:${openUid}`}
          myUid={myUid}
          myName={myName}
          otherUid={openUid}
          otherName={openName}
          onBack={backToList}
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
  myUid, myName, otherUid, otherName, onBack, land = false,
}: {
  myUid: string;
  myName: string;
  otherUid: string;
  otherName: string;
  onBack: () => void;
  /** Draw LChat's pane (inside LMessages) instead of the wide screen's. */
  land?: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  const { threadRef, beforeChange } = useHistoryScroll();
  const history = useMessageHistory(myUid, myName, otherUid, otherName, beforeChange);
  const { conversationId, messages } = history;
  const latestMessageId = messages[messages.length - 1]?.id;
  const router = useRouter();
  const t = useTranslation();
  const { showToast } = useToast();
  const { profiles } = useHomeSocial();
  const profile = profiles[otherUid];
  const online = isOnline(profile?.lastSeen ?? null);

  useEffect(() => {
    // Keep "read" current while the thread stays open and new messages
    // arrive - otherwise a message that lands mid-conversation would still
    // show as unread until the thread is reopened.
    if (conversationId) markConversationRead(conversationId, myUid).catch(() => {});
  }, [conversationId, myUid, latestMessageId]);

  async function handleSend() {
    if (!conversationId || !text.trim()) return;
    const toSend = text;
    setText("");
    setError(null);
    await sendMessage(conversationId, myUid, toSend).catch((err) => { if (active.current) setError(String(err)); });
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
  const historyControls = (
    <MessageHistoryControls {...history} hasOlder={!!history.nextCursor} count={messages.length} />
  );

  /* LChat: the header, the thread and the composer inside LMessages' right
     pane. The state above is shared with the wide pane: the same
     subscription, the same read marking, the same invite, the same day
     grouping. */
  if (land) {
    const presence = presenceText(profile?.lastSeen);
    return (
      <>
        <header className="ch">
          <Avatar name={otherName} src={profile?.photoURL} seed={otherUid} size={40} radius={10}
            presence={presence.online ? "online" : "offline"} style={{ fontSize: 17 }} />
          <div className="who">
            <b>{otherName}</b>
            <span className="r2">
              <span className={`on2 ${presence.online ? "on" : ""}`.trim()}><i aria-hidden="true" />{presence.text}</span>
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
        {error && <p role="alert" className="msg-error">{error}</p>}
        <div className="msgs" ref={threadRef} tabIndex={0} role="region" aria-label="Message history"
          aria-busy={history.loading || history.loadingOlder}>
          <div className="in">
            {historyControls}
            {days.map((group) => (
              <div key={group.label} style={{ display: "contents" }}>
                <div className="mg day">{group.label}</div>
                {group.items.map((message) => (
                  <div className={`mg ${message.senderUid === myUid ? "me" : "them"}`} key={message.id} data-message-id={message.id}>
                    {message.text}
                  </div>
                ))}
              </div>
            ))}
            {!history.loading && !history.error && messages.length === 0 && (
              <div className="nomsg"><MessageCircle aria-hidden="true" /><b>{t("messages_noMessagesYet")}</b></div>
            )}
          </div>
        </div>
        <div className="cmp">
          <label className="field">
            <input
              aria-label={t("messages_placeholder")}
              value={text}
              onChange={(event) => setText(event.target.value.slice(0, MAX))}
              onKeyDown={(event) => { if (event.key === "Enter") handleSend(); }}
              placeholder={t("messages_placeholder")}
              maxLength={MAX}
            />
            <span style={{ marginLeft: "auto", fontFamily: "var(--font-display), sans-serif", fontWeight: 600, fontSize: 11, color: "#6A6A78", whiteSpace: "nowrap" }} aria-hidden="true">
              {text.length} / {MAX}
            </span>
          </label>
          <button type="button" className="ar-btn" aria-label={t("a11y_sendMessage")} onClick={handleSend}
            disabled={!conversationId || !text.trim()}>
            <Send aria-hidden="true" />
          </button>
        </div>
      </>
    );
  }

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
      {historyControls}

      <div className="msg-thread" ref={threadRef} tabIndex={0} role="region" aria-label="Message history"
        aria-busy={history.loading || history.loadingOlder}>
        {!history.loading && !history.error && messages.length === 0 && (
          <p className="muted2" style={{ alignSelf: "center", marginTop: "20px" }}>
            {t("messages_sayHelloTo").replace("{name}", otherName)}
          </p>
        )}
        {days.map((group) => (
          <div key={group.label} className="msg-day-group">
            <span className="day">{group.label}</span>
            {group.items.map((message) => (
              <div className={`bub ${message.senderUid === myUid ? "me" : "them"}`} key={message.id} data-message-id={message.id}>
                {message.text}
              </div>
            ))}
          </div>
        ))}
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
          disabled={!conversationId || !text.trim()}
        >
          <Send aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
