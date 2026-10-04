"use client";

import Link from "next/link";
import {
  BarChart3, Clock, Crown, HelpCircle, RefreshCw, Search, Trophy, UserPlus, Users,
} from "lucide-react";
import type { LeaderboardEntry, LeaderboardPeriod } from "@/types";
import { Avatar, RankLabel } from "@/components/arena";
import { getRankFromTrophies } from "@/constants/ranks";
import { RewardsCard } from "../RewardsCard";

/**
 * Leaderboard on a phone held upright —
 * design/arena/boards/MLeaderboard.dc.html,
 * design/arena/screens/phone/phone-07-leaderboard.jpg.
 *
 * The wide screen's two columns become one, in the board's order: the period
 * chips, the reset countdown with the two icon buttons beside it, the
 * podium, your rank, the table, the weekly rewards and the note on ordering.
 *
 * Two things change shape. The four periods become a scrolling `.chips` row,
 * because four labels with icons will not fit as equal segments (MOBILE.md
 * "Tabs"). And the table's six columns become four: place, player, their
 * rank and win rate on one line under the name, and trophies - the two
 * figures the six columns spent the width on are folded into `.nm3`.
 *
 * Monthly stays disabled with its "Soon" chip, as on the wide screen:
 * useLeaderboard has no monthly window, and a tab that quietly showed the
 * weekly one would be a lie.
 */

/** Board order: 2nd on the left, 1st centre, 3rd on the right. */
const PLACES = [
  { place: 2, offset: -173, plinth: "p2", size: 50, metal: "linear-gradient(135deg, #FFFFFF, #B9C2C9)" },
  { place: 1, offset: -56, plinth: "p1", size: 62, metal: "linear-gradient(135deg, #FFE58A, #E0B52E)" },
  { place: 3, offset: 61, plinth: "p3", size: 50, metal: "linear-gradient(135deg, #F0B587, #B0703A)" },
];

export interface PhoneLeaderboardProps {
  period: LeaderboardPeriod;
  onPeriod: (next: LeaderboardPeriod) => void;
  /** "1d 14h" - already formatted by the wide screen's own helper. */
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
  onScrollToMe: () => void;
  t: (key: string) => string;
}

export function PhoneLeaderboard(p: PhoneLeaderboardProps) {
  return (
    <div className="arena-phone arena-mleaderboard mpage">
      <div className="mh">
        <span className="lbl dash" style={{ color: "#C6FF33" }}>Compete and climb the ranks</span>
        <h1 className="disp chrome">Leaderboard</h1>
      </div>

      <div className="chips" role="group" aria-label="Leaderboard period">
        <button type="button" aria-pressed={p.period === "weekly"} onClick={() => p.onPeriod("weekly")} data-flat>
          <BarChart3 aria-hidden="true" />Weekly
        </button>
        <button type="button" disabled title="Monthly boards are not available yet" data-flat>
          Monthly<span className="soon">Soon</span>
        </button>
        <button type="button" aria-pressed={p.period === "allTime"} onClick={() => p.onPeriod("allTime")} data-flat>
          <Trophy aria-hidden="true" />All Time
        </button>
        <button type="button" aria-pressed={p.period === "friends"} onClick={() => p.onPeriod("friends")} data-flat>
          <Users aria-hidden="true" />Friends
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {p.period === "weekly" && p.resetIn && (
          <span className="pill line" style={{ height: 34, padding: "0 12px" }}>
            <Clock aria-hidden="true" />Resets in {p.resetIn}
          </span>
        )}
        <button type="button" className="ibtn" aria-label="How it works?" onClick={p.onHowItWorks}
          style={{ marginLeft: "auto", width: 40, height: 40 }} data-flat>
          <HelpCircle aria-hidden="true" />
        </button>
        <button type="button" className="ibtn" aria-label="Refresh leaderboard" onClick={p.onRefresh}
          style={{ width: 40, height: 40 }} data-flat>
          <RefreshCw aria-hidden="true" />
        </button>
      </div>

      {p.error ? (
        <div className="lockbar" role="alert">
          <span className="muted">{p.error}</span>
          <button type="button" className="link" onClick={p.onRefresh} data-flat>
            <RefreshCw aria-hidden="true" />{p.t("error_tryAgain")}
          </button>
        </div>
      ) : p.loading ? (
        <p className="muted">Loading the board…</p>
      ) : p.entries.length === 0 ? (
        <section className="panel tick" style={{ padding: 24, textAlign: "center" }}>
          {p.period === "friends" ? (
            <>
              <Users aria-hidden="true" style={{ width: 30, height: 30, color: "#3A3A46" }} />
              <h2 className="disp" style={{ margin: "12px 0" }}>{p.t("leaderboard_emptyFriends")}</h2>
              <Link href={p.signedIn ? "/friends" : "/login"} className="ar-btn ghost sm">
                <UserPlus aria-hidden="true" />{p.t(p.signedIn ? "leaderboard_findFriends" : "login_signIn")}
              </Link>
            </>
          ) : (
            <>
              <Trophy aria-hidden="true" style={{ width: 30, height: 30, color: "#3A3A46" }} />
              <h2 className="disp" style={{ margin: "12px 0 6px" }}>{p.t("leaderboard_emptyTitle")}</h2>
              <p className="muted">{p.t("leaderboard_emptyBody")}</p>
            </>
          )}
        </section>
      ) : (
        <>
          {/* The podium. Fewer than three players draws only the places that
              exist, rather than padding with blanks. */}
          {!p.searching && (
            <section className="podium" aria-label="Top three">
              <div className="spot" aria-hidden="true" />
              {PLACES.map(({ place, offset, plinth, size, metal }) => {
                const entry = p.topThree[place - 1];
                if (!entry) return null;
                const tier = entry.currentRank || getRankFromTrophies(entry.trophies);
                return (
                  <div className={`pl place-${place}`} key={place} style={{ left: "50%", marginLeft: `${offset}px` }}>
                    <div className="who">
                      {place === 1 && <Crown aria-hidden="true" className="podium-crown" />}
                      <span
                        className="bigava"
                        aria-hidden="true"
                        style={{
                          width: size, height: size, fontSize: Math.round(size * 0.42), background: metal,
                          ...(place === 1
                            ? { boxShadow: "0 0 0 3px #0B0B0F, 0 0 0 5px #FFC940, 0 0 26px rgba(255,201,64,.45)" }
                            : {}),
                        }}
                      >
                        {entry.username.charAt(0).toUpperCase()}
                      </span>
                      <b>
                        {entry.username}
                        {entry.uid === p.myUid && <span className="sr-only"> (you)</span>}
                      </b>
                      <RankLabel tier={tier} />
                      <span className="tro"><Trophy aria-hidden="true" />{entry.trophies}</span>
                      {entry.winPercentage !== undefined && (
                        <span className="wrt">{entry.winPercentage}% win rate</span>
                      )}
                    </div>
                    <div className={`plinth ${plinth}`} aria-hidden="true">{place}</div>
                  </div>
                );
              })}
            </section>
          )}

          <YourRank entry={p.currentEntry} above={p.entryAbove} signedIn={p.signedIn} />

          <section className="panel tick" aria-label="Standings" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <label className="field" style={{ flex: "1 1 0" }}>
                <Search aria-hidden="true" />
                <span className="sr-only">{p.t("leaderboard_searchLabel")}</span>
                <input
                  type="search"
                  placeholder={p.t("leaderboard_searchPlaceholder")}
                  value={p.query}
                  onChange={(event) => p.onQuery(event.target.value)}
                />
              </label>
              {p.currentEntry && (
                <button type="button" className="ar-btn sm" style={{ height: 44, padding: "0 12px" }}
                  onClick={p.onScrollToMe} data-flat>
                  {p.t("leaderboard_you")} · #{p.currentEntry.rank}
                </button>
              )}
            </div>

            {p.tableRows.length === 0 ? (
              <p className="muted">{p.t("leaderboard_noMatches")}</p>
            ) : p.tableRows.map((entry) => {
              const tier = entry.currentRank || getRankFromTrophies(entry.trophies);
              const mine = entry.uid === p.myUid;
              return (
                <div className={`lrow ${mine ? "me" : ""}`.trim()} key={entry.uid}
                  id={mine ? "lb-current-user-phone" : undefined}>
                  <span className="pos">{entry.rank}</span>
                  <Avatar name={entry.username} src={entry.avatar} seed={entry.uid} size={36} radius={9} />
                  <span className="nm3">
                    <b>{entry.username}{mine && <span className="pill lime lrow-you">You</span>}</b>
                    <span>
                      <RankLabel tier={tier} />
                      {/* A figure the board does not have reads as a dash,
                          never a zero. */}
                      {entry.winPercentage === undefined ? "--" : `${entry.winPercentage}%`}
                      {" · "}
                      {entry.totalMatches ?? "--"} played
                    </span>
                  </span>
                  <span className="t"><Trophy aria-hidden="true" />{entry.trophies}</span>
                </div>
              );
            })}
          </section>

          <RewardsCard trophies={p.currentEntry?.trophies ?? p.fallbackTrophies} />

          <section className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="lbl dash">How ranks are ordered</span>
            <p className="muted" style={{ margin: 0, lineHeight: 1.5, fontWeight: 500 }}>
              Players are ordered by trophies, highest first. The weekly board counts only trophies
              earned since Monday; All Time counts your lifetime total.
            </p>
          </section>
        </>
      )}
    </div>
  );
}

/** The board's own Your Rank panel: a 60px place with the tier beside it. */
function YourRank({
  entry, above, signedIn,
}: {
  entry: LeaderboardEntry | undefined;
  above: LeaderboardEntry | undefined;
  signedIn: boolean;
}) {
  if (!signedIn || !entry) {
    return (
      <section className="panel tick" aria-label="Your rank" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
        <span className="lbl dash">Your Rank</span>
        <p className="muted" style={{ margin: 0 }}>
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
    <section className="panel tick" aria-label="Your rank" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
      <div
        aria-hidden="true"
        style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(198,255,51,.25), rgba(198,255,51,0))" }}
      />
      <span className="lbl dash" style={{ position: "relative" }}>Your Rank</span>
      <div style={{ position: "relative", display: "flex", alignItems: "flex-end", gap: 14 }}>
        <b className="disp" style={{ fontSize: 60, color: "#C6FF33" }}>#{entry.rank}</b>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingBottom: 4 }}>
          <RankLabel tier={tier} />
          <span style={{ display: "flex", alignItems: "center", gap: 7, fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 18 }}>
            <Trophy aria-hidden="true" style={{ width: 18, height: 18, color: "#C6FF33" }} />
            {entry.trophies} {entry.trophies === 1 ? "Trophy" : "Trophies"}
          </span>
        </div>
      </div>
      <div className="meter" style={{ position: "relative" }} role="progressbar"
        aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
        aria-label={above ? `Progress to place ${above.rank}` : "Top of the board"}>
        <i style={{ width: `${pct}%` }} />
      </div>
      <span className="muted" style={{ position: "relative" }}>
        {above
          ? <><b style={{ color: "#fff" }}>{gap} {gap === 1 ? "trophy" : "trophies"}</b> to the next place.</>
          : <>You are top of the board.</>}
      </span>
    </section>
  );
}
