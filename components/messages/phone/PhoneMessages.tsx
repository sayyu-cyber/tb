"use client";

import { Info } from "lucide-react";
import type { DmConversation } from "@/lib/messages";
import { Avatar } from "@/components/arena";

/**
 * The conversation list on a phone held upright —
 * design/arena/boards/MMessages.dc.html,
 * design/arena/screens/phone/phone-05-messages.jpg.
 *
 * The wide screen puts the list and the open thread side by side. At 390px
 * there is no room for two panes, so the list is the whole screen and the
 * thread slides in over it (MOBILE.md "Thread") - which is also what the app
 * did before the wide board proposed the two-pane layout.
 *
 * Rows are the board's `.conv`, separated by `.cdiv` hairlines rather than
 * the wide screen's own spacing, with the unread dot in the same place.
 */
export function PhoneMessages({
  title, conversations, loaded, loadError, loadErrorText, retryText, emptyText,
  youPrefix, noMessagesText, myUid, otherOf, when, onOpen, onRetry,
}: {
  title: string;
  conversations: DmConversation[];
  loaded: boolean;
  loadError: boolean;
  loadErrorText: string;
  retryText: string;
  emptyText: string;
  youPrefix: string;
  noMessagesText: string;
  myUid: string;
  otherOf: (conversation: DmConversation) => { uid: string; name: string };
  when: (timestamp: number) => string;
  onOpen: (uid: string, name: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="arena-mmessages mpage">
      <div className="mh">
        <span className="lbl dash" style={{ color: "#C6FF33" }}>Direct messages</span>
        <h1 className="disp chrome">{title}</h1>
      </div>

      <section className="panel tick" aria-label="Conversations" style={{ padding: 6 }}>
        {!loaded ? (
          <p className="muted2" style={{ padding: "12px 8px" }}>Loading conversations...</p>
        ) : loadError ? (
          <div style={{ padding: "12px 8px" }}>
            <p className="muted2">{loadErrorText}</p>
            <button type="button" className="minibtn lime" onClick={onRetry} data-flat>{retryText}</button>
          </div>
        ) : conversations.length === 0 ? (
          <p className="muted2" style={{ padding: "12px 8px" }}>{emptyText}</p>
        ) : conversations.map((conversation, index) => {
          const person = otherOf(conversation);
          const mine = conversation.lastSenderUid === myUid;
          const seen = conversation.lastReadAt?.[myUid] ?? 0;
          const unread = !mine && conversation.lastMessageAt > seen;
          return (
            <div key={conversation.id}>
              {index > 0 && <div className="cdiv" />}
              <button
                type="button"
                className={`conv ${unread ? "unread" : ""}`.trim()}
                onClick={() => onOpen(person.uid, person.name)}
                data-flat
              >
                <Avatar name={person.name} seed={person.uid} size={44} radius={11} />
                <span className="tx">
                  <b>{person.name}</b>
                  <span>
                    {mine && conversation.lastMessage ? youPrefix : ""}
                    {conversation.lastMessage || noMessagesText}
                  </span>
                </span>
                <span className="when">
                  {conversation.lastMessageAt > 0 && <span className="muted2">{when(conversation.lastMessageAt)}</span>}
                  {unread && <i className="udot" aria-label="Unread" />}
                </span>
              </button>
            </div>
          );
        })}
      </section>

      <p className="muted2" style={{ margin: "0 4px", lineHeight: 1.45, display: "flex", gap: 8 }}>
        <Info aria-hidden="true" style={{ flex: "none", width: 15, height: 15, color: "#00BCC8" }} />
        Message a friend from the Friends tab to start a new conversation.
      </p>
    </div>
  );
}
