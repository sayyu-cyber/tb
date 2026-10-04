"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Clock3, Copy, Grid2X2, Medal, Pencil, Settings, Trophy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";
import { useToast } from "@/contexts/ToastContext";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { resolveAchievements } from "@/lib/achievements";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getProfileHistory, ProfileMatch } from "@/lib/profileHistory";
import { getRankFromTrophies } from "@/constants/ranks";
import { Avatar, RankLabel, RankHex } from "@/components/arena";
import {
  AchievementsPreview, ProfileGameStats, ProfileHistory, ProfileMilestones,
  ProfileSkeleton, ProfileStatsGrid, metric,
} from "@/components/profile/ProfileSections";
import { LandProfile } from "@/components/profile/land/LandProfile";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { copyText } from "@/lib/clipboard";

/**
 * Profile — design/arena/screens/app/app-02-profile.jpg, from the Profile
 * board.
 *
 * The board draws all five tabs as buttons in one tablist. Two of them,
 * Achievements and Settings, are separate routes in the app, so those are
 * links: same tray, same look, but middle-click and open-in-new-tab work,
 * which they would not on a button. `.tabs a` is given `.tabs button`'s own
 * values in styles/arena-screens.css.
 *
 * A phone gets LProfile (design/arena/boards/LProfile.dc.html): the same
 * sections with the tabs as a chip row and the history as a row per match.
 * One composition mounts, and the page owns the profile, the history and the
 * achievements, so the two read one of each.
 */
export default function ProfilePage() {
  const { user, playerStats, profileLoading, profileError, retryProfile } = useAuth();
  const { state } = useEconomy();
  const { showToast } = useToast();
  const [editing, setEditing] = useState(false);
  const [tab, setTab] = useState<"overview" | "stats" | "history">("overview");
  const [history, setHistory] = useState<ProfileMatch[] | null>(null);
  const [historyError, setHistoryError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [admin, setAdmin] = useState(false);
  const phone = usePhoneLayout();
  const uid = user?.uid;

  useEffect(() => {
    let active = true;
    setAdmin(false);
    getSupabaseBrowserClient().auth.getUser().then(({ data }) => {
      const current = data.user;
      const role = current?.app_metadata?.role;
      if (active && current && current.id === uid) setAdmin(current.app_metadata?.admin === true || role === "admin");
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

  if (!user) return <ProfileSkeleton />;

  const name = user.displayName || "Player";
  const trophies = playerStats?.trophies ?? 0;
  const tier = playerStats?.currentRank || getRankFromTrophies(trophies);
  const achievements = resolveAchievements(state.achievements, {
    matchesWon: state.profile.stats.matchesWon,
    highestRank: state.profile.stats.highestRank,
    weekendChampion: state.profile.stats.weekendChampion,
    collection: state.profile.collection,
  });

  async function copyId() {
    if (!playerStats?.playerCode) return;
    try { await copyText(playerStats.playerCode); showToast("User ID copied.", "success"); }
    catch { showToast("Couldn't copy User ID.", "error"); }
  }

  /** The board masks the address: the first letter, then dots. */
  const maskedEmail = user.email
    ? `${user.email[0]}••••@${user.email.split("@")[1] ?? ""}`
    : null;

  const editModal = editing && (
    <EditProfileModal
      isOpen
      onClose={() => setEditing(false)}
      currentName={user.displayName || ""}
      currentAvatar={playerStats?.avatarPreset}
      currentBanner={playerStats?.bannerPreset}
    />
  );

  return (
    <>
    {phone ? (
      <LandProfile
        name={name}
        tier={tier}
        stats={playerStats}
        history={history}
        achievements={achievements}
        maskedEmail={maskedEmail}
        memberSince={user.createdAt ?? null}
        admin={admin}
        tab={tab}
        onTab={setTab}
        onEdit={() => setEditing(true)}
        onCopyId={copyId}
      />
    ) : (
    <div className="desk-view">
    <div className="arena-profile ar-page" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
      <div className="phead">
        <div>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>Your stats &amp; achievements</span>
          <h1 className="disp chrome ar-h1">Profile</h1>
        </div>
        <div className="tabs" role="tablist" aria-label="Profile sections">
          <button type="button" aria-pressed={tab === "overview"} onClick={() => setTab("overview")} data-flat>
            <Grid2X2 aria-hidden="true" />Overview
          </button>
          <button type="button" aria-pressed={tab === "stats"} onClick={() => setTab("stats")} data-flat>
            <Trophy aria-hidden="true" />Game Stats
          </button>
          <Link href="/achievements/"><Medal aria-hidden="true" />Achievements</Link>
          <button type="button" aria-pressed={tab === "history"} onClick={() => setTab("history")} data-flat>
            <Clock3 aria-hidden="true" />History
          </button>
          <Link href="/settings/"><Settings aria-hidden="true" />Settings</Link>
        </div>
      </div>

      <section className="banner" aria-label="Player card">
        <div className="word" aria-hidden="true">{tier}</div>
        <div className="banner-id">
          <div className="bigav">
            <Avatar name={name} src={user.photoURL} seed={user.uid} size={136} radius={26} className="bigav-inner" />
            <span className="rkpin">
              <RankHex tier={tier} width={44} height={50} label={`${tier} rank`} />
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" }}>
              <h2 className="disp banner-name" style={{ margin: 0 }}>{name}</h2>
              <RankLabel tier={tier} />
              {admin && <span className="pill line">Admin</span>}
            </div>
            {maskedEmail && <span className="muted">{maskedEmail}</span>}
            <div style={{ display: "flex", alignItems: "center", gap: "18px", flexWrap: "wrap" }}>
              {playerStats?.playerCode && (
                <span className="idchip">
                  <span>ID</span>{playerStats.playerCode}
                  <button type="button" aria-label="Copy player ID" onClick={copyId} data-flat>
                    <Copy aria-hidden="true" />
                  </button>
                </span>
              )}
              <span className="meta"><Trophy aria-hidden="true" />{metric(playerStats?.trophies)} trophies</span>
              {Number.isFinite(user.createdAt?.getTime()) && (
                <span className="meta">
                  <CalendarDays aria-hidden="true" />
                  Member since {user.createdAt.toLocaleDateString(undefined, { month: "short", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="ar-btn ghost sm banner-edit"
          onClick={() => setEditing(true)}
          style={{ background: "rgba(0,0,0,.5)" }}
        >
          <Pencil aria-hidden="true" />Edit Profile
        </button>
      </section>

      {profileError && (
        <div className="lockbar" role="alert">
          <span className="muted">Couldn&apos;t load your profile statistics.</span>
          <button type="button" className="link" onClick={retryProfile}>Retry</button>
        </div>
      )}

      {profileLoading ? <ProfileSkeleton /> : (
        <>
          {tab !== "history" && (
            <section className="profile-row">
              <ProfileStatsGrid stats={playerStats} />
              <ProfileGameStats history={history} />
            </section>
          )}
          {historyError && (
            <div className="lockbar" role="alert">
              <span className="muted">Game statistics and history unavailable.</span>
              <button type="button" className="link" onClick={() => setAttempt(value => value + 1)}>Retry</button>
            </div>
          )}
          {tab === "overview" && (
            <section className="profile-row-b">
              <AchievementsPreview achievements={achievements} />
              <ProfileMilestones stats={playerStats} history={history} />
            </section>
          )}
          {(tab === "overview" || tab === "history" || tab === "stats") && (
            history ? <ProfileHistory records={history} /> : !historyError && <ProfileSkeleton />
          )}
        </>
      )}

    </div>
    </div>
    )}
    {/* One modal for both compositions: it is a dialog, so a second copy in
        the hidden view would be a second focus trap in the DOM. */}
    {editModal}
    </>
  );
}
