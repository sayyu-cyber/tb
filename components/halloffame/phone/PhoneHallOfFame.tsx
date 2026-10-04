"use client";

import { Award, Crown, Medal, RefreshCw, Star } from "lucide-react";
import type { HallOfFameEntry } from "@/lib/hallOfFame";
import { Avatar, RankLabel } from "@/components/arena";

/**
 * Hall of Fame on a phone held upright —
 * design/arena/boards/MHallOfFame.dc.html,
 * design/arena/screens/phone/phone-10-hall-of-fame.jpg.
 *
 * The wide screen puts the three legends side by side and the rest in a
 * five-column table. The board gives first place the full width - it is the
 * hall, and the leader should read like it - puts second and third two-up
 * under it, and folds the table's columns into a row per player with the
 * rank and the record on one line. The table's header row goes with them;
 * there are no columns left to label.
 */

/** The board's three legend cards, in place order. */
const PODIUM = [
  {
    place: 1, cls: "g1", size: 90, medal: 36, Icon: Crown, colour: "#FFC940",
    metal: "linear-gradient(135deg, #FFE58A, #E0B52E)",
    ring: "0 0 0 4px #0B0B0F, 0 0 0 6px #FFC940, 0 0 36px rgba(255,201,64,.5)",
    glow: "drop-shadow(0 0 12px rgba(255,201,64,.7))",
  },
  {
    place: 2, cls: "g2", size: 64, medal: 26, Icon: Medal, colour: "#DCE3E8",
    metal: "linear-gradient(135deg, #FFFFFF, #B9C2C9)",
    ring: "0 0 0 3px #0B0B0F, 0 0 0 5px #C9D0D6",
    glow: undefined,
  },
  {
    place: 3, cls: "g3", size: 64, medal: 26, Icon: Medal, colour: "#E09A62",
    metal: "linear-gradient(135deg, #F0B587, #B0703A)",
    ring: "0 0 0 3px #0B0B0F, 0 0 0 5px #D08A52",
    glow: undefined,
  },
];

export function PhoneHallOfFame({
  title, stripTitle, byPeak, entries, loading, error, onRetry, emptyText, retryText, myUid, record,
}: {
  title: string;
  stripTitle: string;
  byPeak: string;
  entries: HallOfFameEntry[];
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  emptyText: string;
  retryText: string;
  myUid: string | undefined;
  /** "118 wins (64%)", or just the wins where the rate is unknowable. */
  record: (entry: HallOfFameEntry) => string;
}) {
  const top = entries.slice(0, 3);
  const rest = entries.slice(3);

  function Legend({ entry, place }: { entry: HallOfFameEntry; place: 1 | 2 | 3 }) {
    const spec = PODIUM[place - 1];
    const mine = entry.uid === myUid;
    const { Icon } = spec;
    return (
      <article className={`legend ${spec.cls}`}>
        <span className="place" aria-hidden="true">{place}</span>
        <Icon aria-hidden="true" style={{ width: spec.medal, height: spec.medal, color: spec.colour, filter: spec.glow }} />
        <span
          className="ring2"
          aria-hidden="true"
          style={{ width: spec.size, height: spec.size, fontSize: Math.round(spec.size * 0.42), background: spec.metal, boxShadow: spec.ring }}
        >
          {entry.displayName.charAt(0).toUpperCase()}
        </span>
        <b className="n" style={place === 1 ? { fontSize: "24px" } : undefined}>
          {entry.displayName}
          {mine && <span className="sr-only"> (you)</span>}
        </b>
        <RankLabel tier={entry.highestRank} />
        <span className="peak" style={place === 1 ? { fontSize: "38px" } : undefined}>
          <Star aria-hidden="true" />{entry.peakTrophies}
        </span>
        <span className="muted2">{record(entry)}</span>
      </article>
    );
  }

  return (
    <div className="arena-phone arena-mhalloffame mpage">
      <div className="mh">
        <span className="lbl dash" style={{ color: "#C6FF33" }}>Legends of the table</span>
        <h1 className="disp chrome">{title}</h1>
      </div>

      <div className="strip">
        <span className="disp" style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 9, whiteSpace: "nowrap" }}>
          <Award aria-hidden="true" style={{ width: 19, height: 19, color: "#FFC940" }} />{stripTitle}
        </span>
        <span className="lbl" style={{ color: "#FFE08A", fontSize: 9.5, letterSpacing: ".14em" }}>{byPeak}</span>
      </div>

      {loading ? (
        <p className="muted">Loading the hall...</p>
      ) : error ? (
        <div className="panel hof-empty" role="alert">
          <Award aria-hidden="true" />
          <p className="muted">{error}</p>
          <button type="button" className="ar-btn ghost sm" onClick={onRetry} data-flat>
            <RefreshCw aria-hidden="true" />{retryText}
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="panel hof-empty">
          <Award aria-hidden="true" />
          <p className="muted">{emptyText}</p>
        </div>
      ) : (
        <>
          {top[0] && <Legend entry={top[0]} place={1} />}
          {(top[1] || top[2]) && (
            <section style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}
              aria-label="Second and third of all time">
              {top[1] && <Legend entry={top[1]} place={2} />}
              {top[2] && <Legend entry={top[2]} place={3} />}
            </section>
          )}

          {rest.length > 0 && (
            <section className="panel tick" aria-label="The rest of the hall"
              style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              {rest.map((entry, index) => {
                const mine = entry.uid === myUid;
                return (
                  <div className={`hrow ${mine ? "me" : ""}`.trim()} key={entry.uid}>
                    <span className="pos" style={mine ? { color: "#C6FF33" } : undefined}>{index + 4}</span>
                    <Avatar name={entry.displayName} seed={entry.uid} size={40} radius={10} />
                    <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
                      <b style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {entry.displayName}
                        {mine && <span className="pill lime hrow-you" style={{ height: 18, padding: "0 6px", fontSize: 9.5 }}>You</span>}
                      </b>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <RankLabel tier={entry.highestRank} />
                        <span className="muted2">{record(entry)}</span>
                      </span>
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
