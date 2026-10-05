"use client";

import { Award, Crown, Medal, RefreshCw, Star, User } from "lucide-react";
import type { HallOfFameEntry } from "@/lib/hallOfFame";
import { Avatar, RankLabel } from "@/components/arena";

/**
 * Hall of Fame on a phone - design/arena/boards/LHallOfFame.dc.html,
 * design/arena/screens/landscape/landscape-10-hall-of-fame.jpg.
 *
 * The all-time strip, with "You · No. n" when you are on the board; the
 * podium - 2, 1 (wider, gold, crowned), 3; then everyone after third in two
 * columns, your row lit. The page scrolls.
 *
 * The page fetches the hall once (useHallOfFame) and passes it in, the
 * same entries the wide screen ranks. Fewer than three players draws only
 * the cards that exist.
 */

const PODIUM = [
  { place: 2, cls: "g2", size: 76, font: 31, metal: "linear-gradient(135deg, #FFFFFF, #B9C2C9)", ring: "0 0 0 3px #0B0B0F, 0 0 0 5px #C9D0D6", pin: "#DCE3E8" },
  { place: 1, cls: "g1", size: 84, font: 36, metal: "linear-gradient(135deg, #FFE58A, #E0B52E)", ring: "0 0 0 4px #0B0B0F, 0 0 0 6px #FFC940, 0 0 36px rgba(255,201,64,.5)", pin: "#FFC940" },
  { place: 3, cls: "g3", size: 76, font: 31, metal: "linear-gradient(135deg, #F0B587, #B0703A)", ring: "0 0 0 3px #0B0B0F, 0 0 0 5px #D08A52", pin: "#E09A62" },
];

export interface LandHallOfFameProps {
  stripTitle: string;
  byPeak: string;
  peakLabel: string;
  youNo: (n: number) => string;
  ranks: (from: number, to: number) => string;
  entries: HallOfFameEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyText: string;
  retryText: string;
  myUid: string | undefined;
  record: (entry: HallOfFameEntry) => string;
}

export function LandHallOfFame(p: LandHallOfFameProps) {
  const top = p.entries.slice(0, 3);
  const rest = p.entries.slice(3);
  const mine = p.entries.findIndex((entry) => entry.uid === p.myUid);

  return (
    <div className="arena-land is-m is-land arena-lhalloffame">
      <div className="mpage">
        <div className="strip">
          <span className="l disp" style={{ fontSize: 15 }}><Award aria-hidden="true" />{p.stripTitle}</span>
          <span className="r">
            <span className="lbl" style={{ color: "#FFE08A", fontSize: 9.5, letterSpacing: ".14em" }}>{p.byPeak}</span>
            {mine >= 0 && <span className="pill lime" style={{ height: 28, padding: "0 10px" }}><User aria-hidden="true" />{p.youNo(mine + 1)}</span>}
          </span>
        </div>

        {p.loading ? (
          <p className="muted" style={{ margin: 0 }}>Loading the hall...</p>
        ) : p.error || p.entries.length === 0 ? (
          <section className="panel tick" role={p.error ? "alert" : undefined}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 24, textAlign: "center" }}>
            <Award aria-hidden="true" style={{ width: 32, height: 32, color: "#3A3A46" }} />
            <p className="muted" style={{ margin: 0 }}>{p.error || p.emptyText}</p>
            {p.error && <button type="button" className="ar-btn ghost sm" onClick={p.onRetry}><RefreshCw aria-hidden="true" />{p.retryText}</button>}
          </section>
        ) : (
          <>
            <section className="cols stretch" aria-label="Top three of all time"
              style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1fr)", height: 262 }}>
              {PODIUM.map(({ place, cls, size, font, metal, ring, pin }) => {
                const entry = top[place - 1];
                if (!entry) return <div key={place} aria-hidden="true" />;
                return (
                  <article className={`legend ${cls}`} key={entry.uid}>
                    <span className="place" aria-hidden="true">{place}</span>
                    <div className="lring">
                      <span className="ring2" aria-hidden="true" style={{ width: size, height: size, fontSize: font, background: metal, boxShadow: ring }}>
                        <span>{entry.displayName.charAt(0).toUpperCase()}</span>
                      </span>
                      {place === 1 ? (
                        <span className="pin" aria-hidden="true" style={{ width: 34, height: 34, color: pin, filter: "drop-shadow(0 0 10px rgba(255,201,64,.75))" }}><Crown /></span>
                      ) : (
                        <span className="pin bd" aria-hidden="true" style={{ color: pin }}><Medal /></span>
                      )}
                    </div>
                    <b className="n" style={{ fontSize: place === 1 ? 23 : 20, marginTop: place === 1 ? 10 : 8 }}>
                      {entry.displayName}{entry.uid === p.myUid && <span className="sr-only"> (you)</span>}
                    </b>
                    <RankLabel tier={entry.highestRank} />
                    <span className="peak" style={place === 1 ? { fontSize: 38 } : undefined}><Star aria-hidden="true" />{entry.peakTrophies}</span>
                    <span className="muted2">{p.record(entry)}</span>
                  </article>
                );
              })}
            </section>

            {rest.length > 0 && (
              <section className="panel tick" aria-label={p.ranks(4, rest.length + 3)} style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="ph"><h2>{p.ranks(4, rest.length + 3)}</h2><span className="lbl">{p.peakLabel}</span></div>
                {/* Down the left column first, as the board numbers them. */}
                <div className="cols c2" style={{ gap: "8px 12px", gridAutoFlow: "column", gridTemplateRows: `repeat(${Math.ceil(rest.length / 2)}, 60px)` }}>
                  {rest.map((entry, index) => {
                    const me = entry.uid === p.myUid;
                    return (
                      <div className={`hrow ${me ? "me" : ""}`.trim()} key={entry.uid}>
                        <span className="pos" style={me ? { color: "#C6FF33" } : undefined}>{index + 4}</span>
                        <Avatar name={entry.displayName} seed={entry.uid} size={40} radius={10} style={{ fontSize: 16 }} />
                        <span className="hx">
                          <b>{entry.displayName}{me && <span className="pill lime" style={{ height: 18, padding: "0 6px", fontSize: 9.5 }}>You</span>}</b>
                          <span className="hm"><RankLabel tier={entry.highestRank} /><span className="muted2">{p.record(entry)}</span></span>
                        </span>
                        <span className="pk"><Star aria-hidden="true" />{entry.peakTrophies}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
