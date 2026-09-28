"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Gift } from "lucide-react";
import { useEconomy } from "@/contexts/EconomyContext";
import { useTranslation } from "@/hooks/useTranslation";
import { DAILY_LOGIN_REWARDS } from "@/data/cosmetics";
import { Pill, Meter, CoinGem } from "@/components/arena";
import { bonusLabel } from "./bonusLabel";

/**
 * Daily Login Rewards — design/arena/screens/app/app-13-rewards-missions.jpg,
 * with the claim popup from app-13b; held upright,
 * design/arena/boards/MRewards.dc.html and
 * design/arena/screens/phone/phone-13-rewards.jpg.
 *
 * Seven tiles: claimed days dim with a lime tick, today is the lit tile you
 * can press, and Day 7 carries the blue ring and the gift. The gem cluster
 * grows with the day, as the board draws it.
 *
 * The bonus line under each tile names the real bonus (see bonusLabel -
 * code issue 7), so Day 3 says GG Sticker and Day 5 says Maldives Wave
 * banner instead of both claiming a Room Card.
 *
 * Upright the same seven tiles go into MRewards' four-column `.days` grid
 * with Day 7 spanning two and turning on its side - the gift beside its own
 * column of text - and the claim celebration becomes the board's centred
 * `.cel` over an `.mscrim` instead of the wide `.claim-pop`.
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

export default function DailyLoginCalendar({ phone = false }: { phone?: boolean }) {
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

  // Escape closes the celebration on the phone, where the scrim is the only
  // other way out and a thumb can miss it.
  useEffect(() => {
    if (!phone || !claimed) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setClaimedDay(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phone, claimed]);

  const nextLine = tomorrow
    ? `Come back tomorrow for Day ${tomorrow.day}: ${tomorrow.coins} coins${tomorrowBonus ? ` and a ${tomorrowBonus}` : ""}.`
    : "That's the full week. The cycle starts again tomorrow.";

  return (
    <>
      <section
        className="panel tick"
        aria-label="Daily Login Rewards"
        style={phone
          ? { padding: "14px", display: "flex", flexDirection: "column", gap: "14px" }
          : { padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}
      >
        <div className="ph">
          <h2>{phone ? "Daily Login" : "Daily Login Rewards"}</h2>
          <span className="muted2 tnum">{claimedCount} / 7 claimed{phone ? "" : " this cycle"}</span>
        </div>

        <div className={phone ? "days" : "day-grid"}>
          {DAILY_LOGIN_REWARDS.map((reward) => {
            const day = reward.day;
            const isClaimed = dailyLogin.rewards[day - 1]?.claimed ?? false;
            const isToday = day === nextAvailableDay;
            const big = day === 7;
            const bonus = bonusLabel(reward.bonusItem);
            const art = big
              ? <span className="gift" aria-hidden="true"><Gift /></span>
              : <GemStack day={day} />;

            // A four-column tile is 68px of text at 390px, so the upright
            // name is "Day 6" and the lime ring, the lime name and the
            // Claim chip say it is today - the wide tile has room to spell
            // it out.
            const name = (
              <span className="dn" style={isToday ? { color: "#C6FF33" } : undefined}>
                {isToday && !phone ? `Day ${day} · Today` : `Day ${day}`}
              </span>
            );
            const amount = <span className="amt"><CoinGem small />{reward.coins}</span>;
            const tail = isToday
              ? <Pill tone="lime" className="day-claim"
                  style={phone ? { height: 22, padding: "0 8px", fontSize: "9.5px" } : undefined}>Claim</Pill>
              : (phone && !bonus) ? null
              : <span className="bonus">{bonus ? `+ ${bonus}` : ""}</span>;

            // Day 7 turns on its side upright: the gift on the left, its own
            // column of name, coins and bonus on the right.
            const body = phone && big
              ? <>{art}<div className="col">{name}{amount}{tail}</div></>
              : <>{name}<div className="rew">{art}</div>{amount}{tail}</>;

            if (isToday) {
              return (
                <button
                  type="button"
                  className={`day today ${phone && big ? "big" : ""}`.replace(/\s+/g, " ").trim()}
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
              <div className={`day ${isClaimed ? "claimed" : ""} ${big ? "big" : ""}`.replace(/\s+/g, " ").trim()} key={day}>
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

      {claimed && !phone && (
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

      {/* Portalled to <body> for the same reason the sheets are: nothing in
          the page's stacking context or overflow can then clip it, and the
          namespaces the generated sheet is scoped under travel with it. */}
      {claimed && phone && typeof document !== "undefined" && createPortal(
        <div className="arena-app arena-phone arena-mrewards mview phone-sheet-host"
          role="dialog" aria-modal="true" aria-label={`Day ${claimedDay} claimed`}>
          <button type="button" className="mscrim" aria-label="Close" onClick={() => setClaimedDay(null)} data-flat />
          <div className="cel" style={{ zIndex: 51 }}>
            <GemStack day={claimedDay!} style={{ margin: "0 auto 6px", transform: "scale(1.3)" }} />
            <h2 className="disp chrome" style={{ margin: "18px 0 8px", fontSize: "36px" }}>
              {t("rewards_dayClaimed").replace("{n}", String(claimedDay))}
            </h2>
            <b style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "var(--font-display), sans-serif", fontSize: "26px", color: "#C6FF33" }}>
              <CoinGem />+{claimed.coins} Coins
            </b>
            <p className="muted" style={{ margin: "12px 0 20px", lineHeight: 1.45 }}>{nextLine}</p>
            <button type="button" className="ar-btn full" onClick={() => setClaimedDay(null)} autoFocus>Continue</button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
