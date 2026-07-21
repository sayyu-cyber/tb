"use client";
import CosmeticShop from "@/components/shop/CosmeticShop";
import { PageHeader } from "@/components/layout/PageHeader";

export default function ShopPage() {
  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title="Shop" />
      <CosmeticShop />
    </div>
  );
}