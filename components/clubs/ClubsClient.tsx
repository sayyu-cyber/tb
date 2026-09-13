"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Plus, Search, Users, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ClubDoc, watchMyClub, watchClubList, joinClub } from "@/lib/clubs";
import { Button } from "@/components/ui/Button";
import { LobbyPhoto } from "@/components/home/LobbyPhoto";
import { ClubHome } from "./ClubHome";
import { ClubCard } from "./ClubCard";
import { CreateClubDialog } from "./CreateClubDialog";

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
  const [detail, setDetail] = useState(false);
  const [pending, setPending] = useState("");
  const action = useRef(false);
  const uid = user?.uid ?? "";

  useEffect(() => {
    setMine(undefined); setClubs([]); setLoaded(false); setError(""); setDetail(false);
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
      setTab("mine"); setDetail(true);
    } catch {
      showToast("Failed to join club. Please try again.", "error");
    } finally { action.current = false; setPending(""); }
  }

  const ready = loaded && mine !== undefined && !error;
  const query = search.trim().toLocaleLowerCase();
  const matches = clubs.filter(c => [c.name, c.tag, c.description].join(" ").toLocaleLowerCase().includes(query));
  const visible = expanded || query ? matches : matches.slice(0, 4);
  const card = (club: ClubDoc) => <ClubCard key={club.id} club={club} uid={uid} hasClub={!!mine}
    busy={pending === club.id} disabled={!!pending} onJoin={() => join(club)}
    onOpen={() => { setTab("mine"); setDetail(true); }} />;

  return <div className="clubs-hub">
    <header className="clubs-hero">
      <LobbyPhoto className="absolute inset-0" />
      <div className="clubs-hero-copy"><span className="clubs-eyebrow">THAASBAI COMMUNITY</span>
        <h1><Users aria-hidden="true" /> Clubs</h1>
        <p>Find your people. Play together. Build your legacy.</p>
        <Button disabled={!ready || !!mine || isGuest} onClick={() => setCreate(true)}><Plus size={18} /> Create Club</Button>
      </div>
    </header>
    {isGuest || !uid ? <div className="clubs-empty"><Users /><h2>Find your community</h2><p>Sign in to join a club and chat with members.</p><Link href="/login">Sign In</Link></div> : <>
      <div className="clubs-tools">
        <div role="tablist" aria-label="Club sections" className="clubs-tabs">
          {(["browse", "mine"] as const).map((value, index) => <button key={value} role="tab" id={"club-tab-" + value}
            aria-controls="club-panel" aria-selected={tab === value} tabIndex={tab === value ? 0 : -1}
            onKeyDown={e => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
              e.preventDefault(); const next = e.key === "Home" ? "browse" : e.key === "End" ? "mine" : index ? "browse" : "mine";
              setTab(next); setDetail(false); document.getElementById("club-tab-" + next)?.focus();
            } }} onClick={() => { setTab(value); setDetail(false); }}>
            {value === "browse" ? <Compass size={18} /> : <Users size={18} />}{value === "browse" ? "Browse" : "My Clubs"}
          </button>)}
        </div>
        {tab === "browse" && <label className="clubs-search"><Search size={18} /><input aria-label="Search clubs" placeholder="Search clubs by name or tag..." value={search} onChange={e => setSearch(e.target.value)} /></label>}
      </div>
      <div id="club-panel" role="tabpanel" aria-labelledby={"club-tab-" + tab}>
        {error ? <div className="clubs-empty" role="alert"><p>{error}</p><Button variant="secondary" onClick={() => setAttempt(v => v + 1)}><RefreshCw size={16} /> Retry</Button></div>
        : !ready ? <div className="clubs-grid" aria-label="Loading clubs" aria-busy="true">{[0,1,2,3].map(i => <div className="club-skeleton" key={i} />)}</div>
        : tab === "mine" && detail && mine ? <><Button variant="ghost" onClick={() => setDetail(false)}><ArrowLeft size={16} /> My Clubs</Button><ClubHome club={mine} myUid={uid} myName={user?.displayName ?? "Player"} /></>
        : tab === "mine" ? <section><h2>My Clubs</h2>{mine ? <div className="clubs-grid clubs-owned">{card(mine)}</div> : <div className="clubs-empty"><Users /><h3>You haven&apos;t joined a club yet.</h3><Button variant="secondary" onClick={() => setTab("browse")}>Browse Clubs</Button></div>}</section>
        : <>
          <section><div className="clubs-section-title"><div><h2>{query ? "Search Results" : "Suggested Clubs"}</h2><p>{query ? matches.length + " clubs found" : "Discover the latest communities"}</p></div>
            {!query && matches.length > 4 && <Button variant="ghost" onClick={() => setExpanded(v => !v)}>{expanded ? "Show Less" : "View All"}</Button>}</div>
            {visible.length ? <div className="clubs-grid">{visible.map(card)}</div> : <div className="clubs-empty"><Users /><h3>{query ? "No clubs match your search." : "No clubs found"}</h3><p>Try another search or create a club of your own.</p>{query && <Button variant="secondary" onClick={() => setSearch("")}>Clear Search</Button>}</div>}
          </section>
          <section className="clubs-mine"><h2>My Clubs</h2>{mine ? <div className="clubs-grid clubs-owned">{card(mine)}</div> : <div className="clubs-membership"><Users size={24} /><div><h3>Your next team starts here.</h3><p>You can belong to one club at a time.</p></div><Button onClick={() => setCreate(true)}><Plus size={16} /> Create Club</Button></div>}</section>
        </>}
      </div>
      {create && <CreateClubDialog uid={uid} playerName={user?.displayName ?? "Player"} trophies={playerStats?.trophies ?? 0}
        onClose={() => setCreate(false)} onCreated={() => { setCreate(false); setTab("mine"); setDetail(true); }} />}
    </>}
  </div>;
}
