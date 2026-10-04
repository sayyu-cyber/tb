"use client";

import Link from "next/link";
import { ChevronRight, Plus, RefreshCw, Search, Users } from "lucide-react";
import { ClubDoc, MAX_MEMBERS } from "@/lib/clubs";
import { useTranslation } from "@/hooks/useTranslation";
import { ArenaSprite, Suit } from "@/components/game/ArenaSprite";
import { ClubHome } from "../ClubHome";

/**
 * Clubs on a phone - design/arena/boards/LClubs.dc.html (+ LClubsChat),
 * design/arena/screens/landscape/landscape-06 and 06b.
 *
 * My Club leads as the hero: the club's identity with its capacity meter
 * and vertical Members / Club Chat tabs, beside six members two by three,
 * or the chat (ClubHome, drawn `land`). Then the tagline with Create Club,
 * Browse / My Clubs with the search, and Suggested Clubs two by two. The
 * page scrolls; the rail and the top bar stay.
 *
 * ClubsClient owns the watchers, the join action and the create dialog and
 * passes them in, the same ones the wide screen uses.
 */

const SUITS = ["S", "H", "D", "C"] as const;
const TINTS = ["t1", "t2", "t3", "t4"] as const;

/** Stable index from a club id - the same crest ClubCard draws. */
function pick(id: string, size: number) {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(hash) % size;
}

export interface LandClubsProps {
  isGuest: boolean;
  uid: string;
  myName: string;
  mine: ClubDoc | null | undefined;
  listed: ClubDoc[];
  matches: ClubDoc[];
  query: string;
  onQuery: (next: string) => void;
  tab: "browse" | "mine";
  onTab: (next: "browse" | "mine") => void;
  ready: boolean;
  error: string;
  onRetry: () => void;
  expanded: boolean;
  onExpanded: (next: boolean) => void;
  pending: string;
  onJoin: (club: ClubDoc) => void;
  onCreate: () => void;
}

export function LandClubs(p: LandClubsProps) {
  const t = useTranslation();
  const needle = p.query.trim();
  const signedOut = p.isGuest || !p.uid;

  return (
    <div className="arena-land is-m is-land arena-lclubs">
      {/* The crests' suit symbols, hidden by the board's own .sprite rule. */}
      <ArenaSprite />
      <div className="mpage">
        {signedOut ? (
          <Placeholder title="Find your community" text="Sign in to join a club and chat with members.">
            <Link className="ar-btn sm" href="/login">Sign In</Link>
          </Placeholder>
        ) : p.ready && p.mine ? (
          <ClubHome club={p.mine} myUid={p.uid} myName={p.myName} land />
        ) : (
          // No board draws a player without a club; the hero's slot says so
          // and offers the two ways in.
          <Placeholder title={p.ready ? "Your next team starts here" : "Loading clubs..."}
            text={p.ready ? "You can belong to one club at a time. Join one below, or start your own." : undefined} />
        )}

        <div className="band">
          <p><span>Find your people. <i>Play together.</i> Build your legacy.</span></p>
          <button type="button" className="ar-btn sm" disabled={!p.ready || !!p.mine || signedOut} onClick={p.onCreate}>
            <Plus aria-hidden="true" />{t("clubs_createClub")}
          </button>
        </div>

        {!signedOut && (
          <section className="sec" aria-label="Browse clubs">
            <div className="dbar">
              <div className="tabs" role="group" aria-label="Club sections">
                <button type="button" aria-pressed={p.tab === "browse"} onClick={() => p.onTab("browse")} data-flat>{t("clubs_browse")}</button>
                <button type="button" aria-pressed={p.tab === "mine"} onClick={() => p.onTab("mine")} data-flat>My Clubs</button>
              </div>
              {p.tab === "browse" && (
                <label className="field">
                  <Search aria-hidden="true" />
                  <input value={p.query} onChange={(event) => p.onQuery(event.target.value)}
                    placeholder="Search clubs by name or tag..." aria-label="Search clubs by name or tag" />
                </label>
              )}
            </div>
            {p.tab === "browse" && (
              <div className="sech" style={{ marginTop: 6 }}>
                <div>
                  <h2>{needle ? "Search Results" : "Suggested Clubs"}</h2>
                  <p>{needle ? `${p.matches.length} clubs found` : "Discover the latest communities"}</p>
                </div>
                {!needle && p.matches.length > 4 && (
                  <button type="button" className="link" onClick={() => p.onExpanded(!p.expanded)} data-flat>
                    {p.expanded ? "Show Less" : "View All"}<ChevronRight aria-hidden="true" />
                  </button>
                )}
              </div>
            )}
            {p.error ? (
              <div role="alert" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span className="muted2" style={{ fontSize: 12.5 }}>{p.error}</span>
                <button type="button" className="link" onClick={p.onRetry} data-flat><RefreshCw aria-hidden="true" />Retry</button>
              </div>
            ) : !p.ready ? (
              <p className="muted2" style={{ margin: 0, fontSize: 12.5 }}>Loading clubs...</p>
            ) : p.listed.length === 0 ? (
              <Placeholder label="Clubs" title={p.tab === "mine" ? "You haven't joined a club yet." : needle ? "No clubs match your search." : "No clubs yet"}
                text="Try another search, or create a club of your own.">
                {needle
                  ? <button type="button" className="ar-btn ghost sm" onClick={() => p.onQuery("")}>Clear Search</button>
                  : p.tab === "mine"
                    ? <button type="button" className="ar-btn ghost sm" onClick={() => p.onTab("browse")}>Browse Clubs</button>
                    : null}
              </Placeholder>
            ) : (
              <div className="cols c2 stretch">
                {p.listed.map((club) => (
                  <Card key={club.id} club={club} hasClub={!!p.mine} isMine={p.mine?.id === club.id}
                    busy={p.pending === club.id} disabled={!!p.pending} onJoin={() => p.onJoin(club)} onOpen={() => p.onTab("mine")} />
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/** A club in the grid - the board's `.club`, with ClubCard's four button states. */
function Card({ club, hasClub, isMine, busy, disabled, onJoin, onOpen }: {
  club: ClubDoc; hasClub: boolean; isMine: boolean; busy: boolean; disabled: boolean; onJoin: () => void; onOpen: () => void;
}) {
  const t = useTranslation();
  const count = club.members.length;
  const full = count >= MAX_MEMBERS;
  const pct = Math.min(100, Math.round((count / MAX_MEMBERS) * 100));
  const suit = SUITS[pick(club.id, SUITS.length)];
  const tint = TINTS[pick(club.id + "t", TINTS.length)];
  return (
    <article className="club">
      <div className="h">
        <span className={`crest ${tint}`} aria-hidden="true"><Suit suit={suit} /></span>
        <div className="cnm"><span className="tag">[{club.tag}]</span><h3>{club.name}</h3></div>
      </div>
      <p>{club.description}</p>
      <div className="ft">
        <div className="cap">
          <span className="muted2 tnum">{count} / {MAX_MEMBERS} {t("clubs_members")}</span>
          {/* Lime once the club is full, blue while it is taking members. */}
          <div className={`meter thin ${full ? "" : "b"}`.trim()} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}
            aria-label={`${club.name} membership`} aria-valuetext={`${count} of ${MAX_MEMBERS} members`}>
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        {isMine ? (
          <button type="button" className="ar-btn sm" disabled={disabled || busy} onClick={onOpen}>
            Open Club<span className="sr-only"> - {club.name}</span>
          </button>
        ) : full ? (
          <button type="button" className="ar-btn sm" disabled>Full</button>
        ) : hasClub ? (
          <button type="button" className="ar-btn ghost sm" disabled>Already in a club</button>
        ) : (
          <button type="button" className="ar-btn ghost sm" disabled={disabled || busy} onClick={onJoin}>
            {busy ? "Joining..." : "Join Club"}<span className="sr-only"> - {club.name}</span>
          </button>
        )}
      </div>
    </article>
  );
}

function Placeholder({ title, text, label = "My club", children }: { title: string; text?: string; label?: string; children?: React.ReactNode }) {
  return (
    <section className="panel tick" aria-label={label}
      style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, minHeight: 160, padding: "20px 16px", textAlign: "center" }}>
      <Users aria-hidden="true" style={{ width: 34, height: 34, color: "#3A3A46" }} />
      <b className="disp" style={{ fontSize: 18, textTransform: "uppercase" }}>{title}</b>
      {text && <p className="muted2" style={{ margin: 0, maxWidth: "44ch", fontSize: 12.5 }}>{text}</p>}
      {children}
    </section>
  );
}
