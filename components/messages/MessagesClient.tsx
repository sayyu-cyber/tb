"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Send, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  ensureConversation,
  watchMessages,
  watchConversations,
  sendMessage,
  DmMessage,
  DmConversation,
} from "@/lib/messages";

export function MessagesClient() {
  const searchParams = useSearchParams();
  const { user, isGuest } = useAuth();
  const withUid = searchParams.get("with");
  const withName = searchParams.get("name") ?? "Player";

  if (isGuest) {
    return (
      <div className="pt-4 pb-32 px-4">
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-[rgb(var(--c4))] text-sm">Sign in to message your friends.</p>
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

  useEffect(() => {
    if (!myUid) return;
    return watchConversations(myUid, setConversations);
  }, [myUid]);

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Messages" />
      {conversations.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center mt-4">
          <MessageCircle size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
          <p className="text-[rgb(var(--c4))] text-sm">No conversations yet — message a friend from the Friends tab.</p>
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
                      {c.lastSenderUid === myUid && c.lastMessage ? "You: " : ""}
                      {c.lastMessage || "No messages yet"}
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

  useEffect(() => {
    if (!myUid || !otherUid) return;
    let unsub: (() => void) | undefined;
    ensureConversation(myUid, myName, otherUid, otherName)
      .then((id) => {
        setConversationId(id);
        unsub = watchMessages(id, setMessages);
      })
      .catch((err) => setError(String(err)));
    return () => unsub?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myUid, otherUid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend() {
    if (!conversationId || !text.trim()) return;
    const toSend = text;
    setText("");
    await sendMessage(conversationId, myUid, toSend).catch((err) => setError(String(err)));
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] pb-24">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2">
        <Link href="/messages">
          <button className="p-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
            <ArrowLeft size={18} className="text-[#D4AF37]" />
          </button>
        </Link>
        <p className="text-[rgb(var(--text-primary))] text-sm font-semibold">{otherName}</p>
      </div>

      {error && (
        <p className="text-red-400 text-xs break-words bg-red-950/30 border border-red-900/50 rounded-lg px-3 py-2 mx-4 mb-2">{error}</p>
      )}

      <div className="flex-1 overflow-y-auto px-4 space-y-2">
        {messages.length === 0 && (
          <p className="text-[rgb(var(--c3))] text-xs text-center mt-6">Say hello to {otherName}!</p>
        )}
        {messages.map((m) => {
          const mine = m.senderUid === myUid;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                  mine
                    ? "bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F]"
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
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message…"
          maxLength={500}
          className="flex-1 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[#D4AF37]/50"
        />
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={handleSend}
          disabled={!text.trim()}
          className="p-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] disabled:opacity-40"
        >
          <Send size={16} />
        </motion.button>
      </div>
    </div>
  );
}
