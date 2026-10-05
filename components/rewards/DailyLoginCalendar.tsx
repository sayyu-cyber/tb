"use client";

import { useEffect, useState, useRef } from "react";
import { Check, Flame, Gift } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { DAILY_LOGIN_REWARDS } from "@/data/cosmetics";
import { Pill, Meter, CoinGem } from "@/components/arena";
import { Sheet } from "@/components/layout/phone/Sheet";
import { bonusLabel } from "./bonusLabel";

/**
 * Daily Login Rewards — design/arena/screens/app/app-13-rewards-missions.jpg,
 * with the claim popup from app-13b; on a phone,
 * design/arena/boards/LRewards.dc.html and LRewardsClaimed
 * (landscape-13 and 13b).
 *
 * Seven tiles: claimed days dim with a lime tick, today is the lit tile you
 * can press, and Day 7 carries the blue ring and the gift. The gem cluster
 * grows with the day, as the board draws it.
 *
 * The bonus line under each tile names the real bonus (see bonusLabel -
 * code issue 7), so Day 3 says GG Sticker and Day 5 says Maldives Wave
 * banner instead of both claiming a Room Card.
 *
 * On a phone (`land`) the same seven tiles go into LRewards' `.days` row -
 * today wider and lit, Day 7 wider still with the gift - with the streak
 * beside the heading, and the claim celebration is the landscape dialog
 * (`.ldlg > .lcel`) with the gems beside the copy.
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

export default function DailyLoginCalendar({ land = false, streak = "" }: {
  /** LRewards' panel and dialog, for the landscape phone. */
  land?: boolean;
  /** "Streak: 6 days", already formatted; LRewards puts it beside the heading. */
  streak?: string;
}) {
  const { state, claimDailyReward, refreshBalance, balanceReady } = useEconomy();
  const { dailyLogin } = state;
  const t = useTranslation();
  const [claimedDay, setClaimedDay] = useState<number | null>(null);
  const [claiming, setClaiming] = useState(false);
  const pending = useRef(false);
  const [remaining, setRemaining] = useState(0);
  const status = dailyLogin.server;
  useEffect(() => {
    if (!status) return;
    const duration = Math.max(0, new Date(status.nextClaimAt || status.serverNow).getTime() - new Date(status.serverNow).getTime());
    const started = performance.now();
    const tick = () => setRemaining(Math.max(0, Math.ceil((duration - (performance.now() - started)) / 1000)));
    tick(); const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [status]);
  useEffect(() => {
    if (status && !status.available && remaining === 0) void refreshBalance().catch(() => {});
  }, [status, remaining, refreshBalance]);
  const available = balanceReady !== false && (status?.available ?? true);
  const countdown = [Math.floor(remaining / 3600), Math.floor(remaining / 60) % 60, remaining % 60].map(n => String(n).padStart(2, "0")).join(":");

  const nextAvailableDay = dailyLogin.rewards.findIndex((reward) => !reward.claimed) + 1;
  const claimedCount = dailyLogin.rewards.filter((reward) => reward.claimed).length;

  async function handleClaim(day: number) {
    if (day !== nextAvailableDay || !available || pending.current) return;
    pending.current = true; setClaiming(true);
    try { if (await claimDailyReward(day)) setClaimedDay(day); }
    finally { pending.current = false; setClaiming(false); }
  }

  const claimed = claimedDay ? DAILY_LOGIN_REWARDS[claimedDay - 1] : null;
  const tomorrow = claimedDay && claimedDay < 7 ? DAILY_LOGIN_REWARDS[claimedDay] : null;
  const tomorrowBonus = bonusLabel(tomorrow?.bonusItem);

  const nextLine = tomorrow
    ? `Come back tomorrow for Day ${tomorrow.day}: ${tomorrow.coins} coins${tomorrowBonus ? ` and a ${tomorrowBonus}` : ""}.`
    : "That's the full week. The cycle starts again tomorrow.";

  if (land) return (
    <>
      <section className="panel tick fit" aria-label="Daily Login Rewards" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="ph">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <h2>Daily Login</h2>
            {streak && <span className="pill lime" style={{ height: 28, padding: "0 11px", fontSize: 11 }}><Flame aria-hidden="true" />{streak}</span>}
          </div>
          <span className="muted2 tnum">{claimedCount} / 7 claimed</span>
        </div>
        <div className="days">
          {DAILY_LOGIN_REWARDS.map((reward) => {
            const day = reward.day;
            const isClaimed = dailyLogin.rewards[day - 1]?.claimed ?? false;
            const isToday = available && day === nextAvailableDay;
            const bonus = bonusLabel(reward.bonusItem);
            const body = (
              <>
                <span className="dn" style={isToday ? { color: "#C6FF33" } : undefined}>{isToday ? "Today" : `Day ${day}`}</span>
                <div className="rew" data-ar-loop={isToday ? "" : undefined}>
                  {day === 7 ? <span className="gift" aria-hidden="true"><Gift /></span> : <GemStack day={day} />}
                </div>
                <span className="amt"><CoinGem small />{reward.coins}</span>
                <div className="tail">
                  {isToday
                    ? <span className="pill lime" style={{ height: 24, padding: "0 10px", fontSize: 10 }}>Claim</span>
                    : bonus ? <span className="bonus">+ {bonus}</span> : null}
                </div>
              </>
            );
            if (isToday) {
              return (
                <button type="button" className={`day today ${day === 7 ? "big" : ""}`.trim()} key={day} onClick={() => handleClaim(day)} disabled={claiming}
                  aria-label={`Claim Day ${day}: ${reward.coins} coins${bonus ? ` and ${bonus}` : ""}`} data-flat>
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
        {!available && <p className="muted2 tnum" role="status" style={{ margin: 0 }}>{status ? `Daily reward claimed · Next claim in ${countdown}` : "Loading daily reward status…"}</p>}
        <div className="meter seg" style={{ flex: "none" }} role="progressbar" aria-label="Daily reward cycle"
          aria-valuenow={Math.round((claimedCount / 7) * 100)} aria-valuemin={0} aria-valuemax={100} aria-valuetext={`${claimedCount} of 7 claimed`}>
          <i style={{ width: `${(claimedCount / 7) * 100}%` }} />
        </div>
      </section>

      {/* LRewardsClaimed: the gems beside the copy, in the landscape dialog. */}
      <Sheet open={!!claimed} dialog onClose={() => setClaimedDay(null)} namespace="arena-lrewards" className="lcel"
        label={claimedDay ? `Day ${claimedDay} claimed` : ""} headingId="day-claimed-title">
        {claimed && (
          <>
            <div className="glow"><GemStack day={claimedDay!} /></div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
              <h2 id="day-claimed-title" className="disp chrome" style={{ margin: "0 0 10px", fontSize: 36, lineHeight: 1 }}>
                {t("rewards_dayClaimed").replace("{n}", String(claimedDay))}
              </h2>
              <b style={{ display: "inline-flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display), sans-serif", fontSize: 26, color: "#C6FF33" }}>
                <CoinGem />+{claimed.coins} Coins
              </b>
              <p className="muted" style={{ margin: "10px 0 16px", lineHeight: 1.45 }}>
                {/* The bonus's name never breaks across lines, as the board sets it. */}
                {tomorrow
                  ? <>Come back tomorrow for Day {tomorrow.day}: {tomorrow.coins} coins{tomorrowBonus && <> and a <span style={{ whiteSpace: "nowrap" }}>{tomorrowBonus}</span></>}.</>
                  : nextLine}
              </p>
              <button type="button" className="ar-btn" style={{ alignSelf: "stretch" }} onClick={() => setClaimedDay(null)} autoFocus>Continue</button>
            </div>
          </>
        )}
      </Sheet>
    </>
  );

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
            const isToday = available && day === nextAvailableDay;
            const big = day === 7;
            const bonus = bonusLabel(reward.bonusItem);
            const art = big
              ? <span className="gift" aria-hidden="true"><Gift /></span>
              : <GemStack day={day} />;

            const name = (
              <span className="dn" style={isToday ? { color: "#C6FF33" } : undefined}>
                {isToday ? `Day ${day} · Today` : `Day ${day}`}
              </span>
            );
            const amount = <span className="amt"><CoinGem small />{reward.coins}</span>;
            const tail = isToday
              ? <Pill tone="lime" className="day-claim">Claim</Pill>
              : <span className="bonus">{bonus ? `+ ${bonus}` : ""}</span>;

            const body = <>{name}<div className="rew">{art}</div>{amount}{tail}</>;

            if (isToday) {
              return (
                <button
                  type="button"
                  className="day today"
                  key={day}
                  onClick={() => handleClaim(day)}
                  disabled={claiming}
                  aria-label={`Claim Day ${day}: ${reward.coins} coins${bonus ? ` and ${bonus}` : ""}`}
                  data-flat
                >
                  {body}
                </button>
              );
            }
            return (
              <div className={`day ${isClaimed ? "claimed" : ""} ${big ? "big" : ""}`.replace(/\s+/g, " ").trim()} key={day}>
                {isClaimed && <span className="chk" aria-hidden="true"><Check /></span>}
                {body}
              </div>
            );
          })}
        </div>

        {!available && <p className="muted2 tnum" role="status" style={{ margin: 0 }}>{status ? `Daily reward claimed · Next claim in ${countdown}` : 'Loading daily reward status…'}</p>}

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
            <p className="muted" style={{ margin: "12px 0 22px" }}>{nextLine}</p>
            <button type="button" className="ar-btn" style={{ width: "100%" }} onClick={() => setClaimedDay(null)} autoFocus>
              Continue
            </button>
          </div>
        </div>
      )}

    </>
  );
}
