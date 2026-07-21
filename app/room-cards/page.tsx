"use client";
import RoomCardManager from "@/components/roomcards/RoomCardManager";
import { PageHeader } from "@/components/layout/PageHeader";

export default function RoomCardsPage() {
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Room Cards" />
      <RoomCardManager />
    </div>
  );
}