import React from "react";
import { createRoot } from "react-dom/client";
import InventoryPage from "../app/inventory/page";
import CollectionRoute from "../app/collection/page";
import RoomCardsPage from "../app/room-cards/page";
import { LandFrame } from "./land-frame";

// LInventory in the phone shell, fed the Inventory board's sample data
// (scripts/inventory-test-services.tsx). ?collection and ?roomcards open the
// other two routes, which land on the same screen's tabs.
const which = location.search.includes("collection") ? <CollectionRoute />
  : location.search.includes("roomcards") ? <RoomCardsPage />
  : <InventoryPage />;

createRoot(document.getElementById("test-root")!).render(<LandFrame>{which}</LandFrame>);
