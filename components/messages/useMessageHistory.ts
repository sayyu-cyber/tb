"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ensureConversation, loadMessagesPage, watchSocialSnapshot,
  type DmMessage, type MessageCursor,
} from "@/lib/messages";
import { loadClubMessagesPage, type ClubMessage } from "@/lib/clubs";

type Page<M> = { messages: M[]; nextCursor: MessageCursor | null };
type History<M> = {
  scope: string;
  conversationId: string | null;
  messages: M[];
  loading: boolean;
  loadingOlder: boolean;
  nextCursor: MessageCursor | null;
  error: string | null;
};
const empty = {
  scope: "", conversationId: null, messages: [], loading: true, loadingOlder: false,
  nextCursor: null, error: null,
};

function mergeMessages<M extends DmMessage>(previous: M[], incoming: M[]) {
  const byId = new Map(previous.map(message => [message.id, message]));
  for (const message of incoming) byId.set(message.id, message);
  return [...byId.values()].sort((a, b) => a.createdAt - b.createdAt || a.id.localeCompare(b.id));
}

export function useMessageHistory(
  myUid: string, myName: string, otherUid: string, otherName: string,
  beforeChange: (followLatest: boolean) => void,
) {
  const resolveId = useCallback(() => ensureConversation(myUid, myName, otherUid, otherName),
    [myUid, myName, otherUid, otherName]);
  return usePaginatedMessages<DmMessage>("dm", myUid, otherUid, resolveId, beforeChange);
}

export function useClubMessageHistory(myUid: string, clubId: string, beforeChange: (followLatest: boolean) => void) {
  const resolveId = useCallback(async () => clubId, [clubId]);
  return usePaginatedMessages<ClubMessage>("club", myUid, clubId, resolveId, beforeChange);
}

function usePaginatedMessages<M extends DmMessage>(
  kind: "dm" | "club", myUid: string, targetId: string, resolveId: () => Promise<string>,
  beforeChange: (followLatest: boolean) => void,
) {
  const scope = `${kind}:${myUid}:${targetId}`;
  const renderedScope = useRef(scope);
  renderedScope.current = scope;
  const [history, setHistory] = useState<History<M>>(empty);
  const [retryKey, setRetryKey] = useState(0);
  const sessionRef = useRef<{
    active: boolean; id: string; cursor: MessageCursor | null; olderPending: boolean; revision: number; stop: () => void;
  } | null>(null);

  useEffect(() => {
    const session = { active: true, id: "", cursor: null as MessageCursor | null, olderPending: false, revision: 0, stop: () => {} };
    sessionRef.current = session;
    setHistory({ ...empty, scope });
    let unsubscribe: (() => void) | undefined;
    session.stop = () => unsubscribe?.();
    let initialized = false;
    // These guards also cover an unresolved ensureConversation during unmount.
    const current = () => session.active && sessionRef.current === session && renderedScope.current === scope;
    if (myUid && targetId) {
      void resolveId().then(id => {
        if (!current()) return;
        session.id = id;
        const tables = kind === "dm" ? [
          { table: "messages", filter: `room_id=eq.${id}` },
          { table: "chat_participants", filter: `room_id=eq.${id}` },
        ] : [
          { table: "club_messages", filter: `club_id=eq.${id}` },
          { table: "club_members", filter: `club_id=eq.${id}` },
        ];
        const load = () => (kind === "dm" ? loadMessagesPage(id) : loadClubMessagesPage(id)) as Promise<Page<M>>;
        unsubscribe = watchSocialSnapshot<Page<M>>(`${kind}-history:${id}`, tables, load, page => {
          if (!current()) return;
          beforeChange(true);
          if (!initialized || !page.messages.length) session.cursor = page.nextCursor;
          if (!page.messages.length) {
            session.revision++;
            session.olderPending = false;
          }
          setHistory(previous => ({
            ...previous, conversationId: id, loading: false, error: null,
            messages: page.messages.length ? mergeMessages(previous.messages, page.messages) : [],
            nextCursor: session.cursor, loadingOlder: page.messages.length ? previous.loadingOlder : false,
          }));
          initialized = page.messages.length > 0;
        }, () => {
          if (!current()) return;
          // Invalidate older requests and clear history if access or refresh fails.
          session.active = false;
          session.stop();
          beforeChange(false);
          setHistory({ ...empty, scope, loading: false, error: "Messages could not be loaded. Please try again." });
        }, { messages: [], nextCursor: null });
      }).catch(() => {
        if (!current()) return;
        setHistory({ ...empty, scope, loading: false, error: "Messages could not be loaded. Please try again." });
      });
    }
    return () => { session.active = false; unsubscribe?.(); };
  }, [kind, myUid, targetId, scope, resolveId, retryKey, beforeChange]);

  async function loadOlder() {
    const session = sessionRef.current;
    if (history.scope !== scope || !session?.active || !session.id || !session.cursor || session.olderPending) return;
    session.olderPending = true;
    const revision = session.revision;
    const current = () => session.active && sessionRef.current === session && session.revision === revision && renderedScope.current === scope;
    beforeChange(false);
    setHistory(previous => ({ ...previous, loadingOlder: true }));
    try {
      const page = await (kind === "dm" ? loadMessagesPage(session.id, session.cursor) : loadClubMessagesPage(session.id, session.cursor)) as Page<M>;
      if (!current()) return;
      session.cursor = page.nextCursor;
      beforeChange(false);
      setHistory(previous => ({
        ...previous, messages: mergeMessages(page.messages, previous.messages),
        nextCursor: page.nextCursor, loadingOlder: false,
      }));
    } catch {
      if (!current()) return;
      session.active = false;
      session.stop();
      beforeChange(false);
      setHistory({ ...empty, scope, loading: false, error: "Older messages could not be loaded. Please try again." });
    } finally {
      if (current()) session.olderPending = false;
    }
  }

  return { ...(history.scope === scope ? history : empty), loadOlder, retry: () => setRetryKey(key => key + 1) };
}
