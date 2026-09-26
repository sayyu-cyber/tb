"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, ArrowRight, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { ArenaFace } from "@/components/game/ArenaCard";
import { ALL_COSMETICS } from "@/data/cosmetics";
import { Pill, CardBackArt, TableSwatch } from "@/components/arena";

/**
 * Quick Play (design/arena/screens/app/app-01-home.jpg, middle).
 *
 * Two game covers and the equipped-loadout card. The covers are real
 * <button>s that start a match, as on the board; the loadout is a link to
 * the inventory.
 *
 * The board's Mindi cover fans two Arena backs and the Ten of Spades; the
 * Gin cover fans three Queens. Those are the board's own cards and stay as
 * drawn - they are the game's key art, not data.
 *
 * The board has a decorative "All Modes" select beside the heading. It is
 * kept, and it works: the app really does have a casual and a ranked pool
 * per game, so the choice changes where the covers send you.
 */

const NAMES: Record<string, string> = Object.fromEntries(ALL_COSMETICS.map((item) => [item.id, item.name]));

/** The board's fan angles, in its order. */
const MINDI_FAN = [-16, -2, 14];
const GIN_FAN = [
  { rank: "Q", suit: "S", angle: -16 },
  { rank: "Q", suit: "D", angle: -2 },
  { rank: "Q", suit: "C", angle: 14 },
];

function coverStyle(angle: number) {
  return { fontSize: "10px", width: "72px", height: "100.8px", ["--a" as string]: `${angle}deg` };
}

export function ArenaQuickPlay({ mode, onMode }: { mode: "casual" | "ranked"; onMode: (next: "casual" | "ranked") => void }) {
  const router = useRouter();
  const { isGuest } = useAuth();
  const { state } = useEconomy();
  const equipped = state.profile.equipped;

  // A guest has no online account to match with, so casual online falls
  // back to the AI table rather than a lobby that can never fill.
  const leg = mode === "ranked" ? "ranked" : `casual/${isGuest ? "ai" : "online"}`;
  const modeLabel = mode === "ranked" ? "Ranked Mode" : "Casual Mode";

  return (
    <section aria-label="Quick Play" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div className="ph">
        <div>
          <h2 className="disp" style={{ fontSize: "26px" }}>Quick Play</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>Jump into a game or choose your mode.</p>
        </div>
        {/* The board draws `.select` as a decorative span. Here it wraps a
            real <select>, so the tray keeps the board's look and the
            control keeps the platform's keyboard handling and picker. */}
        <div className="select">
          <select
            value={mode}
            onChange={(event) => onMode(event.target.value as "casual" | "ranked")}
            aria-label="Mode"
          >
            <option value="casual">Casual Mode</option>
            <option value="ranked">Ranked Mode</option>
          </select>
          <ChevronRight aria-hidden="true" style={{ transform: "rotate(90deg)" }} />
        </div>
      </div>

      <div className="quickplay">
        <button
          type="button"
          className="cover mindi"
          aria-label={`Play Mindi, ${modeLabel.toLowerCase()}`}
          onClick={() => router.push(`/play/mindi/${leg}`)}
          data-flat
        >
          <Pill tone="lime" className="ribbon">{modeLabel}</Pill>
          <div className="cfan" aria-hidden="true">
            {/* The board fans two Arena backs here. Showing the back the
                player has actually equipped makes the cover their deck
                rather than a picture of someone else's. */}
            <CardBackArt id={equipped.cardBack} width={72} style={fanStyle(MINDI_FAN[0])} />
            <CardBackArt id={equipped.cardBack} width={72} style={fanStyle(MINDI_FAN[1])} />
            <div className="cardw" style={coverStyle(MINDI_FAN[2])}>
              <ArenaFace rank="10" suit="S" ten />
            </div>
          </div>
          <span className="meta">
            <span className="gname">
              <b>Mindi</b>
              <span lang="dv" dir="rtl" className="thaana">މިންޑި</span>
            </span>
            <span><Users aria-hidden="true" />2-4 · {modeLabel}</span>
          </span>
          <span className="go"><ArrowRight aria-hidden="true" /></span>
        </button>

        <button
          type="button"
          className="cover gin"
          aria-label={`Play Gin Rummy, ${modeLabel.toLowerCase()}`}
          onClick={() => router.push(`/play/gin-rummy/${leg}`)}
          data-flat
        >
          <Pill tone="lime" className="ribbon">{modeLabel}</Pill>
          <div className="cfan" aria-hidden="true">
            {GIN_FAN.map(({ rank, suit, angle }) => (
              <div key={suit} className="cardw" style={coverStyle(angle)}>
                <ArenaFace rank={rank} suit={suit} />
              </div>
            ))}
          </div>
          <span className="meta">
            <span className="gname">
              <b>Gin Rummy</b>
              <span lang="dv" dir="rtl" className="thaana">ޖިން ރަމީ</span>
            </span>
            <span><Users aria-hidden="true" />2 · {modeLabel}</span>
          </span>
          <span className="go"><ArrowRight aria-hidden="true" /></span>
        </button>

        <Link
          className="panel loadout"
          href="/inventory"
          style={{
            flex: "none",
            width: "250px",
            padding: "18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            textDecoration: "none",
            color: "#fff",
          }}
        >
          <Pill tone="blue" className="self-start">Equipped</Pill>
          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginTop: "4px" }}>
            <CardBackArt id={equipped.cardBack} width={79} />
            <TableSwatch id={equipped.tableTheme} width={100} height={64} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "auto" }}>
            <span style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <span className="muted2">Card back</span>
              <b style={{ fontSize: "13.5px" }}>{NAMES[equipped.cardBack] ?? "Arena"}</b>
            </span>
            <span style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <span className="muted2">Table</span>
              <b style={{ fontSize: "13.5px" }}>{NAMES[equipped.tableTheme] ?? "Neon Arena"}</b>
            </span>
          </div>
          <span className="link b">
            Change loadout
            <ChevronRight aria-hidden="true" />
          </span>
        </Link>
      </div>
    </section>
  );
}

/** `.cfan .cb` reads its angle from --a, exactly as on the board. */
function fanStyle(angle: number) {
  return { ["--a" as string]: `${angle}deg` } as React.CSSProperties;
}
