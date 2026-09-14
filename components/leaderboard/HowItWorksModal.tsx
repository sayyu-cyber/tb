"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * "How it works" explainer.
 *
 * Built on the native <dialog> element, the same pattern the Clubs, Settings
 * and News dialogs already use in this project - so it inherits Escape to
 * close, focus trapping and the ::backdrop treatment for free rather than
 * reimplementing a modal.
 *
 * Every claim in the copy is checked against the code: trophy values come
 * from lib/trophyUpdates.ts, tier thresholds from RANK_CONFIGS, and the
 * weekly behaviour from getWeekStartKey's lazy reset. Notably it does NOT
 * state a tie-break rule, because none is implemented - Firestore returns
 * equal-trophy players in unspecified order, and claiming otherwise would be
 * inventing a rule.
 */
export function HowItWorksModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const t = useTranslation();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="lb-dialog"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{t("leaderboard_howItWorks")}</h2>
        <button type="button" onClick={onClose} aria-label={t("common_close")}>
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <dl>
        <dt>{t("leaderboard_hiwOrderTitle")}</dt>
        <dd>{t("leaderboard_hiwOrderBody")}</dd>

        <dt>{t("leaderboard_hiwTrophyTitle")}</dt>
        <dd>{t("leaderboard_hiwTrophyBody")}</dd>

        <dt>{t("leaderboard_hiwResetTitle")}</dt>
        <dd>{t("leaderboard_hiwResetBody")}</dd>

        <dt>{t("leaderboard_hiwRewardTitle")}</dt>
        <dd>{t("leaderboard_hiwRewardBody")}</dd>
      </dl>
    </dialog>
  );
}
