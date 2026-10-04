"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Plus, Search, Users, RefreshCw, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ClubDoc, watchMyClub, watchClubList, joinClub } from "@/lib/clubs";
import { ArenaSprite } from "@/components/game/ArenaSprite";
import { ClubHome } from "./ClubHome";
import { ClubCard } from "./ClubCard";
import { CreateClubDialog } from "./CreateClubDialog";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { LandClubs } from "./land/LandClubs";

/**
 * Clubs — design/arena/screens/app/app-06-clubs.jpg, with the chat tab from
 * app-06b, built on the Clubs board.
 *
 * The board puts the browse grid and My Club side by side, so both are on
 * screen at once: you can see what your club is doing while looking at
 * others. The old screen made My Club a separate tab you had to leave
 * browse to reach.
 *
 * ArenaSprite mounts the suit symbols the club crests use.
 */
export function ClubsClient() {
  const { user, isGuest, playerStats } = useAuth();
  const { showToast } = useToast();
  const [clubs, setClubs] = useState<ClubDoc[]>([]);
  const [mine, setMine] = useState<ClubDoc | null>();
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [create, setCreate] = useState(false);
  const [pending, setPending] = useState("");
  const action = useRef(false);
  const uid = user?.uid ?? "";
  const phone = usePhoneLayout();

  useEffect(() => {
    setMine(undefined); setClubs([]); setLoaded(false); setError("");
    if (!uid || isGuest) return;
    const fail = () => setError("Couldn't load clubs. Please try again.");
    const stopMine = watchMyClub(uid, setMine, fail);
    const stopList = watchClubList(list => { setClubs(list); setLoaded(true); }, fail);
    return () => { stopMine(); stopList(); };
  }, [uid, isGuest, attempt]);

  async function join(club: ClubDoc) {
    if (action.current || mine || !uid || isGuest || mine === undefined) return;
    action.current = true; setPending(club.id);
    try {
      await joinClub(club.id, uid, user?.displayName ?? "Player", playerStats?.trophies ?? 0);
      showToast("Joined " + club.name + ".", "success");
    } catch {
      showToast("Failed to join club. Please try again.", "error");
    } finally { action.current = false; setPending(""); }
  }

  const ready = loaded && mine !== undefined && !error;
  const query = search.trim().toLocaleLowerCase();
  const matches = clubs.filter(club =>
    [club.name, club.tag, club.description].join(" ").toLocaleLowerCase().includes(query));
  const browse = expanded || query ? matches : matches.slice(0, 4);
  const listed = tab === "mine" ? (mine ? [mine] : []) : browse;

  const createDialog = create && (
    <CreateClubDialog
      uid={uid}
      playerName={user?.displayName ?? "Player"}
      trophies={playerStats?.trophies ?? 0}
      onClose={() => setCreate(false)}
      onCreated={() => { setCreate(false); setTab("mine"); }}
    />
  );

  /* A phone gets LClubs (design/arena/boards/LClubs.dc.html): your club as
     the hero, then browse. It picks in JavaScript rather than CSS because
     ClubHome holds the club chat subscription, the member watcher and the
     kick/leave confirm - mounting both compositions would double all three. */
  if (phone) return (
    <>
      <LandClubs
        isGuest={isGuest}
        uid={uid}
        myName={user?.displayName ?? "Player"}
        mine={mine}
        listed={listed}
        matches={matches}
        query={search}
        onQuery={setSearch}
        tab={tab}
        onTab={setTab}
        ready={ready}
        error={error}
        onRetry={() => setAttempt(v => v + 1)}
        expanded={expanded}
        onExpanded={setExpanded}
        pending={pending}
        onJoin={join}
        onCreate={() => setCreate(true)}
      />
      {createDialog}
    </>
  );

  return (
    <div className="arena-clubs ar-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <ArenaSprite />
      <div className="phead">
        <div>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>Thaasbai Community</span>
          <h1 className="disp chrome ar-h1">Clubs</h1>
          <p className="sub">Find your people. Play together. Build your legacy.</p>
        </div>
        <button type="button" className="ar-btn" disabled={!ready || !!mine || isGuest} onClick={() => setCreate(true)}>
          <Plus aria-hidden="true" />Create Club
        </button>
      </div>

      {isGuest || !uid ? (
        <section className="panel tick clubs-signin">
          <Users aria-hidden="true" />
          <h2 className="disp">Find your community</h2>
          <p className="muted">Sign in to join a club and chat with members.</p>
          <Link className="ar-btn sm" href="/login">Sign In</Link>
        </section>
      ) : (
        <div className="clubs-layout">
          <section style={{ display: "flex", flexDirection: "column", gap: "14px", minWidth: 0 }}>
            <div className="clubs-toolbar">
              <div className="tabs" role="group" aria-label="Club sections">
                <button type="button" aria-pressed={tab === "browse"} onClick={() => setTab("browse")} data-flat>
                  Browse
                </button>
                <button type="button" aria-pressed={tab === "mine"} onClick={() => setTab("mine")} data-flat>
                  My Clubs
                </button>
              </div>
              {tab === "browse" && (
                <label className="field clubs-search">
                  <Search aria-hidden="true" />
                  <input
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    placeholder="Search clubs by name or tag..."
                    aria-label="Search clubs by name or tag"
                  />
                </label>
              )}
            </div>

            {tab === "browse" && (
              <div className="ph">
                <div>
                  <h2>{query ? "Search Results" : "Suggested Clubs"}</h2>
                  <p className="muted2" style={{ margin: "6px 0 0" }}>
                    {query ? `${matches.length} clubs found` : "Discover the latest communities"}
                  </p>
                </div>
                {!query && matches.length > 4 && (
                  <button type="button" className="link" onClick={() => setExpanded(v => !v)} data-flat>
                    {expanded ? "Show Less" : "View All"}<ChevronRight aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            {error ? (
              <div className="lockbar" role="alert">
                <span className="muted">{error}</span>
                <button type="button" className="link" onClick={() => setAttempt(v => v + 1)} data-flat>
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
                    : query ? "No clubs match your search."
                    : "No clubs yet"}
                </h3>
                <p className="muted">Try another search, or create a club of your own.</p>
                {query
                  ? <button type="button" className="ar-btn ghost sm" onClick={() => setSearch("")}>Clear Search</button>
                  : tab === "mine"
                    ? <button type="button" className="ar-btn ghost sm" onClick={() => setTab("browse")}>Browse Clubs</button>
                    : null}
              </div>
            ) : (
              <div className="clubs-grid">
                {listed.map(club => (
                  <ClubCard
                    key={club.id}
                    club={club}
                    hasClub={!!mine}
                    isMine={mine?.id === club.id}
                    busy={pending === club.id}
                    disabled={!!pending}
                    onJoin={() => join(club)}
                    onOpen={() => setTab("mine")}
                  />
                ))}
              </div>
            )}
          </section>

          {ready && mine ? (
            <ClubHome club={mine} myUid={uid} myName={user?.displayName ?? "Player"} />
          ) : (
            <section className="panel tick clubs-none">
              <Users aria-hidden="true" />
              <h2 className="disp">Your next team starts here</h2>
              <p className="muted">You can belong to one club at a time. Join one from the list, or start your own.</p>
              <button type="button" className="ar-btn sm" disabled={!ready || isGuest} onClick={() => setCreate(true)}>
                <Plus aria-hidden="true" />Create Club
              </button>
            </section>
          )}
        </div>
      )}

      {createDialog}
    </div>
  );
}
