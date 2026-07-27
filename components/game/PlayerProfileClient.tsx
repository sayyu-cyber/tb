"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, Star, Swords, Percent } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { getPublicProfile, PublicProfile } from "@/lib/publicProfile";
import { RANKS } from "@/constants/ranks";

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
    return () => {
      cancelled = true;
    };
  }, [uid]);

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Player Profile" />

      {loading ? (
        <div className="h-40 bg-[#1A1A1A] rounded-2xl animate-pulse" />
      ) : error ? (
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-[#3A3A3A] text-sm">{error}</p>
        </div>
      ) : profile ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass-card rounded-2xl p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#D4AF37] to-[#B8962E] p-[2px] mx-auto mb-3">
              <div className="w-full h-full rounded-full bg-[#1A1A1A] flex items-center justify-center">
                <span className="text-[#D4AF37] text-xl font-bold">{profile.displayName.charAt(0).toUpperCase()}</span>
              </div>
            </div>
            <h2 className="text-white font-bold text-lg">{profile.displayName}</h2>
            <p className="text-sm font-semibold uppercase tracking-wide mt-1" style={{ color: rankColor(profile.currentRank) }}>
              {profile.currentRank}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#3A3A3A] text-xs mb-1">
                <Trophy size={14} className="text-[#D4AF37]" /> Trophies
              </div>
              <p className="text-white font-bold text-lg">{profile.trophies.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#3A3A3A] text-xs mb-1">
                <Star size={14} className="text-[#D4AF37]" /> Peak Trophies
              </div>
              <p className="text-white font-bold text-lg">{profile.peakTrophies.toLocaleString()}</p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#3A3A3A] text-xs mb-1">
                <Swords size={14} className="text-[#D4AF37]" /> Matches
              </div>
              <p className="text-white font-bold text-lg">
                {profile.wins}W - {profile.losses}L
              </p>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-2 text-[#3A3A3A] text-xs mb-1">
                <Percent size={14} className="text-[#D4AF37]" /> Win Rate
              </div>
              <p className="text-white font-bold text-lg">{profile.winPercentage}%</p>
            </div>
          </div>

          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <span className="text-[#3A3A3A] text-sm">Highest Rank Reached</span>
            <span className="font-semibold text-sm" style={{ color: rankColor(profile.highestRank) }}>
              {profile.highestRank}
            </span>
          </div>

          {profile.favoriteGame && (
            <div className="glass-card rounded-xl p-4 flex items-center justify-between">
              <span className="text-[#3A3A3A] text-sm">Favorite Game</span>
              <span className="text-white text-sm font-medium capitalize">{profile.favoriteGame.replace("_", " ")}</span>
            </div>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
