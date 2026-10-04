"use client";

import CollectionPage from "@/components/collection/CollectionPage";
import { LandInventory } from "@/components/inventory/land/LandInventory";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";

/**
 * Collection renders its own Arena page header (it carries the collected
 * count and the progress meter), so the route is just the component. On a
 * phone, Collection is a section of Inventory's Cosmetics tab
 * (design/arena/LANDSCAPE.md, LInventory), so it opens there.
 */
export default function CollectionRoute() {
  const phone = usePhoneLayout();
  return phone ? <LandInventory initialTab="cosmetics" /> : <CollectionPage />;
}
