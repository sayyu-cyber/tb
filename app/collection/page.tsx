"use client";

import CollectionPage from "@/components/collection/CollectionPage";

/**
 * Collection renders its own Arena page header (it carries the collected
 * count and the progress meter), so the route is just the component.
 */
export default function CollectionRoute() {
  return <CollectionPage />;
}
