import React, { useState } from "react";
import { DAILY_LOGIN_REWARDS, DAILY_MISSION_TEMPLATES, WEEKLY_MISSION_TEMPLATES } from "@/data/cosmetics";

/**
 * Stand-ins for what Daily Rewards and Missions read.
 *
 * The state is the Rewards board's own (design/arena/boards/Rewards.dc.html):
 * a 6-day streak with days 1-5 claimed and day 6 waiting, daily missions at
 * 2 of 3 (Win 1 Match and Play Mindi done, Play 3 Matches at 2/3), and
 * weekly at 0 of 3 with Win 10 at 7/10 and Play 20 at 12/20.
 *
 * Query flags: ?fresh (nothing claimed, day 1 waiting), ?last (six claimed,
 * day 7 waiting - the end-of-cycle popup).
 */

const flag = (name: string) => typeof location !== "undefined" && location.search.includes(name);

function template(list: readonly { id: string; title: string; description: string; target: number; reward: number; rewardCosmeticId?: string }[], id: string, progress: number) {
  const found = list.find(entry => entry.id === id)!;
  return {
    id: `${found.id}-inst`,
    templateId: found.id,
    title: found.title,
    description: found.description,
    target: found.target,
    progress,
    completed: progress >= found.target,
    reward: found.reward,
    rewardCosmeticId: found.rewardCosmeticId,
    type: "play_match" as const,
  };
}

export function useEconomy() {
  const claimedThrough = flag("fresh") ? 0 : flag("last") ? 6 : 5;
  const [claimed, setClaimed] = useState(claimedThrough);

  return {
    state: {
      economy: { coins: 1240 },
      profile: { vip: { active: false, remainingDays: 0 } },
      dailyLogin: {
        streak: claimed,
        lastClaimed: 0,
        rewards: DAILY_LOGIN_REWARDS.map(reward => ({ ...reward, claimed: reward.day <= claimed })),
      },
      missions: {
        daily: [
          template(DAILY_MISSION_TEMPLATES, "dm_win_1", 1),
          template(DAILY_MISSION_TEMPLATES, "dm_play_mindi", 1),
          template(DAILY_MISSION_TEMPLATES, "dm_play_3", 2),
        ],
        weekly: [
          template(WEEKLY_MISSION_TEMPLATES, "wm_win_10", 7),
          template(WEEKLY_MISSION_TEMPLATES, "wm_play_20", 12),
          template(WEEKLY_MISSION_TEMPLATES, "wm_reach_platinum", 0),
        ],
        dailyAllBonus: 50,
        lastDailyReset: 0,
        lastWeeklyReset: 0,
      },
    },
    claimDailyReward: (day: number) => {
      document.body.dataset.claimed = String(day);
      setClaimed(day);
      return true;
    },
  };
}

export const useTranslation = () => (key: string) => ({
  page_dailyRewards: "Daily Rewards",
  page_missions: "Missions",
  rewards_streak: "Streak: {n} days",
  rewards_dayClaimed: "Day {n} Claimed!",
  missions_dailyTitle: "Daily Missions",
  missions_dailyReset: "Resets at 00:00",
  missions_weeklyTitle: "Weekly Missions",
  missions_weeklyReset: "Resets every Sunday",
}[key] || key);

export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} {...props}>{children}</a>;
}
