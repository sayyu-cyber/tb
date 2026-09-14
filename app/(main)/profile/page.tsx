"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, Copy, Grid2X2, Medal, Pencil, Settings, Trophy, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useToast } from "@/contexts/ToastContext";
import { RankBadge } from "@/components/ui/RankBadge";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { LobbyPhoto } from "@/components/home/LobbyPhoto";
import { getAvatarPreset, getBannerPreset } from "@/constants/profileCustomization";
import { resolveAchievements } from "@/lib/achievements";
import { auth } from "@/lib/firebase";
import { getProfileHistory, ProfileMatch } from "@/lib/profileHistory";
import { AchievementsPreview, ProfileGameStats, ProfileHistory, ProfileMilestones, ProfileSkeleton, ProfileStatsGrid, metric } from "@/components/profile/ProfileSections";

export default function ProfilePage() {
  const { user, playerStats, profileLoading, profileError, retryProfile } = useAuth();
  const { state } = useEconomy();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState("overview");
  const [history, setHistory] = useState<ProfileMatch[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const [admin, setAdmin] = useState(false);
  const uid = user?.uid;
  useEffect(() => {
    let active = true;
    setAdmin(false);
    const current = auth.currentUser;
    if (current && current.uid === uid) current.getIdTokenResult().then(token => {
      if (active) setAdmin(token.claims.admin === true || token.claims.role === "admin");
    }).catch(() => {});
    return () => { active = false; };
  }, [uid]);
  useEffect(() => {
    if (!uid) return;
    let active = true;
    setHistory(null); setHistoryError(false);
    getProfileHistory(uid).then(records => { if (active) setHistory(records); }).catch(() => { if (active) setHistoryError(true); });
    return () => { active = false; };
  }, [uid, attempt]);
  useEffect(() => setPhotoFailed(false), [user?.photoURL]);
  if (!user) return <ProfileSkeleton />;
  const avatar = getAvatarPreset(playerStats?.avatarPreset), banner = getBannerPreset(playerStats?.bannerPreset);
  const achievements = resolveAchievements(state.achievements, { matchesWon: state.profile.stats.matchesWon, highestRank: state.profile.stats.highestRank, weekendChampion: state.profile.stats.weekendChampion, collection: state.profile.collection });
  async function copyId() {
    if (!playerStats?.playerCode) return;
    try { await navigator.clipboard.writeText(playerStats.playerCode); showToast("User ID copied.", "success"); }
    catch { showToast("Couldn't copy User ID.", "error"); }
  }
  return <div className="player-profile">
    <header className="profile-page-header"><div className="profile-heading"><User /><div><h1>Profile</h1><p>Your stats &amp; achievements</p></div></div>
      <nav className="profile-tabs" aria-label="Profile sections">
        <button aria-current={tab === "overview" ? "page" : undefined} onClick={() => setTab("overview")}><Grid2X2 /> Overview</button>
        <button aria-current={tab === "stats" ? "page" : undefined} onClick={() => setTab("stats")}><Trophy /> Game Stats</button>
        <Link href="/achievements/"><Medal /> Achievements</Link>
        <button aria-current={tab === "history" ? "page" : undefined} onClick={() => setTab("history")}><Clock3 /> History</button>
        <Link href="/settings/"><Settings /> Settings</Link>
      </nav>
    </header>
    <section className="profile-hero" aria-label="Player identity">
      <LobbyPhoto className="absolute inset-0" />
      <div className={`profile-banner-tint bg-gradient-to-r ${banner.gradient}`} aria-hidden="true" />
      <button className="profile-edit" onClick={() => setEditing(true)}><Pencil size={16} /> Edit Profile</button>
      <div className="profile-identity"><div className="profile-avatar-wrap"><div className={`profile-avatar bg-gradient-to-br ${avatar.gradient}`}>
        {user.photoURL && !photoFailed ? <img src={user.photoURL} alt={user.displayName || "Your avatar"} onError={() => setPhotoFailed(true)} /> : <span aria-label="Avatar initial">{(user.displayName || "Player").charAt(0).toUpperCase()}</span>}
      </div>{playerStats?.currentRank && <RankBadge rank={playerStats.currentRank} />}</div>
      <div className="profile-identity-copy"><h2>{user.displayName || "Player"} {admin && <span className="profile-admin">ADMIN</span>}</h2>{user.email && <p className="profile-email">{user.email}</p>}
        {playerStats?.playerCode && <button className="profile-code" title="Copy ID" aria-label="Copy User ID" onClick={copyId}><span>ID</span><strong>{playerStats.playerCode}</strong><Copy size={14} /></button>}
        <div className="profile-identity-meta"><span><Trophy /><strong>{metric(playerStats?.trophies)}</strong> trophies</span>{Number.isFinite(user.createdAt?.getTime()) && <span><CalendarDays /><span>Member since<strong>{user.createdAt.toLocaleDateString(undefined, { month: "short", year: "numeric" })}</strong></span></span>}</div>
      </div></div>
    </section>
    {profileError && <div className="profile-error" role="alert">Couldn&apos;t load your profile statistics. <button onClick={retryProfile}>Retry</button></div>}
    {profileLoading ? <ProfileSkeleton /> : <>
      {tab !== "history" && <ProfileStatsGrid stats={playerStats} />}
      {historyError && <div className="profile-error" role="alert">Game statistics and history unavailable. <button onClick={() => setAttempt(value => value + 1)}>Retry</button></div>}
      {tab !== "history" && <ProfileGameStats history={history} onHistory={() => setTab("history")} />}
      {tab === "overview" && <><AchievementsPreview achievements={achievements} /><ProfileMilestones stats={playerStats} /></>}
      {(tab === "history" || tab === "stats") && (history ? <ProfileHistory records={history} /> : !historyError && <ProfileSkeleton />)}
    </>}
    {editing && <EditProfileModal isOpen onClose={() => setEditing(false)} currentName={user.displayName || ""} currentAvatar={playerStats?.avatarPreset} currentBanner={playerStats?.bannerPreset} />}
  </div>;
}
