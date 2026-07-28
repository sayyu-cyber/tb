"use client";
import DailyLoginCalendar from "@/components/rewards/DailyLoginCalendar";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";

export default function RewardsPage() {
  const t = useTranslation();
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_dailyRewards")} />
      <DailyLoginCalendar />
    </div>
  );
}