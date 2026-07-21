"use client";
import AchievementsPage from "@/components/achievements/AchievementsPage";
import { PageHeader } from "@/components/layout/PageHeader";

export default function AchievementsRoute() {
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Achievements" />
      <AchievementsPage />
    </div>
  );
}