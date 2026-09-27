"use client";

import { useEffect, useState } from "react";
import { Smartphone, Check, Info } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useCanLockOrientation } from "@/hooks/useOrientationLock";
import { lockLandscape } from "@/lib/orientationLock";
import { Sheet } from "@/components/layout/phone/Sheet";
import { TurningPhone } from "@/components/layout/phone/TurningPhone";
import type { LobbyMode } from "./lobbyGames";

/**
 * The rotate sheet over the portrait lobby —
 * design/arena/boards/MPlayFind.dc.html, design/arena/MOBILE.md
 * "The turn happens at the Play button".
 *
 * MPlayFind is MPlay with this sheet open, so its stylesheet is
 * byte-for-byte MPlay's and only the markup is new: the turning phone, the
 * ask, a live status row, and a way out.
 *
 * The status row is the point of it. For Casual Online it spins and counts
 * the time spent looking, because the queue really is running behind the
 * sheet - turning the phone does not restart it, the landscape lobby simply
 * carries on. For Vs AI and Pass & Play there is nothing to wait for, so it
 * shows a lime tick and "Your table is ready", and no clock runs while the
 * player turns the phone.
 *
 * "Go landscape" only exists where the orientation lock does. On an iPhone
 * the sheet shows Stop looking and the hint alone, which is honest: there is
 * no button that could turn that screen.
 */
export function RotateToPlaySheet({
  open,
  onStop,
  /** The chosen game's name, for "Finding a Mindi table". */
  gameName,
  /** The chosen mode, whose name is the line under the title. */
  mode,
  /** True for Vs AI and Pass & Play: ready rather than searching. */
  ready,
}: {
  open: boolean;
  onStop: () => void;
  gameName: string;
  mode: LobbyMode;
  ready: boolean;
}) {
  const t = useTranslation();
  // The board's own second line: the mode, and for a x2 mode what that is
  // worth, because that is the reason a player chose it.
  const modeName = mode.x2 ? `${mode.name} · ${t("lobby_doubleTrophiesLabel")}` : mode.name;
  const canLock = useCanLockOrientation();
  const [seconds, setSeconds] = useState(0);

  // Only the search has a clock. Restarted with each new search so "0:07"
  // means seven seconds of THIS look, not of the session.
  useEffect(() => {
    if (!open || ready) { setSeconds(0); return; }
    const id = setInterval(() => setSeconds((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [open, ready]);

  return (
    <Sheet
      open={open}
      onClose={onStop}
      label={t("rotate_title")}
      headingId="rotate-sheet-title"
      namespace="arena-mplay"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", textAlign: "center" }}
    >
      <TurningPhone small />
      <span className="lbl dash" style={{ color: "#C6FF33" }}>{t("rotate_sideways")}</span>
      <h2 id="rotate-sheet-title" className="disp chrome" style={{ margin: 0, fontSize: "32px" }}>
        {t("rotate_title")}
      </h2>
      <p className="body" style={{ margin: 0, maxWidth: "300px", fontSize: "14px" }}>
        {ready ? t("rotate_bodyReady") : t("rotate_bodyLobby")}
      </p>

      <div className="qrow" role="status">
        {ready ? (
          <span
            aria-hidden="true"
            style={{
              flex: "none", display: "flex", alignItems: "center", justifyContent: "center",
              width: "20px", height: "20px", borderRadius: "6px", background: "#C6FF33", color: "#0A0A0A",
            }}
          >
            <Check style={{ width: "13px", height: "13px" }} />
          </span>
        ) : (
          <i className="spin" aria-hidden="true" data-ar-loop />
        )}
        <span style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: "4px" }}>
          <b className="disp" style={{ fontSize: "14px", letterSpacing: ".04em" }}>
            {(ready ? t("rotate_tableReady") : t("rotate_findingTable")).replace("{game}", gameName)}
          </b>
          <span className="muted2">{modeName}</span>
        </span>
        {!ready && (
          <b className="num" style={{ fontSize: "18px", color: "#C6FF33" }}>
            0:{String(seconds).padStart(2, "0")}
          </b>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", marginTop: "4px" }}>
        {canLock && (
          <button type="button" className="ar-btn full" onClick={() => void lockLandscape()}>
            <Smartphone aria-hidden="true" style={{ transform: "rotate(-90deg)" }} />
            {t("rotate_goLandscape")}
          </button>
        )}
        <button type="button" className="ar-btn ghost full" onClick={onStop}>
          {ready ? t("common_cancel") : t("rotate_stopLooking")}
        </button>
      </div>
      <p className="hint2" style={{ margin: "2px 4px 0", textAlign: "left" }}>
        <Info aria-hidden="true" />
        <span>{canLock ? t("rotate_androidHint") : t("rotate_lockHint")}</span>
      </p>
    </Sheet>
  );
}
