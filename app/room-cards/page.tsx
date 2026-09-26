"use client";

import RoomCardManager from "@/components/roomcards/RoomCardManager";
import { useTranslation } from "@/hooks/useTranslation";

/**
 * Room Cards on its own route — design/arena/screens/app/app-03-inventory.jpg.
 *
 * The board has no Room Cards board of its own; it draws the panel inside
 * Inventory (APP_SCREENS.md: "Collection and Room Cards use the Inventory
 * board's pieces"). This route renders that same panel under the Arena page
 * header, so the two are the same object rather than two drawings of one.
 */
export default function RoomCardsPage() {
  const t = useTranslation();
  return (
    <div className="arena-inventory ar-page" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div className="phead">
        <div>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>
            Activate one to host private rooms.
          </span>
          <h1 className="disp chrome ar-h1">{t("page_roomCards")}</h1>
        </div>
      </div>
      <RoomCardManager />
    </div>
  );
}
