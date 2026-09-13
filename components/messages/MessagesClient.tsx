"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, MessageCircle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  ensureConversation,
  watchMessages,
  watchConversations,
  sendMessage,
  markConversationRead,
  DmMessage,
  DmConversation,
} from "@/lib/messages";
import { useTranslation } from "@/hooks/useTranslation";

export function MessagesClient() {
  const searchParams = useSearchParams();
  const { user, isGuest } = useAuth();
  const withUid = searchParams.get("with");
  const withName = searchParams.get("name") ?? "Player";
  const t = useTranslation();

  if (isGuest) {
    return (
      <div className="pt-4 pb-32 px-4">
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-[rgb(var(--c4))] text-sm">{t("messages_signInPrompt")}</p>
        </div>
      </div>
    );
  }

  if (!withUid) {
    return <ConversationList myUid={user?.uid ?? ""} />;
  }
  return <ChatView myUid={user?.uid ?? ""} myName={user?.displayName ?? "Player"} otherUid={withUid} otherName={withName} />;
}

function ConversationList({ myUid }: { myUid: string }) {
  const [conversations, setConversations] = useState<DmConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const t = useTranslation();

  useEffect(() => {
    if (!myUid) return;
    setLoaded(false);
    setLoadError(false);
    return watchConversations(
      myUid,
      (list) => {
        setConversations(list);
        setLoaded(true);
      },
      () => {
        setLoadError(true);
        setLoaded(true);
      }
    );
  }, [myUid, retryKey]);

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_messages")} />
      {!loaded ? (
        <div className="space-y-2 mt-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-14 bg-[rgb(var(--c2))] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="glass-card rounded-2xl p-6 text-center mt-4">
          <MessageCircle size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
          <p className="text-[rgb(var(--c4))] text-sm">{t("messages_loadError")}</p>
          <button
            onClick={() => setRetryKey((k) => k + 1)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--c3))] px-4 py-2 text-xs font-semibold text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--c3)/70%)] transition-colors"
          >
            <RefreshCw size={13} aria-hidden="true" />
            {t("error_tryAgain")}
          </button>
        </div>
      ) : conversations.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center mt-4">
          <MessageCircle size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
          <p className="text-[rgb(var(--c4))] text-sm">{t("messages_noConversationsYet")}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const otherUid = c.participants.find((p) => p !== myUid) ?? c.participants[0];
            const otherName = c.participantNames[otherUid] ?? "Player";
            return (
              <Link key={c.id} href={`/messages?with=${otherUid}&name=${encodeURIComponent(otherName)}`}>
                <motion.div whileTap={{ scale: 0.98 }} className="glass-card rounded-xl p-3 flex items-center justify-between">
                  <div className="min-w-0">
                    <p className="text-[rgb(var(--text-primary))] text-sm font-medium">{otherName}</p>
                    <p className="text-[rgb(var(--c4))] text-xs truncate max-w-[220px]">
                      {c.lastSenderUid === myUid && c.lastMessage ? t("messages_youPrefix") : ""}
                      {c.lastMessage || t("messages_noMessagesYet")}
                    </p>
                  </div>
                  {c.lastMessageAt > 0 && (
                    <span className="text-[rgb(var(--c3))] text-[10px] whitespace-nowrap ml-2">
                      {new Date(c.lastMessageAt).toLocaleDateString()}
                    </span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChatView({ myUid, myName, otherUid, otherName }: { myUid: string; myName: string; otherUid: string; otherName: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const t = useTranslation();

  useEffect(() => {
    if (!myUid || !otherUid) return;
    let unsub: (() => void) | undefined;
    ensureConversation(myUid, myName, otherUid, otherName)
      .then((id) => {
        setConversationId(id);
        unsub = watchMessages(id, setMessages);
        // Opening the thread is "reading" it - marks it seen for the
        // friends rail's unread indicator (components/home/FriendsRail.tsx).
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
    // show as unread on the rail until the thread is reopened.
    if (conversationId) markConversationRead(conversationId, myUid).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  async function handleSend() {
    if (!conversationId || !text.trim()) return;
    const toSend = text;
    setText("");
    await sendMessage(conversationId, myUid, toSend).catch((err) => setError(String(err)));
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] pb-6">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/messages">
          <button aria-label={t("a11y_goBack")} className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
            <ArrowLeft size={18} className="text-[rgb(var(--gold-ink))]" />
          </button>
        </Link>
        <p className="text-[rgb(var(--text-primary))] text-sm font-semibold">{otherName}</p>
      </div>

      {error && (
        <p className="text-[rgb(var(--coral-ink))] text-xs break-words bg-[rgb(var(--coral)/10%)] border border-[rgb(var(--coral)/30%)] rounded-lg px-3 py-2 mx-4 mb-2">{error}</p>
      )}

      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-[rgb(var(--c3))] text-xs text-center mt-6">{t("messages_sayHelloTo").replace("{name}", otherName)}</p>
        )}
        {messages.map((m) => {
          const mine = m.senderUid === myUid;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]"
                    : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))]"
                }`}
              >
                {m.text}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="flex items-center gap-2 px-4 pt-2">
        <input
          aria-label={t("messages_placeholder")}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder={t("messages_placeholder")}
          maxLength={500}
          className="flex-1 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)]"
        />
        <motion.button
          aria-label={t("a11y_sendMessage")}
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] disabled:opacity-40"
        >
          <Send size={16} />
        </motion.button>
      </div>
    </div>
  );
}
