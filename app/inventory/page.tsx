"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Package, Ticket, Lock, Crown } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useEconomy } from "@/contexts/EconomyContext";
import { ALL_COSMETICS, RARITY_COLORS } from "@/data/cosmetics";
import { CosmeticCategory } from "@/types/economy";
import RoomCardManager from "@/components/roomcards/RoomCardManager";
import { useTranslation } from "@/hooks/useTranslation";
import { CategoryIcon } from "@/components/ui/icons";
import { CosmeticPreview } from "@/components/ui/CosmeticPreview";
import { staggerParent, riseIn } from "@/lib/motion";

function getCategoryTabs(t: (key: string) => string): { id: CosmeticCategory; label: string }[] {
  return [
    { id: "cardBack", label: t("inv_cardBacks") },
    { id: "tableTheme", label: t("inv_tables") },
    { id: "profileFrame", label: t("inv_frames") },
    { id: "emote", label: t("inv_emotes") },
    { id: "victoryAnimation", label: t("inv_victory") },
    { id: "sticker", label: t("inv_stickers") },
    { id: "banner", label: t("inv_banners") },
  ];
}

const COLLECTION_KEY: Record<CosmeticCategory, string> = {
  cardBack: "cardBacks",
  tableTheme: "tableThemes",
  profileFrame: "profileFrames",
  emote: "emotes",
  victoryAnimation: "victoryAnimations",
  sticker: "stickers",
  banner: "banners",
};

export default function InventoryPage() {
  const { state, equipCosmetic } = useEconomy();
  const t = useTranslation();
  const [tab, setTab] = useState<"cosmetics" | "roomCards">("cosmetics");
  const [category, setCategory] = useState<CosmeticCategory>("cardBack");

  const collection = state.profile.collection as unknown as Record<string, string[]>;
  const ownedIds = new Set(collection[COLLECTION_KEY[category]] ?? []);
  // The full catalogue for this category, not just what's owned - an
  // unowned item renders locked/dimmed rather than simply not existing, so
  // a new account sees what there is to collect instead of one card lost
  // in an otherwise empty page.
  const categoryItems = ALL_COSMETICS.filter((c) => c.category === category);

  const equippedMap: Record<string, string> = {
    cardBack: state.profile.equipped.cardBack,
    tableTheme: state.profile.equipped.tableTheme,
    profileFrame: state.profile.equipped.profileFrame,
    victoryAnimation: state.profile.equipped.victoryAnimation,
    banner: state.profile.equipped.banner,
  };
  // Emotes and stickers are used contextually in-match, not persistently
  // equipped - only these categories have a single "equipped" slot.
  const canEquip = category !== "emote" && category !== "sticker";
  const categoryTabs = getCategoryTabs(t);

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_inventory")} />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("cosmetics")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
            tab === "cosmetics" ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"
          }`}
        >
          <Package size={16} /> {t("inventory_cosmetics")}
        </button>
        <button
          onClick={() => setTab("roomCards")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
            tab === "roomCards" ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"
          }`}
        >
          <Ticket size={16} /> {t("inventory_roomCards")}
        </button>
      </div>

      {tab === "cosmetics" ? (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {categoryTabs.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  category === cat.id ? "bg-[rgb(var(--gold)/20%)] text-[rgb(var(--gold-ink))] border border-[rgb(var(--gold)/30%)]" : "bg-[rgb(var(--c2))] text-[rgb(var(--c4))] border border-[rgb(var(--c3))]"
                }`}
              >
                <CategoryIcon category={cat.id} size={14} />
                {cat.label}
              </button>
            ))}
          </div>

          <motion.div
            key={category}
            variants={staggerParent(0.03)}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
          >
            {categoryItems.map((item) => {
              const isOwned = ownedIds.has(item.id);
              const isEquipped = isOwned && canEquip && equippedMap[item.category] === item.id;
              return (
                <motion.div
                  key={item.id}
                  variants={riseIn}
                  className={`rounded-xl border p-3 transition-colors ${
                    isEquipped
                      ? "border-[rgb(var(--gold)/50%)] bg-[rgb(var(--gold)/5%)]"
                      : isOwned
                        ? "border-[rgb(var(--c3))] bg-[rgb(var(--c2)/50%)]"
                        : "border-[rgb(var(--c3)/60%)] bg-[rgb(var(--c2)/25%)]"
                  }`}
                >
                  <div
                    className={`relative mb-2 h-20 rounded-lg bg-gradient-to-b from-[rgb(var(--c1))] to-[rgb(var(--c2))] flex items-center justify-center overflow-hidden ${
                      isOwned ? "" : "opacity-45 saturate-50"
                    }`}
                  >
                    <CosmeticPreview item={item} />
                    {isEquipped && (
                      <span className="absolute top-1 right-1 rounded-full bg-[rgb(var(--gold))] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#0C0E12]">
                        {t("collection_equipped")}
                      </span>
                    )}
                    {!isOwned && (
                      <span className="absolute inset-0 flex items-center justify-center bg-[rgb(var(--c1)/35%)]">
                        <Lock size={20} className="text-[rgb(var(--c5))]" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-sm font-medium truncate ${isOwned ? "text-[rgb(var(--text-primary))]" : "text-[rgb(var(--c4))]"}`}
                    >
                      {item.name}
                    </span>
                    <span
                      className="text-[9px] font-bold shrink-0 ml-1"
                      style={{ color: isOwned ? RARITY_COLORS[item.rarity] : "rgb(var(--c4))" }}
                    >
                      {item.rarity}
                    </span>
                  </div>
                  <p className="text-[rgb(var(--c4))] text-xs mb-3 line-clamp-2">{item.description}</p>

                  {isOwned ? (
                    canEquip ? (
                      <button
                        onClick={() => equipCosmetic(item.category, item.id)}
                        className={`w-full py-1.5 rounded-lg text-xs font-semibold ${
                          isEquipped ? "bg-[rgb(var(--gold)/20%)] text-[rgb(var(--gold-ink))]" : "bg-[rgb(var(--c3))] text-[rgb(var(--c5))]"
                        }`}
                      >
                        {isEquipped ? t("collection_equipped") : t("collection_equip")}
                      </button>
                    ) : (
                      <span className="block w-full text-center py-1.5 rounded-lg text-xs font-medium bg-[rgb(var(--c3))] text-[rgb(var(--c5))]">
                        {t("inventory_owned")}
                      </span>
                    )
                  ) : (
                    <Link
                      href="/shop"
                      className="flex w-full items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-[rgb(var(--c3)/60%)] text-[rgb(var(--c5))] hover:bg-[rgb(var(--c3))] hover:text-[rgb(var(--text-primary))] transition-colors"
                    >
                      {item.isVipExclusive ? (
                        <>
                          <Crown size={12} className="text-[rgb(var(--gold-ink))]" aria-hidden="true" />
                          VIP only
                        </>
                      ) : item.price > 0 ? (
                        <>
                          <Lock size={11} aria-hidden="true" />
                          {item.price.toLocaleString()} coins
                        </>
                      ) : (
                        <>
                          <Lock size={11} aria-hidden="true" />
                          Locked
                        </>
                      )}
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
          {categoryItems.length === 0 && (
            <div className="glass-card rounded-2xl p-6 text-center">
              <Package size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
              <p className="text-[rgb(var(--c4))] text-sm">{t("inventory_nothingHere")}</p>
            </div>
          )}
        </>
      ) : (
        <RoomCardManager />
      )}
    </div>
  );
}
