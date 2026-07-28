"use client";
import RoomCardManager from "@/components/roomcards/RoomCardManager";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";

export default function RoomCardsPage() {
  const t = useTranslation();
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_roomCards")} />
      <RoomCardManager />
    </div>
  );
}