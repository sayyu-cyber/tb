"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Info, MapPin, Smartphone } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { useCanLockOrientation } from "@/hooks/useOrientationLock";
import { lockLandscape } from "@/lib/orientationLock";
import { pageNameKey } from "./phone/phoneTabs";

/**
 * The turn gate - design/arena/boards/LGate.dc.html and LGateAndroid.dc.html,
 * design/arena/screens/landscape/landscape-17-turn-gate-iphone.jpg and
 * landscape-17b-turn-gate-android.jpg.
 *
 * The whole app is landscape (LANDSCAPE.md "Orientation"), so a phone held
 * upright sees this over whatever page it is on. It is always in the DOM and
 * pure CSS decides when it shows (styles/arena-phone-shell.css), so it is
 * right on the first paint and gone the instant the phone turns. It is an
 * overlay, not a route: the page underneath keeps its state and nothing
 * navigates. A match held upright gets MRotate (RotateGate) instead, which
 * keeps the live turn on screen.
 *
 * Go landscape shows only where the browser can lock the orientation
 * (Android). One tap asks for fullscreen and then the lock; if either is
 * refused nothing breaks and the gate stays. iPhone cannot be turned by a
 * page, so there the gate explains, and its tips say how.
 *
 * On a screen without touch - a desktop window dragged tall and narrow - the
 * same gate asks for a wider window instead, and the phone tips go.
 */

/** The tiny landscape Home inside the turning phone. Static, so it is
 *  written as the board writes it: the tags (`u`, `s`, `em`, `o`, `q`) are
 *  what its CSS draws by. */
const MINI_HOME =
  '<i class="r"><i style="top: 16px" class="on"></i><i style="top: 26px"></i><i style="top: 36px"></i><i style="top: 46px"></i><i style="top: 56px"></i></i>' +
  '<i class="t"><b></b></i><i class="h"><u></u><s></s><em></em><o></o><q></q><q></q></i><i class="c a"></i><i class="c b"></i><i class="c d"></i>';

const COARSE = "(pointer: coarse)";
function useCoarsePointer(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(COARSE);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(COARSE).matches,
    () => true
  );
}

export function TurnGate() {
  const t = useTranslation();
  const pathname = usePathname();
  const touch = useCoarsePointer();
  const android = useCanLockOrientation();
  const key = pageNameKey(pathname);
  const page = key ? t(key) : "Thaasbai";
  const [before, after] = t("gate_youWereOn").split("{page}");

  return (
    <div className="turn-gate arena-app arena-land is-m arena-lgate">
      <div className="gbg" />
      <section className="gwrap" role="dialog" aria-modal="true" aria-labelledby="turn-gate-title">
        <div className="gtop">
          <span className="logo" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7ZM5 21h14" />
            </svg>
          </span>
          <span className="word chrome">Thaasbai</span>
        </div>
        <div className="gturn" aria-hidden="true">
          <svg className="arc" viewBox="0 0 132 132" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M110.4 28.7A58 58 0 0 0 21.6 28.7" />
            <path d="M31.3 26.1L21.6 28.7L22.5 18.7" />
          </svg>
          <span className="gp" data-ar-loop>
            <span className="gs"><span className="gmini" dangerouslySetInnerHTML={{ __html: MINI_HOME }} /></span>
          </span>
        </div>
        <span className="lbl dash" style={{ marginTop: "8px", color: "#C6FF33" }}>{t("gate_label")}</span>
        <h1 id="turn-gate-title" className="disp chrome" style={{ margin: "14px 0 0", fontSize: "42px", lineHeight: 0.92 }}>
          {t(touch ? "gate_title" : "gate_widerTitle")}
        </h1>
        <p className="body" style={{ margin: "14px 0 0", maxWidth: "300px", fontSize: "14.5px" }}>
          {t(touch ? "gate_body" : "gate_widerBody")}
        </p>
        <span className="gctx" style={{ marginTop: "14px" }}>
          <MapPin aria-hidden="true" />
          {before}<b>{page}</b>{after}
        </span>
        {touch && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%", marginTop: "auto" }}>
            {android && (
              <button type="button" className="ar-btn full" onClick={() => void lockLandscape()}>
                <Smartphone aria-hidden="true" style={{ transform: "rotate(-90deg)" }} />
                {t("rotate_goLandscape")}
              </button>
            )}
            <div className="gtip">
              <Info aria-hidden="true" />
              <div>
                <b>{t(android ? "gate_tipAndroidTitle" : "gate_tipIphoneTitle")}</b>
                <span>{t(android ? "gate_tipAndroid" : "gate_tipIphone")}</span>
              </div>
            </div>
            <div className="gtip">
              <Smartphone aria-hidden="true" />
              <div>
                <b>{t("gate_fullTitle")}</b>
                <span>{t(android ? "gate_fullAndroid" : "gate_fullIphone")}</span>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
