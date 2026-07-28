"use client";
import AchievementsPage from "@/components/achievements/AchievementsPage";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";

export default function AchievementsRoute() {
  const t = useTranslation();
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_achievements")} />
      <AchievementsPage />
    </div>
  );
}