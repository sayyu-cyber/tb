"use client";

import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

/** The same account boundary for direct online/ranked links and the lobby. */
export function GuestOnlineNotice({ title, gameId }: { title: string; gameId: string }) {
  const t = useTranslation();
  return (
    <div className="ar-page">
      <section className="panel tick" style={{ padding: 24, textAlign: "center" }}>
        <h1 className="disp">{title}</h1>
        <p className="muted">Sign in to play with other players. You can play against bots as a guest.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", marginTop: 16 }}>
          <Link className="ar-btn sm" href="/login">{t("login_signIn")}</Link>
          <Link className="ar-btn ghost sm" href={`/play/${gameId}/casual/ai`}>Play vs AI</Link>
        </div>
      </section>
    </div>
  );
}
