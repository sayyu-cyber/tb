"use client";
import CollectionPage from "@/components/collection/CollectionPage";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";

export default function CollectionRoute() {
  const t = useTranslation();
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_collection")} />
      <CollectionPage />
    </div>
  );
}