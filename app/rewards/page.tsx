"use client";
import DailyLoginCalendar from "@/components/rewards/DailyLoginCalendar";
import { PageHeader } from "@/components/layout/PageHeader";

export default function RewardsPage() {
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Daily Rewards" />
      <DailyLoginCalendar />
    </div>
  );
}