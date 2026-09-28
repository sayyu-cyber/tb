"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gamepad2, Users, Trophy, ArrowUpRight, ArrowRight, ChevronRight, ChevronDown,
  Lock, Clock, Calendar, Swords, Percent, Crown, Timer, Newspaper,
  KeyRound, Package, Shield, Award, Target, ShoppingBag, Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { useRankLock } from "@/hooks/useRankLock";
import { useSeasonInfo } from "@/hooks/useSeasonInfo";
import { useNews } from "@/hooks/useNews";
import { useRankProgress } from "@/hooks/useRankProgress";
import { RANK_CONFIGS, ALL_COSMETICS } from "@/data/cosmetics";
import { ArenaFace } from "@/components/game/ArenaCard";
import { CardBackArt, TableSwatch, RankHex, RankLabel, CoinGem } from "@/components/arena";

/**
 * Home on a phone held upright — design/arena/boards/MHome.dc.html,
 * design/arena/screens/phone/phone-01-home.jpg.
 *
 * The same ten sections as the wide screen, in the same order, recomposed
 * for 390px: the hero's four Tens fan behind the title instead of beside
 * it, the stats strip becomes a panel with a 3x2 grid of `.mstat` tiles,
 * Quick Play's two covers stack two-up with the loadout as a row under
 * them, and Latest Updates becomes a `.hs` side-scroller. Nothing is
 * dropped and nothing is added.
 *
 * Every figure is the account's own and comes from the same hooks the wide
 * screen reads, so the two can never say different things about the same
 * player.
 */

/** The hero's four Tens, in the board's order. */
const FAN: { suit: string; angle: number }[] = [
  { suit: "C", angle: -27 },
  { suit: "D", angle: -9 },
  { suit: "S", angle: 9 },
  { suit: "H", angle: 27 },
];

/** The board's cover fans. */
const MINDI_FAN = [-16, -2, 14];
const GIN_FAN = [
  { rank: "Q", suit: "S", angle: -16 },
  { rank: "Q", suit: "D", angle: -2 },
  { rank: "Q", suit: "C", angle: 14 },
];

const NAMES: Record<string, string> = Object.fromEntries(ALL_COSMETICS.map((item) => [item.id, item.name]));

/** The board's nine shortcuts, in its order - the same nine as the wide screen. */
const SHORTCUTS = [
  { href: "/friends", label: "Friends", Icon: Users },
  { href: "/play/mindi/room", label: "Private Rooms", Icon: KeyRound },
  { href: "/inventory", label: "Inventory", Icon: Package },
  { href: "/clubs", label: "Clubs", Icon: Shield },
  { href: "/shop?tab=vip", label: "VIP Pass", Icon: Crown },
  { href: "/hall-of-fame", label: "Hall of Fame", Icon: Award },
  { href: "/missions", label: "Missions", Icon: Target },
  { href: "/shop", label: "Cosmetic Shop", Icon: ShoppingBag },
  { href: "/settings", label: "Settings", Icon: Settings },
];

const NEWS_TONE: Record<string, string> = { announcement: "lime", event: "blue", update: "line" };

/** Days left in the season, as the board's "4 days / Season 9" tile. */
function daysLeft(endDate: Date | undefined) {
  if (!endDate) return null;
  const ms = endDate.getTime() - Date.now();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

export function PhoneHome({ mode, onMode }: { mode: "casual" | "ranked"; onMode: (next: "casual" | "ranked") => void }) {
  const router = useRouter();
  const { user, isGuest, playerStats } = useAuth();
  const { state } = useEconomy();
  const { friends } = useHomeSocial();
  const { isLocked, nextUnlockTime, isWeekendLeague } = useRankLock();
  const season = useSeasonInfo();
  const { news, loading: newsLoading } = useNews();
  const rank = useRankProgress();

  const equipped = state.profile.equipped;
  const config = RANK_CONFIGS.find((entry) => entry.tier === rank.tier);
  const colour = config?.color ?? "#E6C24A";
  const left = daysLeft(season?.endDate ?? undefined);
  const matches = playerStats?.totalMatches ?? 0;
  const wins = playerStats?.wins ?? 0;
  const winRate = matches > 0 ? `${Math.round((wins / matches) * 100)}%` : "—";

  // A guest has no online account to match with, so casual online falls back
  // to the AI table rather than a lobby that can never fill.
  const leg = mode === "ranked" ? "ranked" : `casual/${isGuest ? "ai" : "online"}`;
  const modeLabel = mode === "ranked" ? "Ranked Mode" : "Casual Mode";

  return (
    <div className="arena-mhome mpage">
      {/* ── The hero ─────────────────────────────────────────────────── */}
      <section className="mhero" aria-label="Welcome to Thaasbai">
        <div className="word" aria-hidden="true">MINDI</div>
        <div className="ring" aria-hidden="true" />
        <div className="fan" aria-hidden="true">
          {FAN.map(({ suit, angle }) => (
            <div key={suit} className="cardw" style={{ fontSize: "11px", width: "79.2px", height: "110.9px", ["--a" as string]: `${angle}deg` }}>
              <ArenaFace rank="10" suit={suit} ten />
            </div>
          ))}
        </div>
        <div style={{ position: "absolute", left: 20, right: 20, top: 22 }}>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>The Home of Maldivian Card Games</span>
          <h1 className="disp" style={{ margin: "14px 0 0", fontSize: 58, lineHeight: 0.86 }}>
            <span className="chrome">Thaasbai</span><span style={{ color: "#C6FF33" }}>.</span>
          </h1>
          <p className="disp" style={{ margin: "14px 0 0", fontSize: 15, letterSpacing: ".02em", lineHeight: 1.25 }}>
            Mindi. Gin Rummy. Real Players. Higher Ranks.
          </p>
          <p className="body" style={{ margin: "6px 0 0", fontSize: 13.5 }}>Play. Compete. Make Friends. Climb the Ranks.</p>
        </div>
        <div className="cta">
          <Link className="ar-btn" href={`/play/mindi/casual/${isGuest ? "ai" : "online"}`} data-flat>
            <Gamepad2 aria-hidden="true" />Play Now
          </Link>
          <Link className="ar-btn ghost" href="/friends" data-flat>
            <Users aria-hidden="true" />Find Friends
          </Link>
        </div>
      </section>

      {/* ── The league banner ────────────────────────────────────────── */}
      <Link className="mev" href="/tournament">
        <span className="ic" aria-hidden="true"><Trophy /></span>
        <span style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: 5 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <b className="disp" style={{ fontSize: 15 }}>Weekend League</b>
            {isWeekendLeague
              ? <span className="pill lime live" style={{ height: 20 }}>Live</span>
              : <span className="pill line" style={{ height: 20 }}>Fri – Sat</span>}
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35, color: "#C4C4CE" }}>
            {isWeekendLeague ? "Compete this weekend for double trophies." : "Opens Friday. Double trophies all weekend."}
          </span>
        </span>
        <ArrowUpRight aria-hidden="true" style={{ flex: "none", width: 18, height: 18, color: "#C6FF33" }} />
      </Link>

      {/* The board was drawn mid-league, so it shows the lock. In the app it
          appears only while ranked play really is locked. */}
      {isLocked && (
        <div className="mlock" role="status">
          <div className="r1">
            <Lock aria-hidden="true" />
            <b className="disp" style={{ fontSize: 13.5, letterSpacing: ".06em" }}>Ranks Locked</b>
            <span className="lbl" style={{ marginLeft: "auto", gap: 6, fontSize: 10, letterSpacing: ".14em" }}>
              <Clock aria-hidden="true" style={{ width: 14, height: 14, color: "#00BCC8" }} />
              {nextUnlockTime ? `Unlocks ${nextUnlockTime}` : "Unlocks Sunday"}
            </span>
          </div>
          <span className="muted" style={{ fontSize: 12.5, lineHeight: 1.4 }}>
            Weekend League is active. Ranked matches resume Sunday.
          </span>
        </div>
      )}

      {/* ── Your stats ───────────────────────────────────────────────── */}
      <section className="panel tick" aria-label="Your stats" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="av" aria-hidden="true" style={{ width: 52, height: 52, borderRadius: 13, fontSize: 23 }}>
            {rank.name.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <b className="disp" style={{ fontSize: 21, letterSpacing: ".02em" }}>{rank.name}</b>
            <RankLabel tier={rank.tier} />
          </div>
          <Link className="link" href="/profile" style={{ marginLeft: "auto" }}>
            Profile<ChevronRight aria-hidden="true" />
          </Link>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="lbl" style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: colour }}>{rank.tier} · {rank.trophies}</span>
            <span>{rank.nextTier ? `${rank.nextTier} · ${rank.ceiling}` : "Top tier"}</span>
          </div>
          <div
            className="meter seg"
            role="progressbar"
            aria-valuenow={rank.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={rank.nextTier ? `Progress to ${rank.nextTier}` : "Highest rank reached"}
          >
            <i style={{ width: `${rank.pct}%` }} />
          </div>
        </div>
        <div className="mstats">
          <div className="mstat"><Trophy aria-hidden="true" /><b>{rank.trophies}</b><span>Trophies</span></div>
          <div className="mstat"><Calendar aria-hidden="true" /><b>{matches}</b><span>Matches</span></div>
          <div className="mstat"><Swords aria-hidden="true" /><b>{wins}</b><span>Wins</span></div>
          <div className="mstat"><Percent aria-hidden="true" /><b>{winRate}</b><span>Win rate</span></div>
          <div className="mstat"><Users aria-hidden="true" /><b>{friends.length}</b><span>Friends</span></div>
          <div className="mstat">
            <Crown aria-hidden="true" style={{ color: "#00BCC8" }} />
            <b>{left === null ? "—" : `${left} ${left === 1 ? "day" : "days"}`}</b>
            <span>{season?.name ?? "Season"}</span>
          </div>
        </div>
      </section>

      {/* ── Quick Play ───────────────────────────────────────────────── */}
      <section className="sec" aria-label="Quick Play">
        <div className="sech">
          <div>
            <h2>Quick Play</h2>
            <p>Jump into a game or choose your mode.</p>
          </div>
          {/* The board draws `.select` as a decorative span. Here it wraps a
              real <select>, so the tray keeps the board's look and the
              control keeps the platform's own picker. */}
          <span className="select" style={{ height: 38, padding: "0 10px 0 12px", fontSize: 13 }}>
            <select value={mode} onChange={(event) => onMode(event.target.value as "casual" | "ranked")} aria-label="Mode">
              <option value="casual">All Modes</option>
              <option value="ranked">Ranked Mode</option>
            </select>
            <ChevronDown aria-hidden="true" />
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          <button
            type="button"
            className="cover mindi"
            aria-label={`Play Mindi, ${modeLabel.toLowerCase()}`}
            onClick={() => router.push(`/play/mindi/${leg}`)}
            data-flat
          >
            <span className="pill lime ribbon">{mode === "ranked" ? "Ranked" : "Casual"}</span>
            <span className="go" aria-hidden="true"><ArrowRight /></span>
            <div className="cfan" aria-hidden="true">
              {/* The board fans two Arena backs. Showing the back the player
                  has equipped makes the cover their deck, not someone else's. */}
              <CardBackArt id={equipped.cardBack} width={57.6} style={{ ["--a" as string]: `${MINDI_FAN[0]}deg` }} />
              <CardBackArt id={equipped.cardBack} width={57.6} style={{ ["--a" as string]: `${MINDI_FAN[1]}deg` }} />
              <div className="cardw" style={{ fontSize: "8px", width: "57.6px", height: "80.6px", ["--a" as string]: `${MINDI_FAN[2]}deg` }}>
                <ArenaFace rank="10" suit="S" ten />
              </div>
            </div>
            <span className="meta">
              <b>Mindi</b>
              <span lang="dv" dir="rtl" className="thaana" style={{ alignSelf: "flex-start" }}>މިންޑި</span>
              <span className="mm"><Users aria-hidden="true" />2-4 · {modeLabel}</span>
            </span>
          </button>

          <button
            type="button"
            className="cover gin"
            aria-label={`Play Gin Rummy, ${modeLabel.toLowerCase()}`}
            onClick={() => router.push(`/play/gin-rummy/${leg}`)}
            data-flat
          >
            <span className="pill lime ribbon">{mode === "ranked" ? "Ranked" : "Casual"}</span>
            <span className="go" aria-hidden="true"><ArrowRight /></span>
            <div className="cfan" aria-hidden="true">
              {GIN_FAN.map(({ rank: face, suit, angle }) => (
                <div key={suit} className="cardw" style={{ fontSize: "8px", width: "57.6px", height: "80.6px", ["--a" as string]: `${angle}deg` }}>
                  <ArenaFace rank={face} suit={suit} />
                </div>
              ))}
            </div>
            <span className="meta">
              <b>Gin Rummy</b>
              <span lang="dv" dir="rtl" className="thaana" style={{ alignSelf: "flex-start" }}>ޖިން ރަމީ</span>
              <span className="mm"><Users aria-hidden="true" />2 · {modeLabel}</span>
            </span>
          </button>
        </div>

        <Link
          className="panel"
          href="/inventory"
          style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 14px 14px 16px", textDecoration: "none", color: "#fff" }}
        >
          <CardBackArt id={equipped.cardBack} width={50.4} />
          <TableSwatch id={equipped.tableTheme} width={74} height={48} />
          <span style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 7 }}>
            <span className="pill blue" style={{ alignSelf: "flex-start", height: 20 }}>Equipped</span>
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span className="muted2">Card back</span>
              <b style={{ fontSize: 13 }}>{NAMES[equipped.cardBack] ?? "Arena"}</b>
            </span>
            <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <span className="muted2">Table</span>
              <b style={{ fontSize: 13 }}>{NAMES[equipped.tableTheme] ?? "Neon Arena"}</b>
            </span>
          </span>
          <ChevronRight aria-hidden="true" style={{ flex: "none", width: 18, height: 18, color: "#00BCC8" }} />
        </Link>
      </section>

      {/* ── Current Rank ─────────────────────────────────────────────── */}
      <section className="panel tick" aria-label="Current Rank" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <span className="lbl dash">Current Rank</span>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <RankHex tier={rank.tier} width={54} height={61}>
            <Crown style={{ width: 25, height: 25 }} />
          </RankHex>
          <div>
            <b className="disp" style={{ fontSize: 30, color: colour }}>{rank.tier}</b>
            <div className="muted" style={{ marginTop: 6 }}>
              <b className="num" style={{ fontSize: 17, color: "#fff" }}>{rank.trophies}</b> trophies
            </div>
          </div>
          <span className="muted" style={{ marginLeft: "auto", textAlign: "right", lineHeight: 1.35 }}>
            {rank.nextTier
              ? <><b style={{ color: "#C6FF33" }}>{rank.remaining} {rank.remaining === 1 ? "trophy" : "trophies"}</b><br />to {rank.nextTier}</>
              : <>Top tier</>}
          </span>
        </div>
        <div className="meter seg" role="progressbar" aria-valuenow={rank.pct} aria-valuemin={0} aria-valuemax={100}
             aria-label={rank.nextTier ? `Progress to ${rank.nextTier}` : "Highest rank reached"}>
          <i style={{ width: `${rank.pct}%` }} />
        </div>
        <div className="divider" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="lbl">Weekly reward</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 17 }}>
            <CoinGem small />{config?.weeklyReward ?? 50}
          </span>
        </div>
        <span className="muted2" style={{ marginTop: -6 }}>Paid by rank tier, every Thursday night.</span>
      </section>

      {/* ── Weekend League ───────────────────────────────────────────── */}
      <section className="panel tick b" aria-label="Weekend League" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
        <div
          aria-hidden="true"
          style={{ position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,188,200,.4), rgba(0,188,200,0))" }}
        />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span className="lbl dash" style={{ color: "#8AF0F5" }}>
            <Timer aria-hidden="true" style={{ width: 15, height: 15 }} />Weekend League
          </span>
          {isWeekendLeague ? <span className="pill lime live">Live</span> : <span className="pill line">Fri – Sat</span>}
        </div>
        <b className="disp" style={{ position: "relative", fontSize: 30, lineHeight: 0.95 }}>Double trophies</b>
        <span className="muted" style={{ position: "relative" }}>Double trophies during Weekend League</span>
        <div style={{ position: "relative", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className="pill line">Silver and up</span>
          <span className="pill line">Win +10</span>
          <span className="pill line">Loss −4</span>
        </div>
        <Link className="ar-btn blue sm full" href="/tournament" style={{ position: "relative", marginTop: 4 }} data-flat>
          Enter League<ArrowRight aria-hidden="true" />
        </Link>
      </section>

      {/* ── Shortcuts ────────────────────────────────────────────────── */}
      <nav className="panel" aria-label="Quick access" style={{ padding: 12, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        {SHORTCUTS.map(({ href, label, Icon }) => (
          <Link className="sc" href={href} key={label}>
            <Icon aria-hidden="true" />{label}
          </Link>
        ))}
      </nav>

      {/* ── Latest Updates ───────────────────────────────────────────── */}
      {!newsLoading && news.length > 0 && (
        <section className="sec" aria-label="Latest Updates">
          <div className="sech">
            <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Newspaper aria-hidden="true" style={{ width: 19, height: 19, color: "#00BCC8" }} />
              Latest Updates
            </h2>
          </div>
          <div className="hs">
            {news.slice(0, 3).map((item) => (
              <article className="news" key={item.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={`pill ${NEWS_TONE[String(item.type).toLowerCase()] ?? "line"}`}>{item.type}</span>
                  <span className="lbl">{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.content}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,.08)" }}>
        <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <b className="disp chrome" style={{ fontSize: 17 }}>Thaasbai</b>
          <span style={{ display: "flex", gap: 18 }}>
            <Link className="link b" href="/settings">Settings</Link>
            <Link className="link b" href="/friends">Community</Link>
          </span>
        </span>
        <span className="muted2">© {new Date().getFullYear()} Play Fair. Good Games. Greater Friends.</span>
      </footer>
    </div>
  );
}
