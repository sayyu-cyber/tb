"use client";
import CosmeticShop from "@/components/shop/CosmeticShop";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";

export default function ShopPage() {
  const t = useTranslation();
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_shop")} />
      <CosmeticShop />
    </div>
  );
}