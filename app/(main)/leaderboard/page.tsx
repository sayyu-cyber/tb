"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Search, Trophy, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { useAuth } from "@/contexts/AuthContext";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { useTranslation } from "@/hooks/useTranslation";
import { LeaderboardHero } from "@/components/leaderboard/LeaderboardHero";
import { LeaderboardTabs } from "@/components/leaderboard/LeaderboardTabs";
import { Podium } from "@/components/leaderboard/Podium";
import { CurrentRankCard } from "@/components/leaderboard/CurrentRankCard";
import { RewardsCard } from "@/components/leaderboard/RewardsCard";
import { LeaderboardTable } from "@/components/leaderboard/LeaderboardTable";
import { HowItWorksModal } from "@/components/leaderboard/HowItWorksModal";
import { PodiumSkeleton, SideCardSkeleton, TableSkeleton } from "@/components/leaderboard/LeaderboardSkeleton";
import type { LeaderboardPeriod } from "@/types";

/**
 * Leaderboard.
 *
 * Composition only - all ranking logic lives in useLeaderboard, which reads
 * `players/{uid}` directly. Nothing here recomputes trophies, re-sorts the
 * board, or stores a second copy of the ranking, so the page cannot drift
 * from the authoritative data.
 *
 * Search filters the already-loaded rows client-side. That is the honest
 * behaviour for a board capped at the top 50: it narrows what you can see,
 * and the empty state says "no players match" rather than implying the whole
 * player base was searched.
 */
export default function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>("weekly");
  const [queryText, setQueryText] = useState("");
  const [howItWorks, setHowItWorks] = useState(false);

  const { user } = useAuth();
  const t = useTranslation();

  // Friend uids come from the social context the app shell already
  // subscribes to, so the Friends board costs no extra listener.
  const { friends } = useHomeSocial();
  const friendUids = useMemo(() => {
    const ids = friends.map((f) => f.uid);
    // The player belongs on their own friends board.
    return user?.uid ? Array.from(new Set([...ids, user.uid])) : ids;
  }, [friends, user?.uid]);

  const { entries, loading, error, refresh, meta } = useLeaderboard(period, friendUids);

  const trimmed = queryText.trim().toLowerCase();
  const searching = trimmed.length > 0;

  const currentIndex = entries.findIndex((e) => e.uid === user?.uid);
  const currentEntry = currentIndex >= 0 ? entries[currentIndex] : undefined;
  const entryAbove = currentIndex > 0 ? entries[currentIndex - 1] : undefined;

  const topThree = entries.slice(0, 3);
  // While searching, every match is listed - hiding the top three would make
  // a search for the leader return nothing.
  const tableRows = useMemo(() => {
    const source = searching ? entries : entries.slice(3);
    if (!searching) return source;
    return source.filter((e) => e.username.toLowerCase().includes(trimmed));
  }, [entries, searching, trimmed]);

  const scrollToMe = () => {
    document.getElementById("lb-current-user")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="hub-page lb-page">
      <LeaderboardHero
        onRefresh={refresh}
        onHowItWorks={() => setHowItWorks(true)}
        refreshing={loading}
      />

      <LeaderboardTabs
        active={period}
        onChange={setPeriod}
        nextResetAt={meta.nextResetAt}
        showReset={period === "weekly"}
      />

      {error ? (
        <div className="lb-error" role="alert">
          <p>{error}</p>
          <button type="button" onClick={refresh}>
            <RefreshCw size={14} aria-hidden="true" />
            {t("error_tryAgain")}
          </button>
        </div>
      ) : loading ? (
        <>
          <div className="lb-main-grid">
            <PodiumSkeleton />
            <aside className="lb-side">
              <SideCardSkeleton />
              <SideCardSkeleton />
            </aside>
          </div>
          <TableSkeleton />
        </>
      ) : entries.length === 0 ? (
        <div className="lb-empty">
          {period === "friends" ? (
            <>
              <Users size={30} aria-hidden="true" />
              <h2>{t("leaderboard_emptyFriends")}</h2>
              <Link href="/friends" className="lb-ghost-button">
                <UserPlus size={15} aria-hidden="true" />
                {t("leaderboard_findFriends")}
              </Link>
            </>
          ) : (
            <>
              <Trophy size={30} aria-hidden="true" />
              <h2>{t("leaderboard_emptyTitle")}</h2>
              <p>{t("leaderboard_emptyBody")}</p>
            </>
          )}
        </div>
      ) : (
        <>
          <div className="lb-main-grid">
            {searching ? <div /> : <Podium topThree={topThree} currentUid={user?.uid} />}
            <aside className="lb-side">
              <CurrentRankCard entry={currentEntry} above={entryAbove} signedIn={Boolean(user)} />
              <RewardsCard />
            </aside>
          </div>

          <div className="lb-toolbar">
            <label className="lb-search">
              <Search size={16} aria-hidden="true" />
              <span className="sr-only">{t("leaderboard_searchLabel")}</span>
              <input
                type="search"
                placeholder={t("leaderboard_searchPlaceholder")}
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
              />
            </label>

            {currentEntry && (
              <button type="button" className="lb-you-badge" onClick={scrollToMe}>
                {t("leaderboard_you")} · #{currentEntry.rank}
              </button>
            )}
          </div>

          {tableRows.length === 0 ? (
            <p className="lb-no-results">{t("leaderboard_noMatches")}</p>
          ) : (
            <LeaderboardTable entries={tableRows} currentUid={user?.uid} />
          )}
        </>
      )}

      <HowItWorksModal open={howItWorks} onClose={() => setHowItWorks(false)} />
    </div>
  );
}
