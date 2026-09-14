"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";
import { LeaderboardAvatar } from "./LeaderboardAvatar";
import { useTranslation } from "@/hooks/useTranslation";
import type { LeaderboardEntry } from "@/types";

/**
 * Top-three podium.
 *
 * Rendered in visual order #2 / #1 / #3 with #1 tallest, but the DOM order is
 * 1, 2, 3 and the visual order is produced by CSS `order`. That keeps the
 * reading order for screen readers and keyboard users correct (first place
 * first) while still looking like a podium - the brief asked for both.
 *
 * Secondary stats are only rendered when the player has actually played:
 * "0 matches · 0% win rate" under a champion would be noise, and for a brand
 * new board it would be wrong-looking rather than informative.
 */

const PLACE_CLASS = ["lb-gold", "lb-silver", "lb-bronze"] as const;

function PodiumPlayer({ entry, place, isCurrentUser }: { entry: LeaderboardEntry; place: 0 | 1 | 2; isCurrentUser: boolean }) {
  const t = useTranslation();
  const hasPlayed = (entry.totalMatches ?? 0) > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: place === 0 ? 0 : 0.08 * place, duration: 0.35 }}
      className={`lb-podium-slot ${PLACE_CLASS[place]}`}
      data-place={place + 1}
    >
      <Link href={`/player?uid=${encodeURIComponent(entry.uid)}`} className="lb-podium-card">
        {place === 0 && (
          <span className="lb-crown" aria-hidden="true">
            <Crown size={22} />
          </span>
        )}

        <span className="lb-podium-avatar">
          <LeaderboardAvatar
            name={entry.username}
            photoURL={entry.avatar}
            presetId={entry.avatarPreset}
            size={place === 0 ? 76 : 62}
          />
        </span>

        <strong className="lb-podium-name">{entry.username}</strong>

        <span className="lb-podium-meta">
          {entry.currentRank && <span className="lb-rank-chip">{entry.currentRank}</span>}
          {isCurrentUser && <span className="lb-you-chip">{t("leaderboard_you")}</span>}
        </span>

        <span className="lb-podium-trophies">
          <Trophy size={15} aria-hidden="true" />
          {entry.trophies.toLocaleString()}
        </span>

        {hasPlayed && (
          <span className="lb-podium-stats">
            <span>
              {entry.totalMatches?.toLocaleString()} {t("leaderboard_matches")}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {entry.winPercentage ?? 0}% {t("leaderboard_winRate")}
            </span>
          </span>
        )}
      </Link>

      <div className="lb-podium-plinth" aria-hidden="true">
        <span>{place + 1}</span>
      </div>
    </motion.div>
  );
}

export function Podium({ topThree, currentUid }: { topThree: LeaderboardEntry[]; currentUid?: string }) {
  if (topThree.length === 0) return null;

  return (
    <section className="lb-podium" aria-label="Top three players">
      {topThree.slice(0, 3).map((entry, index) => (
        <PodiumPlayer
          key={entry.uid}
          entry={entry}
          place={index as 0 | 1 | 2}
          isCurrentUser={entry.uid === currentUid}
        />
      ))}
    </section>
  );
}
