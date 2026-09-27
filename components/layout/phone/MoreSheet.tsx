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
 * The More sheet — design/arena/boards/MMore.dc.html,
 * design/arena/screens/phone/phone-01b-more-menu.jpg.
 *
 * The board's order, which is deliberate: who you are, then the upsell,
 * then everywhere the five-slot bar cannot reach, then Settings. It is the
 * phone's answer to the desktop rail's ten icons - nothing is dropped, it
 * just lives one tap deeper.
 *
 * Markup and inline values are the board's, so the two can be read side by
 * side: `.av`, `.rank`, `.link`, `.mvip`, the 3x3 `.mtile` grid and `.acts2`.
 * Those classes are generated into styles/arena-mmore.css under
 * `.arena-mmore`, which is why the sheet carries that namespace - the portal
 * lands outside the shell.
 *
 * The Weekend League tile carries a live pip only while the league is
 * actually running, and Messages carries its unread count, so both say
 * something true rather than decorating the grid.
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
    <Sheet open={open} onClose={onClose} label={t("nav_moreTitle")} namespace="arena-mmore">
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
        <div className="av" aria-hidden="true" style={{ width: "46px", height: "46px", borderRadius: "12px", fontSize: "20px" }}>
          {name.charAt(0).toUpperCase()}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
          <b className="disp" style={{ fontSize: "18px", letterSpacing: ".02em" }}>{name}</b>
          {/* RankLabel because the board's class for Platinum is `.plat`,
              not `platinum` - lower-casing the tier would drop the colour. */}
          <RankLabel tier={tier}>{`${tier} · ${trophies.toLocaleString()}`}</RankLabel>
        </div>
        <Link className="link" href="/profile" onClick={onClose} style={{ marginLeft: "auto" }}>
          {t("nav_profile")}
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>

      <div className="mvip">
        <span className="cr" aria-hidden="true"><Crown /></span>
        <div style={{ position: "relative", flex: "1 1 0" }}>
          <span className="lbl" style={{ color: "#8AF0F5", fontSize: "10px" }}>{t("vip_upgradeTo")}</span>
          <div className="disp" style={{ marginTop: "5px", fontSize: "19px" }}>{t("nav_vipPass")}</div>
          <p style={{ margin: "5px 0 0", fontSize: "12px", lineHeight: 1.35, fontWeight: 500, color: "#C4C4CE" }}>
            {t("vip_blurb")}
          </p>
        </div>
        <Link
          href="/shop?tab=vip"
          className="ar-btn blue sm"
          onClick={onClose}
          style={{
            position: "relative", height: "38px", padding: "0 12px", fontSize: "11.5px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.35), 0 4px 0 #00727A",
          }}
          data-flat
        >
          {t("vip_viewPlans")}
        </Link>
      </div>

      <div
        className="more-grid"
        style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "8px", marginTop: "12px" }}
      >
        {MORE_TILES.map((tile) => {
          const Icon = tile.icon;
          const badge = tile.badge === "unreadMessages" ? unread : 0;
          const live = tile.live && isWeekendLeague;
          return (
            <Link
              key={tile.href}
              href={tile.href}
              className={`mtile ${live ? "hot" : ""}`.trim()}
              onClick={onClose}
            >
              <Icon aria-hidden="true" />
              {t(tile.labelKey)}
              {live && <i className="lv" aria-label={t("common_live")} />}
              {badge > 0 && <span className="bdg">{badge > 9 ? "9+" : badge}</span>}
            </Link>
          );
        })}
      </div>

      <div className="acts2" style={{ marginTop: "12px" }}>
        <Link href="/settings" onClick={onClose}>
          <Settings aria-hidden="true" />
          {t("settings_title")}
          <ChevronRight aria-hidden="true" style={{ marginLeft: "auto", width: "17px", height: "17px" }} />
        </Link>
      </div>
    </Sheet>
  );
}
