"use client";

import { Smartphone } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Landscape gate for phones.
 *
 * The tables, hands and sidebar are laid out for a wide viewport; in portrait
 * a phone turns that into a scroll-hunt, so the app asks to be turned
 * sideways before it will show anything.
 *
 * Deliberately CSS-driven rather than JS-driven: the whole thing is a media
 * query (see `.rotate-gate` in globals.css), so it is correct on the very
 * first paint, needs no orientation listener, no resize handler and no state
 * that could disagree with the viewport, and it re-evaluates the instant the
 * device turns. On anything that isn't a portrait phone it is display:none,
 * which also keeps it out of the accessibility tree.
 *
 * There is no dismiss button by design - the point is that portrait isn't a
 * supported way to play. The rotation-lock hint is the escape hatch for the
 * one case where rotating genuinely does nothing.
 */
export function RotateDeviceGate() {
  const t = useTranslation();

  return (
    <div className="rotate-gate" role="dialog" aria-modal="true" aria-labelledby="rotate-gate-title">
      <div className="rotate-gate-inner">
        <span className="rotate-gate-icon" aria-hidden="true">
          <Smartphone size={54} strokeWidth={1.5} />
        </span>
        <h2 id="rotate-gate-title">{t("rotate_title")}</h2>
        <p>{t("rotate_body")}</p>
        <p className="rotate-gate-hint">{t("rotate_lockHint")}</p>
      </div>
    </div>
  );
}
