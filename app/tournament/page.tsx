"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Flame, Clock, Swords } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { useRankLock } from "@/hooks/useRankLock";
import { getRankFromTrophies } from "@/constants/ranks";
import { isQualified, getWeeklyStandings, WeeklyStanding } from "@/lib/weekendLeague";
import { useTranslation } from "@/hooks/useTranslation";

export default function TournamentPage() {
  const { playerStats, user } = useAuth();
  const t = useTranslation();
  const { isWeekendLeague, nextUnlockTime } = useRankLock();
  const [standings, setStandings] = useState<WeeklyStanding[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const trophies = playerStats?.trophies || 0;
  const rank = getRankFromTrophies(trophies);
  const qualified = isQualified(rank);

  useEffect(() => {
    let cancelled = false;
    getWeeklyStandings()
      .then((s) => !cancelled && setStandings(s))
      .catch((err) => !cancelled && setError(String(err)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_weekendLeague")} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-2xl p-5 mb-4 relative overflow-hidden"
      >
        <div className="absolute -top-8 -right-8 w-24 h-24 bg-orange-500/10 rounded-full blur-xl" />
        <div className="flex items-center gap-2 mb-2">
          <Flame size={18} className="text-orange-400" />
          <h2 className="text-[rgb(var(--text-primary))] font-semibold">
            {isWeekendLeague ? t("tournament_isLive") : t("page_weekendLeague")}
          </h2>
        </div>
        {isWeekendLeague ? (
          <p className="text-[rgb(var(--c4))] text-sm">
            {t("tournament_liveDesc").replace("{time}", String(nextUnlockTime))}
          </p>
        ) : (
          <p className="text-[rgb(var(--c4))] text-sm">
            {t("tournament_defaultDesc").replace("{time}", String(nextUnlockTime))}
          </p>
        )}

        {!qualified && (
          <p className="text-[rgb(var(--c4))] text-xs mt-3">
            {t("tournament_notQualified").replace("{rank}", String(rank)).replace("{trophies}", String(trophies))}
          </p>
        )}

        {isWeekendLeague && qualified && (
          <div className="flex gap-2 mt-4">
            <Link href="/play/mindi/ranked" className="flex-1">
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[rgb(var(--gold-deep))] via-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] text-[#0F0F0F] font-semibold rounded-xl py-3"
              >
                <Swords size={16} /> Mindi
              </motion.button>
            </Link>
            <Link href="/play/gin-rummy/ranked" className="flex-1">
              <motion.button
                whileTap={{ scale: 0.97 }}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[rgb(var(--gold-deep))] via-[rgb(var(--gold))] to-[rgb(var(--gold-bright))] text-[#0F0F0F] font-semibold rounded-xl py-3"
              >
                <Swords size={16} /> Gin Rummy
              </motion.button>
            </Link>
          </div>
        )}
      </motion.div>

      <div className="flex items-center gap-2 mb-3">
        <Trophy size={16} className="text-[rgb(var(--gold))]" />
        <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm">{t("tournament_standings")}</h3>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-[rgb(var(--c2))] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <p className="text-[rgb(var(--c4))] text-sm text-center py-8">{error}</p>
      ) : standings.length === 0 ? (
        <div className="glass-card rounded-2xl p-6 text-center">
          <Clock size={24} className="text-[rgb(var(--c3))] mx-auto mb-2" />
          <p className="text-[rgb(var(--c4))] text-sm">{t("tournament_noQualified")}</p>
        </div>
      ) : (
        <div className="space-y-1">
          {standings.map((s, i) => (
            <Link key={s.uid} href={`/player?uid=${s.uid}`}>
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl ${
                  s.uid === user?.uid ? "bg-[rgb(var(--gold)/5%)] border border-[rgb(var(--gold)/20%)]" : "hover:bg-[rgb(var(--c2)/50%)]"
                }`}
              >
                <span className="text-[rgb(var(--c4))] font-bold text-sm w-6 text-center">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[rgb(var(--text-primary))] text-sm font-medium truncate">{s.displayName}</p>
                  <p className="text-[rgb(var(--c4))] text-[10px]">{s.currentRank}</p>
                </div>
                <span className="text-[rgb(var(--gold))] font-semibold text-sm">{s.weeklyTrophies.toLocaleString()}</span>
              </motion.div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
