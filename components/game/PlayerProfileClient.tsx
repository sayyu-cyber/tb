"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, Star, Swords, Percent, Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPublicProfile, PublicProfile } from "@/lib/publicProfile";
import { getActiveMatchId } from "@/lib/matchmaking";
import { RANKS } from "@/constants/ranks";
import { getAvatarPreset, getBannerPreset } from "@/constants/profileCustomization";

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

  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setError("No player specified.");
      return;
    }
    let cancelled = false;
    setLoading(true);
    getPublicProfile(uid)
      .then((p) => {
        if (cancelled) return;
        if (!p) setError("Player not found.");
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
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Player Profile" />

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
              <div className="glass-card rounded-xl p-3 flex items-center justify-center gap-2 border border-[#D4AF37]/30 bg-[#D4AF37]/5">
                <Eye size={14} className="text-[#D4AF37]" />
                <span className="text-[#D4AF37] text-sm font-medium">Currently in a match — Watch Live</span>
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
                <Trophy size={14} className="text-[#D4AF37]" /> Trophies
              </div>
              <p className="text-[rgb(var(--text-primary))] font-bold text-lg">{profile.trophies.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[rgb(var(--c4))] text-xs mb-1">
                <Star size={14} className="text-[#D4AF37]" /> Peak Trophies
              </div>
              <p className="text-[rgb(var(--text-primary))] font-bold text-lg">{profile.peakTrophies.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[rgb(var(--c4))] text-xs mb-1">
                <Swords size={14} className="text-[#D4AF37]" /> Matches
              </div>
              <p className="text-[rgb(var(--text-primary))] font-bold text-lg">
                {profile.wins}W - {profile.losses}L
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[rgb(var(--c4))] text-xs mb-1">
                <Percent size={14} className="text-[#D4AF37]" /> Win Rate
              </div>
              <p className="text-[rgb(var(--text-primary))] font-bold text-lg">{profile.winPercentage}%</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <span className="text-[rgb(var(--c4))] text-sm">Highest Rank Reached</span>
            <span className="font-semibold text-sm" style={{ color: rankColor(profile.highestRank) }}>
              {profile.highestRank}
            </span>
          </div>

          {profile.favoriteGame && (
            <div className="glass-card rounded-xl p-4 flex items-center justify-between">
              <span className="text-[rgb(var(--c4))] text-sm">Favorite Game</span>
              <span className="text-[rgb(var(--text-primary))] text-sm font-medium capitalize">{profile.favoriteGame.replace("_", " ")}</span>
            </div>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
