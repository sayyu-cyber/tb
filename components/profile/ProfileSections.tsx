"use client";

import Link from "next/link";
import { AchievementIcon } from "@/components/achievements/AchievementIcon";
import { CheckCircle2, Clock3, Gamepad2, Heart, LockKeyhole, Medal, Spade, Swords, Target, TrendingUp, Trophy } from "lucide-react";
import { PlayerStats } from "@/types";
import type { ResolvedAchievement } from "@/lib/achievements";
import { ProfileMatch } from "@/lib/profileHistory";
import { RANKS } from "@/constants/ranks";

export const metric = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 ? value.toLocaleString() : "--";
export function ProfileSkeleton() { return <div className="profile-skeleton" aria-label="Loading profile" aria-busy="true"><div /><div /><div /><div /></div>; }
export function ProfileStatsGrid({ stats }: { stats: PlayerStats | null }) {
  const matches = stats?.totalMatches, wins = stats?.wins;
  const rate = typeof matches === "number" && typeof wins === "number" && matches >= wins && wins >= 0 ? `${matches ? Math.round(wins / matches * 100) : 0}%` : "--";
  return <section aria-labelledby="profile-statistics"><div className="profile-section-title"><h2 id="profile-statistics"><TrendingUp /> Statistics</h2><span>All time</span></div><div className="profile-stats-grid">{[
    { label: "Matches", value: metric(matches), icon: Swords, tone: "blue" },
    { label: "Wins", value: metric(wins), icon: Trophy, tone: "gold" },
    { label: "Losses", value: metric(stats?.losses), icon: Target, tone: "red" },
    { label: "Win Rate", value: rate, icon: TrendingUp, tone: "green" },
  ].map(item => <div className={`profile-stat ${item.tone}`} key={item.label}><item.icon aria-hidden="true" /><div><strong>{item.value}</strong><span>{item.label}</span></div></div>)}</div></section>;
}

export function ProfileGameStats({ history, onHistory }: { history: ProfileMatch[] | null; onHistory: () => void }) {
  return <section><div className="profile-section-title"><h2><Gamepad2 /> Game Stats</h2><span>Recent online matches</span></div><div className="profile-games">{(["Mindi", "Gin Rummy"] as const).map(game => {
    const records = history?.filter(match => match.game === game);
    const wins = records?.filter(match => match.result === "Win").length;
    const known = records?.every(match => match.result !== "Unavailable");
    return <button className={`profile-game ${game === "Mindi" ? "mindi" : "gin"}`} key={game} onClick={onHistory}><Spade aria-hidden="true" /><div><h3>{game}</h3><dl><div><dt>Matches</dt><dd>{metric(records?.length)}</dd></div><div><dt>Wins</dt><dd>{known ? metric(wins) : "--"}</dd></div><div><dt>Win Rate</dt><dd>{known && records ? `${records.length ? Math.round(wins! / records.length * 100) : 0}%` : "--"}</dd></div></dl></div></button>;
  })}<div className="profile-game future"><LockKeyhole /><div><h3>Next at the table</h3><p>Coming soon</p></div></div></div></section>;
}

/**
 * Takes ResolvedAchievement[] - run the list through
 * `resolveAchievements` (lib/achievements) before passing it in. That helper
 * is the shared source of progress for both this preview and the
 * Achievements page, so the two cannot show different numbers for the same
 * achievement. The raw `progress` field is NOT usable here: nothing writes
 * it, so every bar would read zero.
 */
export function AchievementsPreview({ achievements }: { achievements: ResolvedAchievement[] }) {
  return <section><div className="profile-section-title"><h2><Medal /> Achievements</h2><Link href="/achievements/">View All</Link></div>{achievements.length ? <div className="profile-achievements">{achievements.slice(0,5).map(achievement => {
    const target = Math.max(1, achievement.target), progress = Math.max(0, Math.min(target, achievement.displayProgress));
    return <article className={`profile-achievement ${achievement.unlocked ? "complete" : ""}`} key={achievement.id}><AchievementIcon id={achievement.id} category={achievement.category} complete={achievement.complete} /><div><h3>{achievement.title}</h3><p>{achievement.description}</p><div className="achievement-progress"><progress aria-label={achievement.title} max={target} value={progress} /><span>{progress}/{target}</span></div><span className="achievement-status">{achievement.unlocked ? <CheckCircle2 size={12} /> : <LockKeyhole size={12} />}{achievement.unlocked ? "Unlocked" : achievement.complete ? "Earned - pending unlock" : progress > 0 ? "In progress" : "Locked"}</span></div></article>;
  })}</div> : <p className="profile-empty">Start playing to unlock achievements.</p>}</section>;
}

export function ProfileMilestones({ stats }: { stats: PlayerStats | null }) {
  const favorite = stats?.favoriteGame as string | undefined;
  const name = favorite === "mindi" ? "Mindi" : ["gin-rummy", "gin_rummy"].includes(favorite || "") ? "Gin Rummy" : favorite;
  const next = Object.values(RANKS).find(rank => typeof stats?.trophies === "number" && rank.min > stats.trophies);
  return <div className="profile-milestones"><article><Heart /><div><h3>Favorite Game</h3><strong>{stats ? name || "No favorite game yet" : "Unavailable"}</strong><p>{name ? "Your recorded favorite" : "Play a few matches and your favorite game will appear here."}</p></div></article><article><Trophy /><div><h3>Highest Rank</h3><strong>{stats?.highestRank || "Unavailable"}</strong><p>{stats?.currentRank === "Unranked" ? "Play ranked matches to earn your first rank." : next ? `${metric(stats?.trophies)} / ${next.min} trophies to ${next.name}` : stats ? "Your best recorded rank" : "Rank data unavailable."}</p>{next && stats?.currentRank !== "Unranked" && <progress aria-label={`Progress to ${next.name}`} value={Math.max(0,stats!.trophies)} max={next.min} />}</div></article></div>;
}

export function ProfileHistory({ records }: { records: ProfileMatch[] }) {
  return <section><div className="profile-section-title"><h2><Clock3 /> Match History</h2><span>Latest 50 online records</span></div>{records.length ? <div className="profile-history">{records.map(record => <article key={record.id}><Spade /><div><h3>{record.game}</h3><span>{record.mode}</span></div><strong className={record.result === "Win" ? "win" : record.result === "Loss" ? "loss" : ""}>{record.result}</strong><span>{record.score}</span><time>{Number.isFinite(record.date) ? new Date(record.date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "Date unavailable"}</time></article>)}</div> : <div className="profile-empty"><Swords /><h3>No recorded online matches yet.</h3><Link href="/play/">Play Now</Link></div>}</section>;
}
