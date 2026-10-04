"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Gamepad2, Users, Trophy, ArrowUpRight, ArrowRight, ChevronRight, ChevronDown,
  Lock, Clock, Swords, Percent, Crown, Timer, Newspaper,
  KeyRound, Package, Shield, Award, Target, ShoppingBag, Settings,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useRankLock } from "@/hooks/useRankLock";
import { useNews } from "@/hooks/useNews";
import { useRankProgress } from "@/hooks/useRankProgress";
import { RANK_CONFIGS, ALL_COSMETICS } from "@/data/cosmetics";
import { ArenaFace } from "@/components/game/ArenaCard";
import { CardBackArt, TableSwatch, RankHex, RankLabel, CoinGem } from "@/components/arena";

/**
 * Home on a phone - design/arena/boards/LHome.dc.html,
 * design/arena/screens/landscape/landscape-01-home.jpg.
 *
 * The first 314px is one composition (`.cols.sideR.fit`): a 460px hero on
 * the left - the label, the title, the tagline, Play Now and Find Friends,
 * with the four Tens on the lit ring - and on the right the Weekend League
 * strip, the Ranks Locked strip and your card (rank meter, trophies, wins,
 * win rate). Below the fold: Quick Play three across (Mindi, Gin Rummy, what
 * you have equipped), Current Rank beside Weekend League, the shortcuts 3x3
 * beside three news items, and the footer.
 *
 * Every figure is the account's own and comes from the same hooks the wide
 * screen reads, so the two can never say different things about the same
 * player. The page scrolls; the rail and the top bar stay.
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

export function LandHome({ mode, onMode }: { mode: "casual" | "ranked"; onMode: (next: "casual" | "ranked") => void }) {
  const router = useRouter();
  const { isGuest, playerStats } = useAuth();
  const { state } = useEconomy();
  const { isLocked, nextUnlockTime, isWeekendLeague } = useRankLock();
  const { news, loading: newsLoading } = useNews();
  const rank = useRankProgress();

  const equipped = state.profile.equipped;
  const config = RANK_CONFIGS.find((entry) => entry.tier === rank.tier);
  const colour = config?.color ?? "#E6C24A";
  const matches = playerStats?.totalMatches ?? 0;
  const wins = playerStats?.wins ?? 0;
  const winRate = matches > 0 ? `${Math.round((wins / matches) * 100)}%` : "—";

  // A guest has no online account to match with, so casual online falls back
  // to the AI table rather than a lobby that can never fill.
  const leg = mode === "ranked" ? "ranked" : `casual/${isGuest ? "ai" : "online"}`;
  const modeLabel = mode === "ranked" ? "Ranked Mode" : "Casual Mode";
  const progress = {
    role: "progressbar" as const,
    "aria-valuenow": rank.pct,
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-label": rank.nextTier ? `Progress to ${rank.nextTier}` : "Highest rank reached",
  };

  return (
    <div className="arena-land is-m is-land arena-lhome">
      <div className="mpage">
        <div className="cols sideR fit">
          <section className="lhero" aria-label="Welcome to Thaasbai">
            <div className="word" aria-hidden="true">MINDI</div>
            <div className="ring" aria-hidden="true" />
            <div className="fan" aria-hidden="true">
              {FAN.map(({ suit, angle }) => (
                <div key={suit} className="cardw" style={{ fontSize: "11px", width: "79.2px", height: "110.9px", ["--a" as string]: `${angle}deg` }}>
                  <ArenaFace rank="10" suit={suit} ten />
                </div>
              ))}
            </div>
            <div className="txt">
              <span className="lbl dash" style={{ color: "#C6FF33", fontSize: "9.5px" }}>The Home of Maldivian Card Games</span>
              <h1 className="disp" style={{ margin: "12px 0 0", fontSize: 50, lineHeight: 0.86 }}>
                <span className="chrome">Thaasbai</span><span style={{ color: "#C6FF33" }}>.</span>
              </h1>
              <p className="disp" style={{ margin: "12px 0 0", fontSize: 13.5, letterSpacing: ".02em", lineHeight: 1.25 }}>
                Mindi. Gin Rummy. Real Players. Higher Ranks.
              </p>
              <p className="body" style={{ margin: "5px 0 0", fontSize: 12.5 }}>Play. Compete. Make Friends. Climb the Ranks.</p>
            </div>
            <div className="cta">
              <Link className="ar-btn" href={`/play/mindi/casual/${isGuest ? "ai" : "online"}`}>
                <Gamepad2 aria-hidden="true" />Play Now
              </Link>
              <Link className="ar-btn ghost sm" href="/friends">
                <Users aria-hidden="true" />Find Friends
              </Link>
            </div>
          </section>

          <div className="stk">
            <Link className="mev" href="/tournament">
              <span className="ic" aria-hidden="true"><Trophy /></span>
              <span style={{ flex: "1 1 0", display: "flex", flexDirection: "column", gap: 5 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <b className="disp" style={{ fontSize: 13, whiteSpace: "nowrap" }}>Weekend League</b>
                  {isWeekendLeague
                    ? <span className="pill lime live" style={{ height: 18, padding: "0 7px", fontSize: 9 }}>Live</span>
                    : <span className="pill line" style={{ height: 18, padding: "0 7px", fontSize: 9 }}>Fri – Sat</span>}
                </span>
                <span style={{ fontSize: 11.5, fontWeight: 500, lineHeight: 1.3, color: "#C4C4CE" }}>
                  {isWeekendLeague ? "Double trophies this weekend." : "Opens Friday. Double trophies all weekend."}
                </span>
              </span>
              <ArrowUpRight aria-hidden="true" style={{ flex: "none", width: 15, height: 15, color: "#C6FF33" }} />
            </Link>
            {/* The board was drawn mid-league, so it shows the lock. In the
                app it appears only while ranked play really is locked. */}
            {isLocked && (
              <div className="mlock" role="status">
                <div className="r1">
                  <Lock aria-hidden="true" />
                  <b className="disp" style={{ fontSize: 12.5, letterSpacing: ".06em" }}>Ranks Locked</b>
                  <span className="lbl" style={{ marginLeft: "auto", gap: 5, fontSize: 9, letterSpacing: ".12em" }}>
                    <Clock aria-hidden="true" style={{ width: 13, height: 13, color: "#00BCC8" }} />{nextUnlockTime || "Sunday"}
                  </span>
                </div>
                <span className="muted" style={{ fontSize: 11.5, lineHeight: 1.35 }}>Ranked matches resume Sunday.</span>
              </div>
            )}
            <section className="panel tick" aria-label="Your stats" style={{ padding: 12, display: "flex", flexDirection: "column", gap: 9, flex: "1 1 0", minHeight: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                <div className="av" aria-hidden="true" style={{ width: 40, height: 40, borderRadius: 11, fontSize: 18 }}>
                  {rank.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <b className="disp" style={{ fontSize: 17, letterSpacing: ".02em" }}>{rank.name}</b>
                  <RankLabel tier={rank.tier} />
                </div>
                <Link className="link" href="/profile" style={{ marginLeft: "auto" }}>Profile<ChevronRight aria-hidden="true" /></Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }} className="lbl">
                  <span style={{ color: colour }}>{rank.tier} · {rank.trophies}</span>
                  <span>{rank.nextTier ? `${rank.nextTier} · ${rank.ceiling}` : "Top tier"}</span>
                </div>
                <div className="meter seg" {...progress}><i style={{ width: `${rank.pct}%` }} /></div>
              </div>
              <div className="cols c3" style={{ gap: 7, marginTop: "auto" }}>
                <div className="lstat" style={{ padding: "9px 10px" }}><Trophy aria-hidden="true" /><b style={{ fontSize: 19 }}>{rank.trophies}</b><span>Trophies</span></div>
                <div className="lstat" style={{ padding: "9px 10px" }}><Swords aria-hidden="true" /><b style={{ fontSize: 19 }}>{wins}</b><span>Wins</span></div>
                <div className="lstat" style={{ padding: "9px 10px" }}><Percent aria-hidden="true" /><b style={{ fontSize: 19 }}>{winRate}</b><span>Win rate</span></div>
              </div>
            </section>
          </div>
        </div>

        <section className="sec" aria-label="Quick Play">
          <div className="sech">
            <div><h2>Quick Play</h2><p>Jump into a game or choose your mode.</p></div>
            {/* The board draws `.select` as a decorative span. Here it wraps a
                real <select>, so the tray keeps the board's look and the
                control keeps the platform's own picker. */}
            <span className="select" style={{ height: 36, padding: "0 10px 0 12px", fontSize: 13 }}>
              <select value={mode} onChange={(event) => onMode(event.target.value as "casual" | "ranked")} aria-label="Select Mode">
                <option value="casual">All Modes</option>
                <option value="ranked">Ranked Mode</option>
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </div>
          <div className="cols c3 stretch">
            <button type="button" className="cover mindi" aria-label={`Play Mindi, ${modeLabel.toLowerCase()}`}
              onClick={() => router.push(`/play/mindi/${leg}`)} data-flat>
              <span className="pill lime ribbon">{mode === "ranked" ? "Ranked" : "Casual"}</span>
              <span className="go" aria-hidden="true"><ArrowRight /></span>
              <div className="cfan" aria-hidden="true">
                {/* The board fans two Arena backs. Showing the back the player
                    has equipped makes the cover their deck. */}
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
            <button type="button" className="cover gin" aria-label={`Play Gin Rummy, ${modeLabel.toLowerCase()}`}
              onClick={() => router.push(`/play/gin-rummy/${leg}`)} data-flat>
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
            <Link className="panel" href="/inventory"
              style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 12, padding: 14, textDecoration: "none", color: "#fff" }}>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className="pill blue" style={{ height: 20 }}>Equipped</span>
                <ChevronRight aria-hidden="true" style={{ width: 17, height: 17, color: "#00BCC8" }} />
              </span>
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                <CardBackArt id={equipped.cardBack} width={57.6} />
                <TableSwatch id={equipped.tableTheme} width={84} height={54} />
              </span>
              <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className="muted2">Card back</span><b style={{ fontSize: 13 }}>{NAMES[equipped.cardBack] ?? "Arena"}</b>
                </span>
                <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <span className="muted2">Table</span><b style={{ fontSize: 13 }}>{NAMES[equipped.tableTheme] ?? "Neon Arena"}</b>
                </span>
              </span>
            </Link>
          </div>
        </section>

        <div className="cols c2 stretch">
          <section className="panel tick" aria-label="Current Rank" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12 }}>
            <span className="lbl dash">Current Rank</span>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <RankHex tier={rank.tier} width={50} height={57}><Crown style={{ width: 23, height: 23 }} /></RankHex>
              <div>
                <b className="disp" style={{ fontSize: 28, color: colour }}>{rank.tier}</b>
                <div className="muted" style={{ marginTop: 6 }}><b className="num" style={{ fontSize: 16, color: "#fff" }}>{rank.trophies}</b> trophies</div>
              </div>
              <span className="muted" style={{ marginLeft: "auto", textAlign: "right", lineHeight: 1.35 }}>
                {rank.nextTier
                  ? <><b style={{ color: "#C6FF33" }}>{rank.remaining} {rank.remaining === 1 ? "trophy" : "trophies"}</b><br />to {rank.nextTier}</>
                  : <>Top tier</>}
              </span>
            </div>
            <div className="meter seg" {...progress}><i style={{ width: `${rank.pct}%` }} /></div>
            <div className="divider" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="lbl">Weekly reward</span>
              <span style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-display), sans-serif", fontWeight: 700, fontSize: 16 }}>
                <CoinGem small />{config?.weeklyReward ?? 50}
              </span>
            </div>
            <span className="muted2" style={{ marginTop: -4 }}>Paid by rank tier, every Thursday night.</span>
          </section>
          <section className="panel tick b" aria-label="Weekend League" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 11, overflow: "hidden" }}>
            <div aria-hidden="true" style={{ position: "absolute", right: -50, top: -50, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(closest-side, rgba(0,188,200,.4), rgba(0,188,200,0))" }} />
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span className="lbl dash" style={{ color: "#8AF0F5" }}><Timer aria-hidden="true" style={{ width: 14, height: 14 }} />Weekend League</span>
              {isWeekendLeague ? <span className="pill lime live">Live</span> : <span className="pill line">Fri – Sat</span>}
            </div>
            <b className="disp" style={{ position: "relative", fontSize: 28, lineHeight: 0.95 }}>Double trophies</b>
            <span className="muted" style={{ position: "relative" }}>Double trophies during Weekend League</span>
            <div style={{ position: "relative", display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span className="pill line">Silver and up</span><span className="pill line">Win +10</span><span className="pill line">Loss −4</span>
            </div>
            <Link className="ar-btn blue sm" href="/tournament" style={{ position: "relative", marginTop: "auto" }}>
              Enter League<ArrowRight aria-hidden="true" />
            </Link>
          </section>
        </div>

        <div className="cols sideL2 stretch">
          <nav className="panel" aria-label="Quick access"
            style={{ padding: 10, display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gridTemplateRows: "repeat(3, minmax(0, 1fr))", gap: 7 }}>
            {SHORTCUTS.map(({ href, label, Icon }) => (
              <Link className="ltile" href={href} key={label}><Icon aria-hidden="true" />{label}</Link>
            ))}
          </nav>
          <section className="sec" aria-label="Latest Updates" style={{ gap: 10 }}>
            <div className="sech">
              <h2 style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Newspaper aria-hidden="true" style={{ width: 18, height: 18, color: "#00BCC8" }} />Latest Updates
              </h2>
            </div>
            {!newsLoading && news.slice(0, 3).map((item) => (
              <article className="news" key={item.id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className={`pill ${NEWS_TONE[String(item.type).toLowerCase()] ?? "line"}`}>{item.type}</span>
                  <span className="lbl">{new Date(item.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                </div>
                <h3>{item.title}</h3>
                <p>{item.content}</p>
              </article>
            ))}
          </section>
        </div>

        <footer style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 14, borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <b className="disp chrome" style={{ fontSize: 16 }}>Thaasbai</b>
            <span className="muted2">© {new Date().getFullYear()} Play Fair. Good Games. Greater Friends.</span>
          </span>
          <span style={{ display: "flex", gap: 18 }}>
            <Link className="link b" href="/settings">Settings</Link>
            <Link className="link b" href="/friends">Community</Link>
          </span>
        </footer>
      </div>
    </div>
  );
}
