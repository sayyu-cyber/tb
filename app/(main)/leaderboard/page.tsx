"use client";

import { motion } from "framer-motion";
import { Trophy, TrendingUp, RefreshCw, Users } from "lucide-react";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { Podium } from "@/components/leaderboard/Podium";
import { LeaderboardRow } from "@/components/leaderboard/LeaderboardRow";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "@/hooks/useTranslation";

export default function LeaderboardPage() {
  const { entries, loading, error, refresh } = useLeaderboard();
  const { user } = useAuth();
  const t = useTranslation();

  const topThree = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <div className="px-4 pt-6 pb-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <div className="w-10 h-10 rounded-xl bg-[rgb(var(--gold)/10%)] flex items-center justify-center">
          <Trophy size={20} className="text-[rgb(var(--gold-ink))]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[rgb(var(--text-primary))]">{t("leaderboard_title")}</h1>
          <p className="text-[rgb(var(--c4))] text-xs">{t("leaderboard_subtitle")}</p>
        </div>
      </motion.div>

      {/* Weekly badge */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-2 mb-6 bg-[rgb(var(--gold)/5%)] border border-[rgb(var(--gold)/10%)] rounded-xl px-4 py-3"
      >
        <TrendingUp size={16} className="text-[rgb(var(--gold-ink))]" />
        <span className="text-[rgb(var(--gold-ink))] text-sm font-medium">{t("leaderboard_weeklyRankings")}</span>
        <span className="text-[rgb(var(--c4))] text-xs ml-auto">{t("leaderboard_resetsMonday")}</span>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-[rgb(var(--c2))] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="glass-card rounded-2xl p-6 mx-auto max-w-xs text-center">
          <Trophy size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
          <p className="text-[rgb(var(--c4))] text-sm text-balance">{error}</p>
          <button
            onClick={refresh}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[rgb(var(--c3))] px-4 py-2 text-xs font-semibold text-[rgb(var(--text-primary))] hover:bg-[rgb(var(--c3)/70%)] transition-colors"
          >
            <RefreshCw size={13} aria-hidden="true" />
            Try again
          </button>
        </div>
      ) : entries.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 mx-auto max-w-xs text-center">
          <Users size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
          <p className="text-[rgb(var(--c4))] text-sm text-balance">
            No ranked players yet — be the first to climb the leaderboard!
          </p>
        </div>
      ) : (
        <>
          {/* Podium for top 3 */}
          <Podium topThree={topThree} />

          {/* Rest of leaderboard */}
          <div className="space-y-1">
            {rest.map((entry, index) => (
              <LeaderboardRow
                key={entry.rank}
                entry={entry}
                index={index}
                isCurrentUser={user?.displayName === entry.username}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
