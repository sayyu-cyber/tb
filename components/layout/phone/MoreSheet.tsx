"use client";

import Link from "next/link";
import { ChevronRight, Crown, Settings } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRankLock } from "@/hooks/useRankLock";
import { useTranslation } from "@/hooks/useTranslation";
import { getRankFromTrophies } from "@/constants/ranks";
import { RankLabel } from "@/components/arena";
import { Sheet } from "./Sheet";
import { MORE_TILES } from "./phoneTabs";

/**
 * The More panel - design/arena/boards/LMore.dc.html,
 * design/arena/screens/landscape/landscape-01b-more-panel.jpg.
 *
 * A 540px side panel off the rail (`.sheet.w2.tick`). Left, 196px: your
 * avatar, name and rank, View profile, the VIP card and Settings. Right:
 * Explore, a 3x3 grid of tiles - every destination the rail cannot hold.
 * Weekend League carries its live dot while the league is running, and
 * Messages its unread count.
 *
 * LMore and LHome are one stylesheet (the boards' CSS is identical), so the
 * panel travels with the `arena-lhome` namespace for `.mvip` and its tiles.
 */
export function MoreSheet({
  open,
  onClose,
  unread = 0,
}: {
  open: boolean;
  onClose: () => void;
  unread?: number;
}) {
  const { user, playerStats } = useAuth();
  const { isWeekendLeague } = useRankLock();
  const t = useTranslation();

  const name = user?.displayName || t("profile_player");
  const trophies = playerStats?.trophies ?? 0;
  const tier = playerStats?.currentRank || getRankFromTrophies(trophies);

  return (
    <Sheet open={open} onClose={onClose} label={t("nav_moreTitle")} namespace="arena-lhome" className="w2"
      style={{ display: "flex", gap: "16px", padding: "16px" }}>
      <div style={{ flex: "none", width: "196px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
          <div className="av" aria-hidden="true" style={{ width: "44px", height: "44px", borderRadius: "12px", fontSize: "19px" }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            <b className="disp" style={{ fontSize: "17px", letterSpacing: ".02em" }}>{name}</b>
            {/* RankLabel because the board's class for Platinum is `.plat`,
                not `platinum` - lower-casing the tier would drop the colour. */}
            <RankLabel tier={tier}>{`${tier} · ${trophies.toLocaleString()}`}</RankLabel>
          </div>
        </div>
        <Link className="link" href="/profile" onClick={onClose} style={{ alignSelf: "flex-start" }}>
          {t("more_viewProfile")}
          <ChevronRight aria-hidden="true" />
        </Link>
        <div className="mvip">
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "10px" }}>
            <span className="cr" aria-hidden="true"><Crown /></span>
            <div>
              <span className="lbl" style={{ color: "#8AF0F5", fontSize: "9px" }}>{t("vip_upgradeTo")}</span>
              <div className="disp" style={{ marginTop: "4px", fontSize: "17px" }}>{t("nav_vipPass")}</div>
            </div>
          </div>
          <p style={{ position: "relative", margin: 0, fontSize: "11.5px", lineHeight: 1.35, fontWeight: 500, color: "#C4C4CE" }}>
            {t("more_vipBlurb")}
          </p>
          <Link href="/shop?tab=vip" className="ar-btn blue xs" onClick={onClose}
            style={{ position: "relative", boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 3px 0 #00727A" }}>
            {t("vip_viewPlans")}
          </Link>
        </div>
        <div className="acts2" style={{ marginTop: "auto" }}>
          <Link href="/settings" onClick={onClose} style={{ height: "44px" }}>
            <Settings aria-hidden="true" />
            {t("settings_title")}
            <ChevronRight aria-hidden="true" style={{ marginLeft: "auto", width: "16px", height: "16px" }} />
          </Link>
        </div>
      </div>

      <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
        <span className="lbl dash">{t("more_explore")}</span>
        <div className="more-grid" style={{
          flex: "1 1 0", minHeight: 0, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gridTemplateRows: "repeat(3, minmax(0, 1fr))", gap: "8px",
        }}>
          {MORE_TILES.map((tile) => {
            const Icon = tile.icon;
            const badge = tile.badge === "unreadMessages" ? unread : 0;
            const live = tile.live && isWeekendLeague;
            return (
              <Link key={tile.href} href={tile.href} className={live ? "ltile hot" : "ltile"} onClick={onClose}>
                <Icon aria-hidden="true" />
                {t(tile.labelKey)}
                {live && <i className="lv" aria-label={t("common_live")} />}
                {badge > 0 && <span className="bdg">{badge > 9 ? "9+" : badge}</span>}
              </Link>
            );
          })}
        </div>
      </div>
    </Sheet>
  );
}
