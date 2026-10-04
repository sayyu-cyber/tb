"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Plus, Bell, ChevronLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { RANKS } from "@/constants/ranks";
import { topBarFor } from "./phoneTabs";
import { useTopBarOverride } from "./topBarStore";

/** The ring colour behind the avatar, by tier. */
const TIER_RING: Record<string, string> = {
  Bronze: RANKS.BRONZE.color,
  Silver: RANKS.SILVER.color,
  Gold: RANKS.GOLD.color,
  Platinum: RANKS.PLATINUM.color,
};

/**
 * The phone's 52px top bar - design/arena/LANDSCAPE.md "The shell", drawn on
 * every L* board as `.mtop`. It starts after the rail, sticks to the top
 * with a 14px blur, and comes in three kinds:
 *
 *   home  the wordmark (LHome)
 *   page  a small lime dashed label over the page name in chrome (LFriends,
 *         LShop and the rest)
 *   back  a back button and a title, for a drill-down (LRooms)
 *
 * The right side is the same on all three: the coins chip with its `+`, the
 * bell with its count, and your avatar ringed in your rank colour, each
 * 34px. The board hard-codes that ring gold for its Gold sample player;
 * here it takes the tier's own metal, so a Bronze player is ringed bronze.
 */
export function PhoneTopBar({ notifications = 0 }: { notifications?: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const override = useTopBarOverride();
  const { user, playerStats } = useAuth();
  const { state } = useEconomy();
  const t = useTranslation();

  const bar = override ?? topBarFor(pathname) ?? { kind: "home" as const };
  const name = user?.displayName || t("profile_player");
  const coins = state.economy.coins;
  const tier = playerStats?.currentRank || "Bronze";
  const ring = TIER_RING[tier] ?? RANKS.BRONZE.color;

  return (
    <header className="mtop">
      {bar.kind === "home" && <span className="word chrome" style={{ marginLeft: 0 }}>Thaasbai</span>}
      {bar.kind === "page" && (
        <div className="pg">
          <span className="lbl dash">{bar.labelKey ? t(bar.labelKey) : bar.label}</span>
          <h1 className="disp chrome">{t(bar.titleKey)}</h1>
        </div>
      )}
      {bar.kind === "back" && (
        <>
          <button type="button" className="ibtn mback" aria-label={t("a11y_goBack")} onClick={() => router.push(bar.backHref)}>
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="ttl">{bar.titleKey ? t(bar.titleKey) : bar.title}</span>
        </>
      )}

      <div className="tr">
        <span className="coins" aria-label={`${coins.toLocaleString()} ${t("common_coins")}`}>
          <i className="gem" aria-hidden="true" />
          {coins.toLocaleString()}
          <Link href="/shop?tab=coins" className="add" aria-label={t("shop_getCoins")}>
            <Plus aria-hidden="true" />
          </Link>
        </span>

        <span className="bell">
          <Link href="/messages" className="ibtn" aria-label={
            notifications > 0 ? `${t("nav_notifications")}, ${notifications}` : t("nav_notifications")
          }>
            <Bell aria-hidden="true" />
          </Link>
          {notifications > 0 && <span className="dotc" aria-hidden="true">{notifications > 9 ? "9+" : notifications}</span>}
        </span>

        <Link href="/profile" className="meb" aria-label={`${t("nav_profile")}: ${name}`}>
          <span className="ava" style={{ boxShadow: `0 0 0 1.5px ${ring}` }}>{name.charAt(0).toUpperCase()}</span>
        </Link>
      </div>
    </header>
  );
}
