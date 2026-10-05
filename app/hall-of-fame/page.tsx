"use client";

import { Award, RefreshCw, Crown, Medal, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useHallOfFame } from "@/hooks/useHallOfFame";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { LandHallOfFame } from "@/components/halloffame/land/LandHallOfFame";
import { useTranslation } from "@/hooks/useTranslation";
import type { HallOfFameEntry } from "@/lib/hallOfFame";
import { Avatar, RankLabel } from "@/components/arena";

/**
 * Hall of Fame — design/arena/screens/app/app-10-hall-of-fame.jpg, from the
 * HallOfFame board.
 *
 * The top three as gold, silver and bronze cards, then a ranked list by
 * peak trophies. The board draws the winner's card taller and lit; second
 * and third sit lower, which is why the row is aligned to its bottom edge.
 *
 * With fewer than three players it draws only the cards that exist, rather
 * than padding with blanks - a young board should show who is actually on
 * it.
 */

/** The board's three podium treatments, in the order it lays them out. */
const PODIUM = [
  { place: 2, cls: "g2", size: 76, metal: "linear-gradient(135deg, #FFFFFF, #B9C2C9)", ring: "0 0 0 3px #0B0B0F, 0 0 0 5px #C9D0D6", Icon: Medal },
  { place: 1, cls: "g1", size: 96, metal: "linear-gradient(135deg, #FFE58A, #E0B52E)", ring: "0 0 0 4px #0B0B0F, 0 0 0 6px #FFC940, 0 0 36px rgba(255,201,64,.5)", Icon: Crown },
  { place: 3, cls: "g3", size: 76, metal: "linear-gradient(135deg, #F0B587, #B0703A)", ring: "0 0 0 3px #0B0B0F, 0 0 0 5px #D08A52", Icon: Medal },
];

/** "118 wins (64%)" - or just the wins when the rate is unknowable. */
function record(entry: HallOfFameEntry) {
  const rate = entry.totalMatches > 0 ? Math.round((entry.wins / entry.totalMatches) * 100) : null;
  return rate === null ? `${entry.wins} wins` : `${entry.wins} wins (${rate}%)`;
}

export default function HallOfFamePage() {
  const { entries, loading, error, refresh } = useHallOfFame();
  const { user } = useAuth();
  const t = useTranslation();
  const phone = usePhoneLayout();

  const top = entries.slice(0, 3);
  const rest = entries.slice(3);

  /* A phone gets LHallOfFame: the strip, the podium three across, then the
     rest in two columns. It picks in JavaScript rather than CSS because
     useHallOfFame fetches once per mount. */
  if (phone) return (
    <LandHallOfFame
      stripTitle={t("hof_allTimeGreats")}
      byPeak={t("hof_byPeak")}
      peakLabel={t("hof_peakTrophies")}
      youNo={(n) => t("hof_youNo").replace("{n}", String(n))}
      ranks={(from, to) => t("hof_ranksRange").replace("{from}", String(from)).replace("{to}", String(to))}
      entries={entries}
      loading={loading}
      error={error}
      onRetry={refresh}
      emptyText={t("hof_noLegendsYet")}
      retryText={t("error_tryAgain")}
      myUid={user?.uid}
      record={record}
    />
  );

  return (
    <div className="arena-halloffame ar-page" style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
      <div className="phead">
        <div>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>Legends of the table</span>
          <h1 className="disp chrome ar-h1">{t("page_hallOfFame")}</h1>
        </div>
      </div>

      <div className="strip">
        <span className="disp hof-strip-title">
          <Award aria-hidden="true" />{t("hof_allTimeGreats")}
        </span>
        <span className="lbl" style={{ color: "#FFE08A" }}>{t("hof_rankedByPeak")}</span>
      </div>

      {loading ? (
        <p className="muted">Loading the hall...</p>
      ) : error ? (
        <div className="panel hof-empty" role="alert">
          <Award aria-hidden="true" />
          <p className="muted">{error}</p>
          <button type="button" className="ar-btn ghost sm" onClick={refresh}>
            <RefreshCw aria-hidden="true" />{t("error_tryAgain")}
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="panel hof-empty">
          <Award aria-hidden="true" />
          <p className="muted">{t("hof_noLegendsYet")}</p>
        </div>
      ) : (
        <>
          <section className="hof-podium" aria-label="Top three of all time">
            {PODIUM.map(({ place, cls, size, metal, ring, Icon }) => {
              const entry = top[place - 1];
              if (!entry) return null;
              const mine = entry.uid === user?.uid;
              return (
                <article className={`legend ${cls}`} key={entry.uid}>
                  <span className="place" aria-hidden="true">{place}</span>
                  <Icon aria-hidden="true" className="hof-medal" />
                  <span
                    className="ring2"
                    aria-hidden="true"
                    style={{ width: size, height: size, fontSize: Math.round(size * 0.41), background: metal, boxShadow: ring }}
                  >
                    {entry.displayName.charAt(0).toUpperCase()}
                  </span>
                  <b className="n" style={place === 1 ? { fontSize: "26px" } : undefined}>
                    {entry.displayName}
                    {mine && <span className="sr-only"> (you)</span>}
                  </b>
                  <RankLabel tier={entry.highestRank} />
                  <span className="peak" style={place === 1 ? { fontSize: "42px" } : undefined}>
                    <Star aria-hidden="true" />{entry.peakTrophies}
                  </span>
                  <span className="muted2">{record(entry)}</span>
                </article>
              );
            })}
          </section>

          {rest.length > 0 && (
            <section className="panel tick hof-list">
              <div className="hrow head" role="row">
                <span className="lbl">#</span>
                <span />
                <span className="lbl">Player</span>
                <span className="lbl">Highest rank · wins</span>
                <span className="lbl" style={{ textAlign: "right" }}>Peak</span>
              </div>
              {rest.map((entry, index) => {
                const mine = entry.uid === user?.uid;
                return (
                  <div className={`hrow ${mine ? "me" : ""}`.trim()} key={entry.uid}>
                    <span className="pos" style={mine ? { color: "#C6FF33" } : undefined}>{index + 4}</span>
                    <Avatar name={entry.displayName} seed={entry.uid} size={40} radius={10} />
                    <b style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {entry.displayName}
                      {mine && <span className="pill lime hrow-you">You</span>}
                    </b>
                    <span style={{ display: "flex", flexDirection: "column", gap: "5px", minWidth: 0 }}>
                      <RankLabel tier={entry.highestRank} />
                      <span className="muted2">{record(entry)}</span>
                    </span>
                    <span className="pk"><Star aria-hidden="true" />{entry.peakTrophies}</span>
                  </div>
                );
              })}
            </section>
          )}
        </>
      )}
    </div>
  );
}
