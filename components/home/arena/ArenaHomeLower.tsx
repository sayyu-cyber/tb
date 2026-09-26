"use client";

import Link from "next/link";
import {
  Crown, Timer, ArrowRight, Users, KeyRound, Package, Shield, Award, Target,
  ShoppingBag, Settings, Newspaper,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useRankLock } from "@/hooks/useRankLock";
import { useNews } from "@/hooks/useNews";
import { getRankFromTrophies, RANKS } from "@/constants/ranks";
import { RANK_CONFIGS } from "@/data/cosmetics";
import { Pill, Meter, RankHex, CoinGem } from "@/components/arena";

/**
 * The lower row and the tail of Home
 * (design/arena/screens/app/app-01-home.jpg, bottom half).
 */

/** Current Rank, with the weekly tier reward the board added. */
export function ArenaRankCard() {
  const { playerStats } = useAuth();
  const trophies = playerStats?.trophies ?? 0;
  const tier = getRankFromTrophies(trophies);

  const tiers = [RANKS.BRONZE, RANKS.SILVER, RANKS.GOLD, RANKS.PLATINUM];
  const index = tiers.findIndex((rank) => rank.name === tier);
  const floor = tiers[index]?.min ?? 0;
  const next = tiers[index + 1];
  const span = next ? next.min - floor : 0;
  const progress = next && span > 0 ? (trophies - floor) / span : 1;
  const remaining = next ? Math.max(0, next.min - trophies) : 0;

  // The payout for this tier, from the one rank table (see RANK_CONFIGS -
  // its thresholds now come from constants/ranks.ts, so the tier shown here
  // and the tier that gets paid are the same tier).
  const config = RANK_CONFIGS.find((rank) => rank.tier === tier);
  const colour = config?.color ?? "#E6C24A";

  return (
    <div className="panel tick" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "14px" }}>
      <span className="lbl dash">Current Rank</span>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <RankHex tier={tier} width={60} height={68}>
          <Crown style={{ width: "28px", height: "28px" }} />
        </RankHex>
        <div>
          <b className="disp" style={{ fontSize: "32px", color: colour }}>{tier}</b>
          <div className="muted" style={{ marginTop: "6px" }}>
            <b className="num" style={{ fontSize: "18px", color: "#fff" }}>{trophies}</b> trophies
          </div>
        </div>
      </div>
      <Meter
        value={progress}
        segmented
        label={next ? `Progress to ${next.name}` : "Highest rank reached"}
        valueText={next ? `${remaining} trophies to ${next.name}` : "Top tier"}
      />
      <span className="muted">
        {next
          ? <><b style={{ color: "#C6FF33" }}>{remaining} {remaining === 1 ? "trophy" : "trophies"}</b> to {next.name}</>
          : <>You are at the top tier.</>}
      </span>
      <div className="divider" style={{ marginTop: "auto" }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="lbl">Weekly reward</span>
        <span style={{ display: "flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: "17px" }}>
          <CoinGem small />
          {config?.weeklyReward ?? 50}
        </span>
      </div>
      <span className="muted2" style={{ marginTop: "-6px" }}>Paid by rank tier, every Thursday night.</span>
    </div>
  );
}

/** The Weekend League card, with its rules as pills. */
export function ArenaLeagueCard() {
  const { isWeekendLeague } = useRankLock();
  return (
    <div className="panel tick b" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px", overflow: "hidden" }}>
      <div
        aria-hidden="true"
        style={{
          position: "absolute", right: "-50px", top: "-50px", width: "180px", height: "180px", borderRadius: "50%",
          background: "radial-gradient(closest-side, rgba(0,188,200,.4), rgba(0,188,200,0))",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
        <span className="lbl dash" style={{ color: "#8AF0F5" }}>
          <Timer aria-hidden="true" style={{ width: "15px", height: "15px" }} />
          Weekend League
        </span>
        {isWeekendLeague ? <Pill tone="lime" live>Live</Pill> : <Pill tone="line">Fri – Sat</Pill>}
      </div>
      <b className="disp" style={{ position: "relative", fontSize: "30px", lineHeight: ".95" }}>
        Double<br />trophies
      </b>
      <span className="muted" style={{ position: "relative" }}>Double trophies during Weekend League</span>
      <div style={{ position: "relative", display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <Pill tone="line">Silver and up</Pill>
        <Pill tone="line">Win +10</Pill>
        <Pill tone="line">Loss −4</Pill>
      </div>
      <Link className="ar-btn blue sm" href="/tournament" style={{ position: "relative", alignSelf: "flex-start", marginTop: "auto" }}>
        Enter League
        <ArrowRight aria-hidden="true" />
      </Link>
    </div>
  );
}

/** The board's nine shortcuts, in its order. */
const SHORTCUTS = [
  { href: "/friends", label: "Friends", Icon: Users },
  { href: "/play/mindi/room", label: "Private Rooms", Icon: KeyRound },
  { href: "/inventory", label: "Inventory", Icon: Package },
  { href: "/clubs", label: "Clubs", Icon: Shield },
  { href: "/shop?tab=vip", label: "VIP Pass", Icon: Crown },
  { href: "/hall-of-fame", label: "Hall of Fame", Icon: Award },
  { href: "/missions", label: "Missions", Icon: Target },
  { href: "/shop", label: "Cosmetic Shop", Icon: ShoppingBag },
  { href: "/settings", label: "Settings", Icon: Settings },
];

export function ArenaShortcuts() {
  return (
    <nav
      className="panel"
      aria-label="Quick access"
      style={{ padding: "18px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}
    >
      {SHORTCUTS.map(({ href, label, Icon }) => (
        <Link className="sc" href={href} key={label}>
          <Icon aria-hidden="true" />
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** The tone of a news item's pill, by its own type. */
const NEWS_TONE: Record<string, "lime" | "blue" | "line"> = {
  announcement: "lime",
  event: "blue",
  update: "line",
};

export function ArenaUpdates() {
  const { news, loading } = useNews();
  if (loading || news.length === 0) return null;
  return (
    <section aria-label="Latest Updates" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <div className="ph">
        <h2 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Newspaper aria-hidden="true" style={{ width: "20px", height: "20px", color: "#00BCC8" }} />
          Latest Updates
        </h2>
      </div>
      <div className="updates">
        {news.slice(0, 3).map((item) => (
          <article className="news" key={item.id}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
              <Pill tone={NEWS_TONE[String(item.type).toLowerCase()] ?? "line"}>{item.type}</Pill>
              <span className="lbl">
                {new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.content}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ArenaHomeFooter() {
  return (
    <footer
      className="home-footer"
      style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: "18px", borderTop: "1px solid rgba(255,255,255,.08)",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
        <b className="disp chrome" style={{ fontSize: "18px" }}>Thaasbai</b>
        <span className="muted2">© {new Date().getFullYear()} Play Fair. Good Games. Greater Friends.</span>
      </span>
      <span style={{ display: "flex", gap: "22px" }}>
        <Link className="link b" href="/settings">Settings</Link>
        <Link className="link b" href="/friends">Community</Link>
      </span>
    </footer>
  );
}
