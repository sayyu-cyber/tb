"use client";
import MissionsPanel from "@/components/missions/MissionsPanel";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";

export default function MissionsPage() {
  const t = useTranslation();
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_missions")} />
      <MissionsPanel />
    </div>
  );
}