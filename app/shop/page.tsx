"use client";
import CosmeticShop from "@/components/shop/CosmeticShop";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTranslation } from "@/hooks/useTranslation";
import { ShoppingBag } from "lucide-react";

export default function ShopPage() {
  const t = useTranslation();
  return (
    <div className="hub-page shop-page">
      <PageHeader title={t("page_shop")} icon={ShoppingBag} />
      <CosmeticShop />
    </div>
  );
}
