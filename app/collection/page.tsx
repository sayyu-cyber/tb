"use client";
import CollectionPage from "@/components/collection/CollectionPage";
import { PageHeader } from "@/components/layout/PageHeader";

export default function CollectionRoute() {
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Collection" />
      <CollectionPage />
    </div>
  );
}