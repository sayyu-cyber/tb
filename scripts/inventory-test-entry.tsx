import React from "react";
import { createRoot } from "react-dom/client";
import InventoryPage from "@/app/inventory/page";
import CollectionPage from "@/components/collection/CollectionPage";
import RoomCardsPage from "@/app/room-cards/page";

/**
 * One board (app-03) drives three routes, so one entry renders whichever is
 * asked for: ?collection, ?roomcards, or Inventory by default. The 84px
 * inset stands in for the collapsed sidebar rail, which is what the
 * Inventory board draws (`left: 84px` on its .page).
 */
const which = typeof location !== "undefined" && location.search.includes("collection")
  ? <CollectionPage />
  : typeof location !== "undefined" && location.search.includes("roomcards")
    ? <RoomCardsPage />
    : <InventoryPage />;

createRoot(document.getElementById("test-root")!).render(
  <div className="arena-app app-shell ar-stage">
    <div aria-hidden="true" style={{ width: 84, flex: "none" }} />
    <main className="app-shell-main">{which}</main>
  </div>
);
