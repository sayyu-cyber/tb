"use client";
import AchievementsPage from "@/components/achievements/AchievementsPage";

/**
 * The page now renders its own hero (title, subtitle, trophy mark), so the
 * shared PageHeader would be a duplicate title stacked above it.
 */
export default function AchievementsRoute() {
  return <AchievementsPage />;
}
