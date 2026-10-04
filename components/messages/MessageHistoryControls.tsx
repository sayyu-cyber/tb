"use client";

import { History, RefreshCw } from "lucide-react";
import "./message-history.css";

export function MessageHistoryControls({ loading, loadingOlder, error, hasOlder, count, loadOlder, retry }: {
  loading: boolean; loadingOlder: boolean; error: string | null; hasOlder: boolean; count: number;
  loadOlder: () => void; retry: () => void;
}) {
  return (
    <div className="message-history-controls">
      <p role="status" aria-live="polite" aria-atomic="true">
        {loading ? "Loading messages..." : loadingOlder ? "Loading older messages..." :
          error || (count && !hasOlder ? "Beginning of conversation" : "")}
      </p>
      {error ? (
        <button type="button" className="minibtn" onClick={retry} data-flat>
          <RefreshCw aria-hidden="true" />Try again
        </button>
      ) : !loading && count > 0 ? (
        <button type="button" className="minibtn" onClick={loadOlder}
          aria-disabled={loadingOlder || !hasOlder} data-flat>
          <History aria-hidden="true" />Load older messages
        </button>
      ) : null}
    </div>
  );
}
