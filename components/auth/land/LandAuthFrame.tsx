"use client";

import type { ReactNode } from "react";
import { CrownGlyph } from "@/components/arena/RankBadge";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * The signed-out screens on a phone - sign in, create an account, reset or
 * set a password, resend the confirmation. No board draws them; they are
 * built from the landscape system (design/arena/LANDSCAPE.md): no rail when
 * signed out, the brand on the left and the form on the right.
 *
 * The brand side is the rail's logo, the tagline and the chrome wordmark on
 * the stage's lime-and-blue light. The form side scrolls on its own, so a
 * long form keeps its first fields and its primary button in view and the
 * rest a swipe away; the brand stays put.
 */
export function LandAuthFrame({ children }: { children: ReactNode }) {
  const t = useTranslation();
  return (
    <div className="arena-app arena-land is-m is-land land-auth">
      <aside className="land-auth-brand" aria-label="Thaasbai">
        <span className="logo" aria-hidden="true"><CrownGlyph size={20} /></span>
        <span className="lbl dash" style={{ color: "#C6FF33" }}>{t("settings_footerTagline")}</span>
        <b className="disp chrome land-auth-word">Thaasbai</b>
        <p className="body" style={{ margin: 0, fontSize: 14, maxWidth: 280 }}>Good Cards. Greater Friends.</p>
      </aside>
      <div className="land-auth-form">
        <div className="land-auth-inner">{children}</div>
      </div>
    </div>
  );
}
