"use client";

import Link from "next/link";
import { Plus, Search, Users, ChevronRight, RefreshCw } from "lucide-react";
import type { ClubDoc } from "@/lib/clubs";
import { ClubCard } from "../ClubCard";
import { ClubHome } from "../ClubHome";

/**
 * Clubs on a phone held upright — design/arena/boards/MClubs.dc.html,
 * design/arena/screens/phone/phone-06-clubs.jpg and phone-06b-clubs-chat.jpg.
 *
 * The wide screen puts the browse list on the left and your club on the
 * right. The board stacks them and reverses the order: your own club leads,
 * because it is the thing you came for, and Browse follows. Create moves up
 * beside the title as a small button and the strapline sits under it.
 *
 * The club panel itself is the wide screen's own ClubHome, drawn at the
 * board's smaller crest and name - it holds the chat subscription, the
 * member watcher and the kick/leave confirm, and none of those should exist
 * twice. Same for ClubCard, which already renders the board's `.club`.
 */
export function PhoneClubs({
  isGuest, uid, myName, mine, listed, matches, query, onQuery, tab, onTab,
  ready, error, onRetry, expanded, onExpanded, pending, onJoin, onCreate,
}: {
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
}) {
  const needle = query.trim();

  return (
    <div className="arena-phone arena-mclubs mpage">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div className="mh">
          <span className="lbl dash" style={{ color: "#C6FF33" }}>Thaasbai Community</span>
          <h1 className="disp chrome">Clubs</h1>
        </div>
        <button type="button" className="ar-btn sm" style={{ marginBottom: 2 }}
          disabled={!ready || !!mine || isGuest} onClick={onCreate} data-flat>
          <Plus aria-hidden="true" />Create
        </button>
      </div>
      <p className="sub" style={{ margin: "-6px 0 0", fontSize: 14 }}>
        Find your people. Play together. Build your legacy.
      </p>

      {isGuest || !uid ? (
        <section className="panel tick clubs-signin">
          <Users aria-hidden="true" />
          <h2 className="disp">Find your community</h2>
          <p className="muted">Sign in to join a club and chat with members.</p>
          <Link className="ar-btn sm" href="/login">Sign In</Link>
        </section>
      ) : (
        <>
          {ready && mine ? (
            <ClubHome club={mine} myUid={uid} myName={myName} compact />
          ) : (
            <section className="panel tick clubs-none">
              <Users aria-hidden="true" />
              <h2 className="disp">Your next team starts here</h2>
              <p className="muted">You can belong to one club at a time. Join one from the list, or start your own.</p>
              <button type="button" className="ar-btn sm" disabled={!ready} onClick={onCreate} data-flat>
                <Plus aria-hidden="true" />Create Club
              </button>
            </section>
          )}

          <section className="sec" aria-label="Browse clubs">
            <div className="tabs" role="group" aria-label="Club sections">
              <button type="button" aria-pressed={tab === "browse"} onClick={() => onTab("browse")} data-flat>Browse</button>
              <button type="button" aria-pressed={tab === "mine"} onClick={() => onTab("mine")} data-flat>My Clubs</button>
            </div>

            {tab === "browse" && (
              <>
                <label className="field">
                  <Search aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => onQuery(event.target.value)}
                    placeholder="Search clubs by name or tag..."
                    aria-label="Search clubs by name or tag"
                  />
                </label>
                <div className="sech" style={{ marginTop: 4 }}>
                  <div>
                    <h2>{needle ? "Search Results" : "Suggested Clubs"}</h2>
                    <p>{needle ? `${matches.length} clubs found` : "Discover the latest communities"}</p>
                  </div>
                  {!needle && matches.length > 4 && (
                    <button type="button" className="link" onClick={() => onExpanded(!expanded)} data-flat>
                      {expanded ? "Show Less" : "View All"}<ChevronRight aria-hidden="true" />
                    </button>
                  )}
                </div>
              </>
            )}

            {error ? (
              <div className="lockbar" role="alert">
                <span className="muted">{error}</span>
                <button type="button" className="link" onClick={onRetry} data-flat>
                  <RefreshCw aria-hidden="true" />Retry
                </button>
              </div>
            ) : !ready ? (
              <p className="muted">Loading clubs...</p>
            ) : listed.length === 0 ? (
              <div className="clubs-empty">
                <Users aria-hidden="true" />
                <h3 className="disp">
                  {tab === "mine" ? "You haven't joined a club yet."
                    : needle ? "No clubs match your search."
                    : "No clubs yet"}
                </h3>
                <p className="muted">Try another search, or create a club of your own.</p>
                {needle
                  ? <button type="button" className="ar-btn ghost sm" onClick={() => onQuery("")}>Clear Search</button>
                  : tab === "mine"
                    ? <button type="button" className="ar-btn ghost sm" onClick={() => onTab("browse")}>Browse Clubs</button>
                    : null}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {listed.map((club) => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    hasClub={!!mine}
                    isMine={mine?.id === club.id}
                    busy={pending === club.id}
                    disabled={!!pending}
                    onJoin={() => onJoin(club)}
                    onOpen={() => onTab("mine")}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
