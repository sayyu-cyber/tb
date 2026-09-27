"use client";

import Link from "next/link";
import { Plus, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { CrownGlyph } from "@/components/arena";

/**
 * The phone's top bar — design/arena/boards/MHome.dc.html (`.mtop`),
 * 60px plus the notch inset, sticky, with a 14px backdrop blur.
 *
 * Left: the lime logo diamond and the wordmark in chrome. Right, in the
 * board's order: the coins chip with its `+`, the bell with its blue
 * count, and your avatar ringed in your rank colour, which opens Profile.
 *
 * The desktop TopBar's search field is deliberately not here. The board
 * has no room for it at 390px and does not draw one; every destination is
 * two taps away through the tab bar instead.
 */
export function PhoneTopBar({ notifications = 0 }: { notifications?: number }) {
  const { user, playerStats } = useAuth();
  const { state } = useEconomy();
  const t = useTranslation();

  const name = user?.displayName || t("profile_player");
  const coins = state.economy.coins;
  const tier = (playerStats?.currentRank || "Bronze").toLowerCase();

  return (
    <header className="mtop">
      <Link href="/home" className="logo" aria-label={t("nav_home")}>
        <CrownGlyph size={16} />
      </Link>
      <span className="word chrome">Thaasbai</span>

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
          <span className={`ava ${tier}`}>{name.charAt(0).toUpperCase()}</span>
        </Link>
      </div>
    </header>
  );
}
