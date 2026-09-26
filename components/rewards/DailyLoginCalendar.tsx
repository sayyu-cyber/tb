"use client";

import { useState } from "react";
import { Check, Gift } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { DAILY_LOGIN_REWARDS } from "@/data/cosmetics";
import { Pill, Meter, CoinGem } from "@/components/arena";
import { bonusLabel } from "./bonusLabel";

/**
 * Daily Login Rewards — design/arena/screens/app/app-13-rewards-missions.jpg,
 * with the claim popup from app-13b.
 *
 * Seven tiles: claimed days dim with a lime tick, today is the lit tile you
 * can press, and Day 7 carries the blue ring and the gift. The gem cluster
 * grows with the day, as the board draws it.
 *
 * The bonus line under each tile names the real bonus (see bonusLabel -
 * code issue 7), so Day 3 says GG Sticker and Day 5 says Maldives Wave
 * banner instead of both claiming a Room Card.
 */

/** The board's gem clusters, day 1 to day 6. */
const CLUSTERS: { left: number; top: number }[][] = [
  [{ left: 20, top: 14 }],
  [{ left: 8, top: 16 }, { left: 32, top: 12 }],
  [{ left: 2, top: 18 }, { left: 20, top: 6 }, { left: 38, top: 18 }],
  [{ left: 2, top: 18 }, { left: 20, top: 6 }, { left: 38, top: 18 }],
  [{ left: 2, top: 18 }, { left: 20, top: 6 }, { left: 38, top: 18 }],
  [{ left: 2, top: 20 }, { left: 20, top: 6 }, { left: 38, top: 20 }, { left: 20, top: 28 }],
];

function GemStack({ day, className = "", style }: { day: number; className?: string; style?: React.CSSProperties }) {
  const cluster = CLUSTERS[Math.min(day, CLUSTERS.length) - 1];
  return (
    <div className={`stackg ${className}`.trim()} style={style} aria-hidden="true">
      {cluster.map((gem, index) => <i key={index} style={{ left: gem.left, top: gem.top }} />)}
    </div>
  );
}

export default function DailyLoginCalendar() {
  const { state, claimDailyReward } = useEconomy();
  const { dailyLogin } = state;
  const t = useTranslation();
  const [claimedDay, setClaimedDay] = useState<number | null>(null);

  const nextAvailableDay = dailyLogin.rewards.findIndex((reward) => !reward.claimed) + 1;
  const claimedCount = dailyLogin.rewards.filter((reward) => reward.claimed).length;

  function handleClaim(day: number) {
    if (day !== nextAvailableDay) return;
    claimDailyReward(day);
    setClaimedDay(day);
  }

  const claimed = claimedDay ? DAILY_LOGIN_REWARDS[claimedDay - 1] : null;
  const tomorrow = claimedDay && claimedDay < 7 ? DAILY_LOGIN_REWARDS[claimedDay] : null;
  const tomorrowBonus = bonusLabel(tomorrow?.bonusItem);

  return (
    <>
      <section
        className="panel tick"
        aria-label="Daily Login Rewards"
        style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div className="ph">
          <h2>Daily Login Rewards</h2>
          <span className="muted2 tnum">{claimedCount} / 7 claimed this cycle</span>
        </div>

        <div className="day-grid">
          {DAILY_LOGIN_REWARDS.map((reward) => {
            const day = reward.day;
            const isClaimed = dailyLogin.rewards[day - 1]?.claimed ?? false;
            const isToday = day === nextAvailableDay;
            const bonus = bonusLabel(reward.bonusItem);
            const art = day === 7
              ? <span className="gift" aria-hidden="true"><Gift /></span>
              : <GemStack day={day} />;

            const body = (
              <>
                <span className="dn" style={isToday ? { color: "#C6FF33" } : undefined}>
                  {isToday ? `Day ${day} · Today` : `Day ${day}`}
                </span>
                <div className="rew">{art}</div>
                <span className="amt"><CoinGem small />{reward.coins}</span>
                {isToday
                  ? <Pill tone="lime" className="day-claim">Claim</Pill>
                  : <span className="bonus">{bonus ? `+ ${bonus}` : ""}</span>}
              </>
            );

            if (isToday) {
              return (
                <button
                  type="button"
                  className="day today"
                  key={day}
                  onClick={() => handleClaim(day)}
                  aria-label={`Claim Day ${day}: ${reward.coins} coins${bonus ? ` and ${bonus}` : ""}`}
                  data-flat
                >
                  {body}
                </button>
              );
            }
            return (
              <div className={`day ${isClaimed ? "claimed" : ""} ${day === 7 ? "big" : ""}`.replace(/\s+/g, " ").trim()} key={day}>
                {isClaimed && <span className="chk" aria-hidden="true"><Check /></span>}
                {body}
              </div>
            );
          })}
        </div>

        <Meter
          value={claimedCount / 7}
          segmented
          label="Daily reward cycle"
          valueText={`${claimedCount} of 7 claimed`}
        />
      </section>

      {claimed && (
        <div className="claim-scrim" role="dialog" aria-modal="true" aria-label={`Day ${claimedDay} claimed`}>
          <div className="claim-pop">
            <GemStack day={claimedDay!} className="claim-gems" />
            <h2 className="disp chrome claim-title">
              {t("rewards_dayClaimed").replace("{n}", String(claimedDay))}
            </h2>
            <b className="claim-coins"><CoinGem />+{claimed.coins} Coins</b>
            {tomorrow && (
              <p className="muted" style={{ margin: "12px 0 22px" }}>
                Come back tomorrow for Day {tomorrow.day}: {tomorrow.coins} coins
                {tomorrowBonus ? ` and a ${tomorrowBonus}` : ""}.
              </p>
            )}
            {!tomorrow && (
              <p className="muted" style={{ margin: "12px 0 22px" }}>
                That&apos;s the full week. The cycle starts again tomorrow.
              </p>
            )}
            <button type="button" className="ar-btn" style={{ width: "100%" }} onClick={() => setClaimedDay(null)} autoFocus>
              Continue
            </button>
          </div>
        </div>
      )}
    </>
  );
}
