"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { sendClubMessage } from "@/lib/clubs";
import { useClubMessageHistory } from "@/components/messages/useMessageHistory";
import { useHistoryScroll } from "@/components/messages/useHistoryScroll";
import { MessageHistoryControls } from "@/components/messages/MessageHistoryControls";

export function ClubChat({ clubId, myUid, myName }: { clubId: string; myUid: string; myName: string }) {
  return <ClubChatThread key={`${myUid}:${clubId}`} clubId={clubId} myUid={myUid} myName={myName} />;
}

function ClubChatThread({ clubId, myUid, myName }: { clubId: string; myUid: string; myName: string }) {
  const { threadRef, beforeChange } = useHistoryScroll();
  const history = useClubMessageHistory(myUid, clubId, beforeChange);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  async function handleSend() {
    if (!text.trim() || sending.current || !history.conversationId || history.error) return;
    sending.current = true;
    setBusy(true);
    setSendError("");
    const toSend = text;
    try {
      await sendClubMessage(clubId, myUid, myName, toSend);
      if (active.current) setText(previous => previous === toSend ? "" : previous);
    } catch { if (active.current) setSendError("Message not sent. Please try again."); }
    finally { sending.current = false; if (active.current) setBusy(false); }
  }

  return (
    <div className="club-chat paginated-club-chat">
      <MessageHistoryControls {...history} hasOlder={!!history.nextCursor} count={history.messages.length} />
      <div className="club-message-history" ref={threadRef} tabIndex={0} role="region"
        aria-label="Club message history" aria-busy={history.loading || history.loadingOlder}>
        {!history.loading && !history.error && history.messages.length === 0 && (
          <p className="muted2">No messages yet. Say hello to the club.</p>
        )}
        {history.messages.map(message => (
          <div className={`cb2 ${message.senderUid === myUid ? "me" : "them"}`} key={message.id} data-message-id={message.id}>
            {message.senderUid !== myUid && <small>{message.senderName}</small>}
            {message.text}
          </div>
        ))}
      </div>
      {sendError && <p role="alert" className="muted2">{sendError}</p>}
      <label className="field club-composer">
        <input value={text} onChange={event => setText(event.target.value.slice(0, 500))}
          onKeyDown={event => { if (event.key === "Enter") void handleSend(); }}
          placeholder="Message the club..." aria-label="Message the club" maxLength={500} />
        <button type="button" className="club-send" aria-label="Send to club"
          disabled={!text.trim() || busy || !history.conversationId || !!history.error} onClick={handleSend}>
          <Send aria-hidden="true" />
        </button>
      </label>
    </div>
  );
}
