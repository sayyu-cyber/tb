"use client";

import Link from "next/link";
import { Crown } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { SidebarTooltip } from "./SidebarTooltip";
import { VIP_HREF } from "./sidebarItems";

/**
 * VIP promo - the full card in the expanded panel, a single crown button on
 * the rail. Both go to the same real destination (VIP_HREF = /shop, the
 * app's actual VIP purchase surface).
 *
 * The copy reacts to the player's live VIP state from EconomyContext: a
 * subscriber gets "VIP Active" and a shop link rather than being pitched a
 * product they already own, which is what the previous Home sidebar did and
 * is worth keeping.
 */
export function VipSidebarCard({ expanded, onNavigate }: { expanded: boolean; onNavigate: () => void }) {
  const { state } = useEconomy();
  const t = useTranslation();
  const vipActive = state.profile.vip.active;
  const label = t("home_shortcutVip");

  if (!expanded) {
    return (
      <SidebarTooltip label={label}>
        <Link
          href={VIP_HREF}
          onClick={onNavigate}
          aria-label={label}
          className="app-sidebar-vip-mini"
          data-active-vip={vipActive ? "true" : undefined}
        >
          <Crown size={17} aria-hidden="true" />
        </Link>
      </SidebarTooltip>
    );
  }

  return (
    <section className="app-sidebar-vip">
      <div className="app-sidebar-vip-head">
        <span className="app-sidebar-vip-crown" aria-hidden="true">
          <Crown size={18} />
        </span>
        <span className="app-sidebar-vip-title">
          {!vipActive && <small>{t("vip_upgradeTo")}</small>}
          <strong>{vipActive ? t("vip_activeTitle") : label}</strong>
        </span>
      </div>
      <p>{vipActive ? t("vip_activeBody") : t("vip_promoBody")}</p>
      <Link href={VIP_HREF} onClick={onNavigate} className="app-sidebar-vip-cta">
        {vipActive ? t("vip_visitShop") : t("vip_viewPlans")}
      </Link>
    </section>
  );
}
