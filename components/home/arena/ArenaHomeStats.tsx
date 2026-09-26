"use client";

import Link from "next/link";
import { Trophy, Calendar, Swords, Users, Crown, ChevronRight, Lock, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { useSeasonInfo } from "@/hooks/useSeasonInfo";
import { useRankLock } from "@/hooks/useRankLock";
import { getRankFromTrophies, RANKS } from "@/constants/ranks";
import { Avatar, RankLabel, Meter, StatTile } from "@/components/arena";

/**
 * The Ranks Locked bar and the stats strip
 * (design/arena/screens/app/app-01-home.jpg, under the hero).
 *
 * The board shows the lock bar because it was drawn during the league. In
 * the app it is a `role="status"` that appears only while ranked play is
 * actually locked, which is what useRankLock reports.
 */

export function ArenaLockBar() {
  const { isLocked, nextUnlockTime } = useRankLock();
  if (!isLocked) return null;
  return (
    <div className="lockbar" role="status">
      <Lock aria-hidden="true" />
      <b className="disp" style={{ fontSize: "14px", letterSpacing: ".06em" }}>Ranks Locked</b>
      <span className="muted">Weekend League is active. Ranked matches resume Sunday.</span>
      <span className="lbl lockbar-time" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
        <Clock aria-hidden="true" style={{ width: "15px", height: "15px", color: "#00BCC8" }} />
        {nextUnlockTime ? `Unlocks ${nextUnlockTime}` : "Unlocks Sunday"}
      </span>
    </div>
  );
}

/** Days left in the season, as the board's "4 days / Season 9" tile. */
function daysLeft(endDate: Date | undefined) {
  if (!endDate) return null;
  const ms = endDate.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / 86_400_000);
}

export function ArenaStatsStrip() {
  const { user, playerStats } = useAuth();
  const { friends } = useHomeSocial();
  const season = useSeasonInfo();

  const trophies = playerStats?.trophies ?? 0;
  const tier = getRankFromTrophies(trophies);
  const name = user?.displayName || "Player";

  // The board's meter runs from the current tier's floor to the next
  // tier's, not from zero - so a player who has just been promoted starts
  // the bar empty rather than most of the way along it.
  const tiers = [RANKS.BRONZE, RANKS.SILVER, RANKS.GOLD, RANKS.PLATINUM];
  const index = tiers.findIndex((rank) => rank.name === tier);
  const floor = tiers[index]?.min ?? 0;
  const next = tiers[index + 1];
  const span = next ? next.min - floor : 0;
  const progress = next && span > 0 ? (trophies - floor) / span : 1;
  const remaining = next ? Math.max(0, next.min - trophies) : 0;
  const left = daysLeft(season?.endDate ?? undefined);

  return (
    <section className="panel tick hudstrip" aria-label="Your stats">
      <div style={{ display: "flex", alignItems: "center", gap: "14px", paddingRight: "22px" }}>
        <Avatar name={name} src={user?.photoURL} seed={user?.uid} size={60} radius={14} />
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <b className="disp" style={{ fontSize: "22px", letterSpacing: ".02em" }}>{name}</b>
          <RankLabel tier={tier} />
        </div>
      </div>

      <StatTile icon={<Trophy />} value={trophies} label={tier} />
      <StatTile icon={<Calendar />} value={playerStats?.totalMatches ?? 0} label="Matches" />
      <StatTile icon={<Swords />} value={playerStats?.wins ?? 0} label="Wins" />
      <StatTile icon={<Users />} value={friends.length} label="Friends" />
      <StatTile
        icon={<Crown />}
        value={left === null ? "—" : `${left} ${left === 1 ? "day" : "days"}`}
        label={season?.name ?? "Season"}
       
      />

      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "16px", paddingLeft: "16px" }}>
        <div style={{ width: "128px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="lbl" style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "#E6C24A" }}>{tier}</span>
            <span>{next?.name ?? "Max"}</span>
          </div>
          <Meter
            value={progress}
            segmented
            label={next ? `Progress to ${next.name}` : "Highest rank reached"}
            valueText={next ? `${remaining} trophies to ${next.name}` : "Top tier"}
          />
        </div>
        <Link className="link" href="/profile">
          View Profile
          <ChevronRight aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
