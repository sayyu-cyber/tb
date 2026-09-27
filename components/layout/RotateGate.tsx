"use client";

import { Smartphone, LogOut, Info } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useCanLockOrientation } from "@/hooks/useOrientationLock";
import { lockLandscape } from "@/lib/orientationLock";
import { useMatchGateStatus } from "@/contexts/MatchGateContext";
import { TurningPhone } from "./phone/TurningPhone";
import { TurnRing, useSecondsLeft } from "./phone/TurnRing";

/**
 * A table held upright — design/arena/boards/MRotate.dc.html,
 * design/arena/MOBILE.md "A table held upright".
 *
 * Only the screens inside a match need landscape, so this is the last thing
 * standing between a phone and a hand of cards. It happens on an iPhone,
 * when auto-rotate is off, or when a player turns back mid-hand.
 *
 * The important thing about it is what it does NOT do: nothing pauses, no
 * seat is given up and nothing is forfeited. The hand keeps running behind
 * it - blurred, which is the board's own `filter: blur(5px) brightness(.62)`
 * moved onto the real table as a backdrop-filter - and the gate reports what
 * is happening there. Your turn shows the countdown ring and pulses (`hurry`)
 * from 5 seconds; otherwise it names whoever is playing and says you are
 * next. contexts/MatchGateContext carries that across from the table.
 *
 * It stays a pure CSS media query, as the old gate was: it is correct on the
 * first paint, has no orientation listener to disagree with the viewport, and
 * goes the instant the phone turns. See `.rotate-gate` in
 * styles/arena-phone-shell.css.
 *
 * During the cut, the deal and the hand result there is no turn to report,
 * and the gate simply shows the illustration and the two buttons - which is
 * the truth, not a gap.
 */
export function RotateGate() {
  const t = useTranslation();
  const status = useMatchGateStatus();
  const canLock = useCanLockOrientation();
  const turn = status?.turn ?? null;
  const left = useSecondsLeft(turn?.deadline);

  // The board's `hurry` pulse, from 5 seconds, and only on your own clock.
  const hurry = turn?.mine && left !== null && left <= 5;
  const detail = [turn?.detail, left !== null ? t("rotate_secondsLeft").replace("{n}", String(left)) : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="rotate-gate arena-mrotate">
      <section className="gate" role="dialog" aria-modal="true" aria-labelledby="rotate-gate-title">
        {status && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="chip live" style={{ height: "26px" }}><i data-ar-loop />{status.label}</span>
            {status.progress && (
              <span className="lbl" style={{ marginLeft: "auto", fontSize: "10px", letterSpacing: ".14em" }}>
                {status.progress}
              </span>
            )}
          </div>
        )}

        <div className="gatecard">
          <TurningPhone />
          <span className="lbl dash" style={{ color: "#C6FF33" }}>{t("rotate_sideways")}</span>
          <h1 id="rotate-gate-title" className="disp chrome" style={{ margin: 0, fontSize: "38px" }}>
            {t("rotate_title")}
          </h1>
          <p className="body" style={{ margin: 0, maxWidth: "290px", fontSize: "14px" }}>{t("rotate_bodyTable")}</p>

          {turn?.mine && (
            <div className={`live2 ${hurry ? "hurry" : ""}`.trim()} role="status">
              {turn.deadline && turn.seconds ? <TurnRing deadline={turn.deadline} seconds={turn.seconds} /> : null}
              <div style={{ flex: "1 1 0" }}>
                <b style={{ color: "#C6FF33" }}>{t("rotate_yourTurn")}</b>
                {detail && <span>{detail}</span>}
              </div>
              <i className="dot live" aria-hidden="true" data-ar-loop />
            </div>
          )}

          {turn && !turn.mine && turn.name && (
            <div className="live2 them" role="status">
              <span className="ava b" style={{ width: "30px", height: "30px", borderRadius: "8px", fontSize: "13px" }}>
                {turn.name.charAt(0).toUpperCase()}
              </span>
              <div style={{ flex: "1 1 0" }}>
                <b style={{ color: "#8AF0F5" }}>{t("rotate_playing").replace("{name}", turn.name)}</b>
                <span>{t("rotate_youreNext")}</span>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "14px" }}>
          {canLock && (
            <button type="button" className="ar-btn full" onClick={() => void lockLandscape()}>
              <Smartphone aria-hidden="true" style={{ transform: "rotate(-90deg)" }} />
              {t("rotate_goLandscape")}
            </button>
          )}
          {status?.onLeave && (
            <button type="button" className="ar-btn ghost full" onClick={status.onLeave}>
              <LogOut aria-hidden="true" />
              {t("rotate_leaveTable")}
            </button>
          )}
          <p className="hint2" style={{ margin: "2px 4px 0" }}>
            <Info aria-hidden="true" />
            <span>{canLock ? t("rotate_androidHint") : t("rotate_lockHint")}</span>
          </p>
        </div>
      </section>
    </div>
  );
}
