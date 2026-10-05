"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Flame, Swords, ArrowRight, TrendingUp, TrendingDown, Shield, Calendar,
  BadgeCheck, Crown, Clock, RefreshCw, Trophy,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";
import { getRankFromTrophies } from "@/constants/ranks";
import {
  isQualified, getWeeklyStandings, getLeagueWindow, formatLeagueBoundary,
  type WeeklyStanding,
} from "@/lib/weekendLeague";
import { Pill, Avatar, RankLabel, CoinGem } from "@/components/arena";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { LandLeague } from "@/components/league/land/LandLeague";

/**
 * Weekend League — design/arena/screens/app/app-09-weekend-league.jpg,
 * from the League board.
 *
 * The board draws the window live. Outside it, the same hero says when it
 * opens instead, with the countdown running down to that moment rather than
 * to the end of a league that is not on.
 *
 * CODE ISSUE 9 is fixed here. The screen used `nextUnlockTime` from
 * useRankLock for both halves of that sentence, but that hook only fills
 * the field while ranked play is locked - so through the week, exactly when
 * a player wants to know when the league starts, the line read "Opens " and
 * stopped. getLeagueWindow (lib/weekendLeague.ts) works both boundaries out
 * directly, from the same Thursday-23:59 to Sunday-00:05 window the lock
 * uses, so the copy and the countdown always have a real time in them.
 */

const RULES = [
  { Icon: TrendingUp, tone: "", title: "Win +10", body: "Double trophies every match." },
  { Icon: TrendingDown, tone: "b", title: "Loss −4", body: "Losses double too." },
  { Icon: Shield, tone: "b", title: "Silver and up", body: "Reach Silver during the week to qualify." },
  { Icon: Calendar, tone: "", title: "Friday–Saturday", body: "Ranked pauses; it resumes Sunday." },
];

/** The board's two-cell countdown, to the sensible pair of units. */
function countdownCells(ms: number) {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return [{ value: days, label: days === 1 ? "Day" : "Days" }, { value: hours, label: "Hours" }];
  return [{ value: hours, label: "Hours" }, { value: minutes, label: "Minutes" }];
}

export default function TournamentPage() {
  const { playerStats, user } = useAuth();
  const router = useRouter();
  const t = useTranslation();
  const phone = usePhoneLayout();
  const [standings, setStandings] = useState<WeeklyStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);
  const [window_, setWindow] = useState(() => getLeagueWindow());

  const trophies = playerStats?.trophies || 0;
  const rank = getRankFromTrophies(trophies);
  const qualified = isQualified(rank);

  // The countdown has to age, and the window itself flips at the boundary.
  useEffect(() => {
    const timer = setInterval(() => setWindow(getLeagueWindow()), 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getWeeklyStandings()
      .then((rows) => !cancelled && setStandings(rows))
      .catch((err) => !cancelled && setError(String(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [retryKey]);

  const live = window_.live;
  const cells = countdownCells(window_.msRemaining);
  const boundary = formatLeagueBoundary(window_.boundary);

  /* A phone gets LLeague: the hero beside the game buttons, then the rules
     and the standings in two columns. It picks in JavaScript rather than
     CSS because this page fetches the standings once per mount, and two
     mounts would be two fetches. */
  if (phone) return (
    <LandLeague
      live={live}
      title={live ? "Weekend League is live" : "Weekend League"}
      lede={live
        ? `Silver rank and up, double trophies every match. Ends ${boundary}.`
        : `Silver rank and up, double trophies every match. Opens ${boundary}.`}
      cells={cells}
      qualified={qualified}
      rank={rank}
      notQualified={t("tournament_notQualified").replace("{rank}", rank).replace("{trophies}", String(trophies))}
      onMindi={() => router.push("/play/mindi/ranked")}
      onGin={() => router.push("/play/gin-rummy/ranked")}
      rules={RULES}
      howItWorks={t("league_howItWorks")}
      standings={standings}
      loading={loading}
      error={error}
      onRetry={() => setRetryKey(k => k + 1)}
      myUid={user?.uid}
      noQualified={t("tournament_noQualified")}
      retryText={t("error_tryAgain")}
    />
  );

  return (
    <div className="arena-league ar-page league-page">
      <div style={{ display: "flex", flexDirection: "column", gap: "18px", minWidth: 0 }}>
        <section className="leaguehero" aria-label="Weekend League status">
          <div className="word" aria-hidden="true">LEAGUE</div>
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
            <span className="flame" aria-hidden="true"><Flame /></span>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 }}>
              <span style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span className="lbl" style={{ color: "#8AF0F5" }}>{t("page_weekendLeague")}</span>
                {live ? <Pill tone="lime" live>Live</Pill> : <Pill tone="line">Fri – Sat</Pill>}
              </span>
              <h1 className="disp chrome ar-h1 league-title">
                {live ? "Weekend League is live" : "Weekend League"}
              </h1>
            </div>
          </div>

          <p className="body league-lede">
            {live
              ? `Silver rank and up, double trophies every match. Ends ${boundary}.`
              : `Silver rank and up, double trophies every match. Opens ${boundary}.`}
          </p>

          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: "26px", flexWrap: "wrap" }}>
            <div className="cd" aria-label={live ? "Time left" : "Time until it opens"}>
              {cells.map(({ value, label }) => (
                <div key={label}>
                  <b>{String(value).padStart(2, "0")}</b>
                  <span className="lbl" style={{ fontSize: "10px" }}>{label}</span>
                </div>
              ))}
            </div>
            {qualified ? (
              <Pill tone="lime" className="league-qual">
                <BadgeCheck aria-hidden="true" />You qualify · {rank}
              </Pill>
            ) : (
              <Pill tone="line" className="league-qual">
                <Shield aria-hidden="true" />
                {t("tournament_notQualified").replace("{rank}", rank).replace("{trophies}", String(trophies))}
              </Pill>
            )}
          </div>
        </section>

        <div className="league-games">
          {/* The board draws both buttons live. Outside the window, or
              unqualified, they are disabled rather than hidden - the player
              can still see what is coming. */}
          <button
            type="button"
            className="gbtn"
            disabled={!live || !qualified}
            onClick={() => router.push("/play/mindi/ranked")}
            data-flat
          >
            <Swords aria-hidden="true" />
            <span><b>Mindi</b><small>Double trophies · 4 players</small></span>
            <ArrowRight aria-hidden="true" />
          </button>
          <button
            type="button"
            className="gbtn b"
            disabled={!live || !qualified}
            onClick={() => router.push("/play/gin-rummy/ranked")}
            data-flat
          >
            <Swords aria-hidden="true" />
            <span><b>Gin Rummy</b><small>Double trophies · 2 players</small></span>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>

        <div className="panel league-rules">
          {RULES.map(({ Icon, tone, title, body }) => (
            <div className="rule" key={title}>
              <span className={`ri ${tone}`.trim()} aria-hidden="true"><Icon /></span>
              <div><b>{title}</b><span>{body}</span></div>
            </div>
          ))}
        </div>

        <div className="panel tick b league-champ">
          <span className="aic league-champ-hex" aria-hidden="true"><Crown /></span>
          <div style={{ flexGrow: 1, minWidth: 0 }}>
            <span className="lbl">Weekend Champion</span>
            <div className="disp" style={{ fontSize: "20px", marginTop: "6px" }}>Become Weekend Champion</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "6px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "7px", fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: "18px" }}>
              <CoinGem small />3,000
            </span>
            <span className="muted2">Achievement reward</span>
          </div>
        </div>
      </div>

      <section className="panel tick league-standings" aria-label="This week's standings">
        <div className="ph" style={{ marginBottom: "8px" }}>
          <h2>This Week&apos;s Standings</h2>
          <span className="lbl">Weekly trophies</span>
        </div>

        {loading ? (
          <p className="muted2">Loading standings...</p>
        ) : error ? (
          <p className="muted2">
            Standings could not be loaded.{" "}
            <button type="button" className="link" onClick={() => setRetryKey(k => k + 1)} data-flat>
              <RefreshCw aria-hidden="true" />{t("error_tryAgain")}
            </button>
          </p>
        ) : standings.length === 0 ? (
          <div className="league-empty">
            <Trophy aria-hidden="true" />
            <p className="muted">{t("tournament_noQualified")}</p>
          </div>
        ) : (
          standings.map((standing, index) => {
            const mine = standing.uid === user?.uid;
            const medal = index === 0 ? "#FFC940" : index === 1 ? "#D2D6DA" : index === 2 ? "#E09A62" : undefined;
            return (
              <div className={`srow ${mine ? "me" : ""}`.trim()} key={standing.uid}>
                <span className="pos" style={{ color: mine ? "#C6FF33" : medal }}>{index + 1}</span>
                <span className="nm3">
                  <Avatar name={standing.displayName} seed={standing.uid} size={32} radius={8} />
                  <b>{standing.displayName}</b>
                  {mine
                    ? <span className="pill lime srow-you">You</span>
                    : <RankLabel tier={standing.currentRank}>{""}</RankLabel>}
                </span>
                <span className="wt">{standing.weeklyTrophies.toLocaleString()}</span>
              </div>
            );
          })
        )}

        <p className="muted2 league-note">
          Silver rank and up only. Standings follow weekly trophies.
        </p>
      </section>
    </div>
  );
}
