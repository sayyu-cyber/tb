"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Star, Swords, Percent, Eye, Flag, Ban, ShieldOff } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPublicProfile, PublicProfile } from "@/lib/publicProfile";
import { getActiveMatchId } from "@/lib/matchmaking";
import { RANKS } from "@/constants/ranks";
import { getAvatarPreset, getBannerPreset } from "@/constants/profileCustomization";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { ReportDialog } from "@/components/moderation/ReportDialog";
import { blockUser, unblockUser, watchBlocks } from "@/lib/moderation";

function rankColor(rank: string): string {
  const match = Object.values(RANKS).find((r) => r.name === rank);
  return match?.color ?? "#3A3A3A";
}

export function PlayerProfileClient() {
  const searchParams = useSearchParams();
  const uid = searchParams.get("uid") ?? "";
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveMatchId, setLiveMatchId] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  const t = useTranslation();
  const { user } = useAuth();
  const { showToast } = useToast();

  // Live, so the button label stays correct if the player is blocked or
  // unblocked from Settings in another tab.
  useEffect(() => {
    if (!user || !uid || user.uid === uid) return;
    return watchBlocks(user.uid, (list) => setBlocked(list.includes(uid)));
  }, [user, uid]);

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setError(t("playerprofile_noPlayer"));
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPublicProfile(uid)
      .then((p) => {
        if (cancelled) return;
        if (!p) setError(t("playerprofile_notFound"));
        setProfile(p);
      })
      .catch((err) => {
        if (!cancelled) setError(String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    getActiveMatchId(uid)
      .then((m) => {
        if (!cancelled) setLiveMatchId(m?.matchId ?? null);
      })
      // Intentionally silent: the live-match banner is optional
      // enrichment - failing to resolve it should not surface an error on
      // an otherwise fine profile page.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uid, t]);

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_playerProfile")} />

      {loading ? (
        <div className="h-40 bg-[rgb(var(--c2))] rounded-2xl animate-pulse" />
      ) : error ? (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-[rgb(var(--c4))] text-sm">{error}</p>
        </div>
      ) : profile ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {liveMatchId && (
            <Link href={`/spectate?m=${liveMatchId}`}>
              <div className="glass-card rounded-xl p-3 flex items-center justify-center gap-2 border border-[rgb(var(--gold)/30%)] bg-[rgb(var(--gold)/5%)]">
                <Eye size={14} className="text-[rgb(var(--gold-ink))]" />
                <span className="text-[rgb(var(--gold-ink))] text-sm font-medium">{t("playerprofile_watchingLive")}</span>
              </div>
            </Link>
          )}
          <div className={`glass-card rounded-2xl p-6 text-center bg-gradient-to-b ${getBannerPreset(profile.bannerPreset).gradient}`}>
            <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${getAvatarPreset(profile.avatarPreset).gradient} p-[2px] mx-auto mb-3`}>
              <div className="w-full h-full rounded-full bg-[rgb(var(--c2))] flex items-center justify-center">
                <span className="text-[rgb(var(--text-primary))] text-xl font-bold">{profile.displayName.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <h2 className="text-[rgb(var(--text-primary))] font-bold text-lg">{profile.displayName}</h2>
            <p className="text-sm font-semibold uppercase tracking-wide mt-1" style={{ color: rankColor(profile.currentRank) }}>
              {profile.currentRank}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[rgb(var(--c4))] text-xs mb-1">
                <Trophy size={14} className="text-[rgb(var(--gold-ink))]" /> {t("profile_trophies")}
              </div>
              <p className="text-[rgb(var(--text-primary))] font-bold text-lg">{profile.trophies.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[rgb(var(--c4))] text-xs mb-1">
                <Star size={14} className="text-[rgb(var(--gold-ink))]" /> {t("playerprofile_peakTrophies")}
              </div>
              <p className="text-[rgb(var(--text-primary))] font-bold text-lg">{profile.peakTrophies.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[rgb(var(--c4))] text-xs mb-1">
                <Swords size={14} className="text-[rgb(var(--gold-ink))]" /> {t("profile_matches")}
              </div>
              <p className="text-[rgb(var(--text-primary))] font-bold text-lg">
                {profile.wins}W - {profile.losses}L
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[rgb(var(--c4))] text-xs mb-1">
                <Percent size={14} className="text-[rgb(var(--gold-ink))]" /> {t("playerprofile_winRate")}
              </div>
              <p className="text-[rgb(var(--text-primary))] font-bold text-lg">{profile.winPercentage}%</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <span className="text-[rgb(var(--c4))] text-sm">{t("playerprofile_highestRankReached")}</span>
            <span className="font-semibold text-sm" style={{ color: rankColor(profile.highestRank) }}>
              {profile.highestRank}
            </span>
          </div>

          {profile.favoriteGame && (
            <div className="glass-card rounded-xl p-4 flex items-center justify-between">
              <span className="text-[rgb(var(--c4))] text-sm">{t("profile_favoriteGame")}</span>
              <span className="text-[rgb(var(--text-primary))] text-sm font-medium capitalize">{profile.favoriteGame.replace("_", " ")}</span>
            </div>
          )}

          {/* Safety controls. Hidden on your own profile - there is nothing
              sensible about reporting or blocking yourself, and the calls
              would be rejected anyway. */}
          {user && user.uid !== uid && (
            <div className="mod-actions">
              <button type="button" onClick={() => setReportOpen(true)}>
                <Flag size={15} aria-hidden="true" />
                Report
              </button>
              <button
                type="button"
                disabled={blockBusy}
                onClick={async () => {
                  setBlockBusy(true);
                  try {
                    if (blocked) {
                      await unblockUser(user.uid, uid);
                      showToast(`Unblocked ${profile.displayName}.`, "success");
                    } else {
                      await blockUser(user.uid, uid);
                      showToast(`Blocked ${profile.displayName}.`, "success");
                    }
                  } catch {
                    showToast("Could not update block. Please try again.", "error");
                  } finally {
                    setBlockBusy(false);
                  }
                }}
              >
                {blocked ? <ShieldOff size={15} aria-hidden="true" /> : <Ban size={15} aria-hidden="true" />}
                {blocked ? "Unblock" : "Block"}
              </button>
            </div>
          )}
        </motion.div>
      ) : null}

      {user && profile && (
        <ReportDialog
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          targetUid={uid}
          targetName={profile.displayName}
          context="profile"
        />
      )}
    </div>
  );
}
