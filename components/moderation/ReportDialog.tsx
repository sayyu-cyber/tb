"use client";

import { useEffect, useRef, useState } from "react";
import { Flag, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  REPORT_REASONS,
  reportUser,
  blockUser,
  type ReportContext,
  type ReportReason,
} from "@/lib/moderation";

/**
 * Report a player.
 *
 * Built on the native <dialog> element, the same pattern the Clubs, Settings
 * and game-table dialogs use - it gets Escape-to-close, focus trapping and
 * the top-layer stacking for free, and the top layer is immune to ancestor
 * transforms, which is what broke an earlier hand-rolled modal on the game
 * table.
 *
 * "Also block this player" is checked by DEFAULT. Someone distressed enough
 * to file a report almost always wants the person gone immediately, and
 * making them find a second control afterwards is a poor answer to a safety
 * problem. They can uncheck it.
 *
 * The dialog never reveals whether a report was actioned - that would let a
 * reporter probe moderation decisions, and it exposes the reported player's
 * account status to a stranger.
 */
export function ReportDialog({
  open,
  onClose,
  targetUid,
  targetName,
  context = "profile",
  evidence,
}: {
  open: boolean;
  onClose: () => void;
  targetUid: string;
  targetName: string;
  context?: ReportContext;
  /** Snapshot of the offending text, captured now because the original can
   *  be deleted and a report without evidence is not actionable. */
  evidence?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { user } = useAuth();
  const { showToast } = useToast();

  const [reason, setReason] = useState<ReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Reset between openings so a previous report's text never leaks into the
  // next one.
  useEffect(() => {
    if (open) {
      setReason("harassment");
      setDetails("");
      setAlsoBlock(true);
      setError("");
    }
  }, [open]);

  async function submit() {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      await reportUser({
        reporterUid: user.uid,
        reporterName: user.displayName || "Player",
        targetUid,
        targetName,
        reason,
        context,
        evidence,
        details: details.trim() || undefined,
      });
      if (alsoBlock) await blockUser(user.uid, targetUid);
      showToast(
        alsoBlock ? `Reported and blocked ${targetName}.` : `Reported ${targetName}.`,
        "success"
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the report. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      className="mod-dialog"
      aria-labelledby="report-dialog-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <header>
        <h2 id="report-dialog-title">
          <Flag size={18} aria-hidden="true" />
          Report {targetName}
        </h2>
        <button type="button" onClick={onClose} disabled={busy} aria-label="Close">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <fieldset className="mod-reasons">
        <legend>What is the problem?</legend>
        {REPORT_REASONS.map((option) => (
          <label key={option.id}>
            <input
              type="radio"
              name="report-reason"
              value={option.id}
              checked={reason === option.id}
              onChange={() => setReason(option.id)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      {evidence && (
        <div className="mod-evidence">
          <span>Reporting this message</span>
          <blockquote>{evidence}</blockquote>
        </div>
      )}

      <label className="mod-details">
        <span>Anything else we should know? (optional)</span>
        <textarea
          value={details}
          maxLength={500}
          rows={3}
          onChange={(event) => setDetails(event.target.value)}
          placeholder="Add any detail that would help us review this."
        />
      </label>

      <label className="mod-check">
        <input
          type="checkbox"
          checked={alsoBlock}
          onChange={(event) => setAlsoBlock(event.target.checked)}
        />
        <span>
          Also block {targetName}
          <small>You will not see each other&rsquo;s messages.</small>
        </span>
      </label>

      {error && (
        <p className="mod-error" role="alert">
          {error}
        </p>
      )}

      <footer>
        <Button variant="secondary" disabled={busy} onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={busy} onClick={submit}>
          Send report
        </Button>
      </footer>
    </dialog>
  );
}
