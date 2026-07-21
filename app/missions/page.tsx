"use client";
import MissionsPanel from "@/components/missions/MissionsPanel";
import { PageHeader } from "@/components/layout/PageHeader";

export default function MissionsPage() {
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Missions" />
      <MissionsPanel />
    </div>
  );
}