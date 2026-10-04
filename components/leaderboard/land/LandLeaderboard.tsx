"use client";

import { useRef } from "react";
import Link from "next/link";
import {
  BarChart3, Clock, Crown, Gift, HelpCircle, RefreshCw, Search, Trophy, UserPlus, Users,
} from "lucide-react";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/types";
import { RANK_CONFIGS } from "@/data/cosmetics";
import { useEconomy } from "@/contexts/EconomyContext";
import { getRankFromTrophies } from "@/constants/ranks";
import { formatCoins } from "@/lib/wallet";
import { Avatar, CoinGem, RankHex, RankLabel } from "@/components/arena";

/**
 * Leaderboard on a phone - design/arena/boards/LLeaderboard.dc.html,
 * design/arena/screens/landscape/landscape-07-leaderboard.jpg.
 *
 * A fixed screen. Along the top, Weekly / Monthly (Soon) / All Time /
 * Friends with the reset pill, How it works and Refresh. Left, the podium
 * and Your Rank. Right, search, "You · #n", the rewards button and the
 * list; it scrolls inside its pane and ends with Weekly Rewards and how
 * ranks are ordered.
 *
 * The page ranks the board once (useLeaderboard) and passes the result in,
 * the same rows the wide screen shows. Monthly stays the board's disabled
 * chip: there is no monthly window, and a tab that quietly showed the
 * weekly one would be a lie. Weekly rewards are paid by rank tier, as
 * RewardsCard explains, so the marked row is the tier your trophies earn.
 */

/** Board order: 2nd, 1st, 3rd. */
const PLACES = [
  { place: 2, plinth: "p2", size: 38, radius: 11, font: 16, metal: "linear-gradient(135deg, #FFFFFF, #B9C2C9)" },
  { place: 1, plinth: "p1", size: 46, radius: 13, font: 20, metal: "linear-gradient(135deg, #FFE58A, #E0B52E)" },
  { place: 3, plinth: "p3", size: 38, radius: 11, font: 16, metal: "linear-gradient(135deg, #F0B587, #B0703A)" },
];

export interface LandLeaderboardProps {
  period: LeaderboardPeriod;
  onPeriod: (next: LeaderboardPeriod) => void;
  /** "1d 14h" - formatted by the wide screen's own helper. */
  resetIn: string | null;
  entries: LeaderboardEntry[];
  topThree: LeaderboardEntry[];
  tableRows: LeaderboardEntry[];
  currentEntry: LeaderboardEntry | undefined;
  entryAbove: LeaderboardEntry | undefined;
  myUid: string | undefined;
  signedIn: boolean;
  fallbackTrophies: number | undefined;
  loading: boolean;
  error: string | null;
  searching: boolean;
  query: string;
  onQuery: (next: string) => void;
  onRefresh: () => void;
  onHowItWorks: () => void;
  t: (key: string) => string;
}

export function LandLeaderboard(p: LandLeaderboardProps) {
  const list = useRef<HTMLDivElement>(null);
  /** The board's two jumps: your row to the middle, the rewards to the top. */
  const jump = (selector: string, middle: boolean) => {
    const pane = list.current;
    const target = pane?.querySelector<HTMLElement>(selector);
    if (!pane || !target) return;
    const top = target.offsetTop - (middle ? (pane.clientHeight - target.offsetHeight) / 2 : 0);
    pane.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  };

  return (
    <div className="arena-land is-m is-land arena-lleaderboard">
      <div className="mpage fx" style={{ paddingBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, height: 34 }}>
          <div className="chips" role="group" aria-label={p.t("leaderboard_periodLabel")} style={{ flex: "1 1 0", minWidth: 0, margin: 0, padding: 0 }}>
            <button type="button" aria-pressed={p.period === "weekly"} onClick={() => p.onPeriod("weekly")} data-flat>
              <BarChart3 aria-hidden="true" />Weekly
            </button>
            <button type="button" disabled title="Monthly boards are not available yet" style={{ cursor: "not-allowed", color: "#5E5E6A" }} data-flat>
              Monthly<span className="soon">Soon</span>
            </button>
            <button type="button" aria-pressed={p.period === "allTime"} onClick={() => p.onPeriod("allTime")} data-flat>
              <Trophy aria-hidden="true" />All Time
            </button>
            <button type="button" aria-pressed={p.period === "friends"} onClick={() => p.onPeriod("friends")} data-flat>
              <Users aria-hidden="true" />Friends
            </button>
          </div>
          {p.period === "weekly" && p.resetIn && (
            <span className="pill line" style={{ flex: "none", height: 34, padding: "0 12px" }}>
              <Clock aria-hidden="true" />Resets in {p.resetIn}
            </span>
          )}
          <button type="button" className="ibtn" aria-label="How it works?" onClick={p.onHowItWorks} style={{ flex: "none", width: 34, height: 34 }}>
            <HelpCircle aria-hidden="true" />
          </button>
          <button type="button" className="ibtn" aria-label="Refresh leaderboard" onClick={p.onRefresh} style={{ flex: "none", width: 34, height: 34 }}>
            <RefreshCw aria-hidden="true" />
          </button>
        </div>

        {p.error || p.loading || p.entries.length === 0 ? (
          <section className="panel tick" style={{ flex: "1 1 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 20, textAlign: "center" }}>
            {p.error ? (
              <div role="alert" style={{ display: "contents" }}>
                <p className="muted" style={{ margin: 0 }}>{p.error}</p>
                <button type="button" className="ar-btn ghost sm" onClick={p.onRefresh}><RefreshCw aria-hidden="true" />{p.t("error_tryAgain")}</button>
              </div>
            ) : p.loading ? (
              <p className="muted" style={{ margin: 0 }}>Loading the board…</p>
            ) : p.period === "friends" ? (
              <>
                <Users aria-hidden="true" style={{ width: 30, height: 30, color: "#3A3A46" }} />
                <b className="disp" style={{ fontSize: 18, textTransform: "uppercase" }}>{p.t("leaderboard_emptyFriends")}</b>
                <Link href={p.signedIn ? "/friends" : "/login"} className="ar-btn ghost sm">
                  <UserPlus aria-hidden="true" />{p.t(p.signedIn ? "leaderboard_findFriends" : "login_signIn")}
                </Link>
              </>
            ) : (
              <>
                <Trophy aria-hidden="true" style={{ width: 30, height: 30, color: "#3A3A46" }} />
                <b className="disp" style={{ fontSize: 18, textTransform: "uppercase" }}>{p.t("leaderboard_emptyTitle")}</b>
                <p className="muted" style={{ margin: 0 }}>{p.t("leaderboard_emptyBody")}</p>
              </>
            )}
          </section>
        ) : (
          <div className="cols" style={{ gridTemplateColumns: "312px minmax(0, 1fr)", height: "calc(100dvh - 122px - env(safe-area-inset-bottom))", alignItems: "stretch" }}>
            <div className="stk fill">
              <section className="lbpod" aria-label="Top three">
                <div className="lbspot" aria-hidden="true" />
                {PLACES.map(({ place, plinth, size, radius, font, metal }) => {
                  const entry = p.topThree[place - 1];
                  // Fewer than three players: only the places that exist.
                  if (!entry) return <div className="lpl" key={place} aria-hidden="true" />;
                  const tier = entry.currentRank || getRankFromTrophies(entry.trophies);
                  return (
                    <div className="lpl" key={place}>
                      <div className="lav">
                        {place === 1 && <Crown className="crn" aria-hidden="true" />}
                        <span className="bigava" aria-hidden="true" style={{
                          width: size, height: size, borderRadius: radius, fontSize: font, background: metal,
                          ...(place === 1 ? { boxShadow: "0 0 0 2.5px #0B0B0F, 0 0 0 4.5px #FFC940, 0 0 22px rgba(255,201,64,.45)" } : {}),
                        }}>{entry.username.charAt(0).toUpperCase()}</span>
                      </div>
                      <b>{entry.username}{entry.uid === p.myUid && <span className="sr-only"> (you)</span>}</b>
                      <RankLabel tier={tier} />
                      <span className="tro"><Trophy aria-hidden="true" />{entry.trophies}</span>
                      {entry.winPercentage !== undefined && <span className="wrt">{entry.winPercentage}% win rate</span>}
                      <div className={`plinth ${plinth}`} aria-hidden="true">{place}</div>
                    </div>
                  );
                })}
              </section>
              <YourRank entry={p.currentEntry} above={p.entryAbove} signedIn={p.signedIn} t={p.t} />
            </div>

            <section className="panel tick b lbpane" aria-label="Ranked players">
              <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 8 }}>
                <label className="field" style={{ flex: "1 1 0", height: 38, minWidth: 0 }}>
                  <Search aria-hidden="true" />
                  <span className="sr-only">{p.t("leaderboard_searchLabel")}</span>
                  <input type="search" placeholder={p.t("leaderboard_searchPlaceholder")} value={p.query}
                    onChange={(event) => p.onQuery(event.target.value)} />
                </label>
                {p.currentEntry && (
                  <button type="button" className="ar-btn sm" style={{ flex: "none", padding: "0 12px" }} onClick={() => jump(".me", true)}>
                    {p.t("leaderboard_you")} · #{p.currentEntry.rank}
                  </button>
                )}
                <button type="button" className="ibtn" aria-label={p.t("leaderboard_weeklyRewards")} onClick={() => jump(".lbrew", false)}
                  style={{ flex: "none", width: 38, height: 38, color: "#00BCC8" }}>
                  <Gift aria-hidden="true" />
                </button>
              </div>
              <div className="lbh" aria-hidden="true"><span>#</span><span /><span>Player</span><span>Played</span><span>Win</span><span>Trophies</span></div>
              <div className="lbsc scrl" ref={list}>
                {p.tableRows.length === 0 ? (
                  <p className="muted" style={{ margin: "8px 10px" }}>{p.t("leaderboard_noMatches")}</p>
                ) : p.tableRows.map((entry) => {
                  const tier = entry.currentRank || getRankFromTrophies(entry.trophies);
                  const mine = entry.uid === p.myUid;
                  return (
                    <div className={`lbr ${mine ? "me" : ""}`.trim()} key={entry.uid}>
                      <span className="pos">{entry.rank}</span>
                      <Avatar name={entry.username} src={entry.avatar} seed={entry.uid} size={34} radius={10} style={{ fontSize: 15 }} />
                      <span className="nm">
                        <b>{entry.username}{mine && <span className="pill lime" style={{ height: 16, padding: "0 5px", fontSize: 9 }}>{p.t("leaderboard_you")}</span>}</b>
                        <RankLabel tier={tier} />
                      </span>
                      {/* A figure the board does not have reads as a dash, never a zero. */}
                      <span className="n">{entry.totalMatches ?? "--"}</span>
                      <span className="n">{entry.winPercentage === undefined ? "--" : `${entry.winPercentage}%`}</span>
                      <span className="t"><Trophy aria-hidden="true" />{entry.trophies}</span>
                    </div>
                  );
                })}
                <Rewards trophies={p.currentEntry?.trophies ?? p.fallbackTrophies} t={p.t} />
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/** The board's Your Rank: the place beside the tier, trophies and the gap to the next. */
function YourRank({ entry, above, signedIn, t }: {
  entry: LeaderboardEntry | undefined; above: LeaderboardEntry | undefined; signedIn: boolean; t: (key: string) => string;
}) {
  const glow = (
    <div aria-hidden="true" style={{ position: "absolute", right: -40, top: -40, width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(198,255,51,.25), rgba(198,255,51,0))" }} />
  );
  if (!signedIn || !entry) {
    return (
      <section className="panel tick grow" aria-label="Your rank" style={{ padding: "12px 14px", overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>
        {glow}
        <span className="lbl" style={{ position: "relative", fontSize: 9.5 }}>{t("leaderboard_yourRank")}</span>
        <p className="muted2" style={{ position: "relative", margin: 0, fontSize: 12 }}>
          {signedIn ? "Play a ranked match this week and you will appear here." : "Sign in to see where you stand."}
        </p>
      </section>
    );
  }
  const tier = entry.currentRank || getRankFromTrophies(entry.trophies);
  const gap = above ? Math.max(0, above.trophies - entry.trophies) : 0;
  const progress = !above ? 1 : above.trophies > 0 ? entry.trophies / above.trophies : 1;
  const pct = Math.round(Math.min(1, Math.max(0, progress)) * 100);
  return (
    <section className="panel tick grow" aria-label="Your rank" style={{ padding: "12px 14px", overflow: "hidden", display: "flex", alignItems: "center", gap: 14 }}>
      {glow}
      <div style={{ position: "relative", flex: "none", display: "flex", flexDirection: "column", gap: 7 }}>
        <span className="lbl" style={{ fontSize: 9.5 }}>{t("leaderboard_yourRank")}</span>
        <b className="disp" style={{ fontSize: 42, lineHeight: 0.85, color: "#C6FF33" }}>#{entry.rank}</b>
      </div>
      <div style={{ position: "relative", flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ display: "flex", alignItems: "center", gap: 9, whiteSpace: "nowrap" }}>
          <RankLabel tier={tier} style={{ fontSize: 10 }} />
          <span style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 15, lineHeight: 1 }}>
            <Trophy aria-hidden="true" style={{ width: 15, height: 15, color: "#C6FF33" }} />
            {entry.trophies} {entry.trophies === 1 ? "Trophy" : "Trophies"}
          </span>
        </span>
        <div className="meter" style={{ height: 8 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
          aria-label={above ? `Progress to place ${above.rank}` : "Top of the board"}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <span className="muted2" style={{ fontSize: 11.5, lineHeight: 1.2, whiteSpace: "nowrap" }}>
          {above
            ? <><b style={{ color: "#fff" }}>{gap} {gap === 1 ? "trophy" : "trophies"}</b> to the next place.</>
            : <>You are top of the board.</>}
        </span>
      </div>
    </section>
  );
}

/**
 * Weekly Rewards and how ranks are ordered, at the end of the list. Paid by
 * rank tier (RANK_CONFIGS, with admin overrides), marked by the tier your
 * trophies earn - the same rules as RewardsCard on the wide screen.
 */
function Rewards({ trophies, t }: { trophies: number | undefined; t: (key: string) => string }) {
  const { state } = useEconomy();
  const overrides = state.rankRewardOverrides?.weeklyRewards;
  const myTier = trophies === undefined ? null : getRankFromTrophies(trophies);
  return (
    <div className="lbrew" id="rewards">
      <div className="ph">
        <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {t("leaderboard_weeklyRewards")}<Gift aria-hidden="true" style={{ width: 18, height: 18, color: "#00BCC8" }} />
        </h2>
      </div>
      <p className="muted2" style={{ margin: "-4px 0 0" }}>{t("leaderboard_rewardsByTier")}</p>
      <div className="cols c2" style={{ gap: 8 }}>
        {RANK_CONFIGS.map((config) => {
          const mine = myTier === config.tier;
          return (
            <div className={`rw ${mine ? "cur" : ""}`.trim()} key={config.tier}>
              <RankHex tier={config.tier} width={24} height={28}><Crown style={{ width: 12, height: 12 }} /></RankHex>
              <b style={{ color: config.color }}>{config.tier}</b>
              {mine && <span className="pill lime" style={{ height: 18, padding: "0 6px", fontSize: 9 }}>You</span>}
              <span className="amt"><CoinGem small />{formatCoins(overrides?.[config.tier] ?? config.weeklyReward)}</span>
            </div>
          );
        })}
      </div>
      <span className="lbl dash" style={{ marginTop: 8 }}>How ranks are ordered</span>
      <p className="muted" style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, fontWeight: 500 }}>
        Players are ordered by trophies, highest first. The weekly board counts only trophies earned since Monday;
        All Time counts your lifetime total.
      </p>
    </div>
  );
}
