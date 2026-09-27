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
    <Sheet open={open} onClose={onClose} label={t("nav_moreTitle")} className="more-sheet">
      <div className="more-who">
        <div className="av" aria-hidden="true">{name.charAt(0).toUpperCase()}</div>
        <div className="more-name">
          <b className="disp">{name}</b>
          <RankLabel tier={tier}>{`${tier} · ${trophies.toLocaleString()}`}</RankLabel>
        </div>
        <Link className="link" href="/profile" onClick={onClose}>
          {t("nav_profile")}
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>

      <div className="mvip">
        <span className="cr" aria-hidden="true"><Crown /></span>
        <div className="mvip-tx">
          <span className="lbl">{t("vip_upgradeTo")}</span>
          <div className="disp">{t("nav_vipPass")}</div>
          <p>{t("vip_blurb")}</p>
        </div>
        <Link href="/shop?tab=vip" className="ar-btn blue sm" onClick={onClose} data-flat>
          {t("vip_viewPlans")}
        </Link>
      </div>

      <div className="more-grid">
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

      <div className="acts2">
        <Link href="/settings" onClick={onClose}>
          <Settings aria-hidden="true" />
          {t("settings_title")}
          <ChevronRight aria-hidden="true" className="chev" />
        </Link>
      </div>
    </Sheet>
  );
}
