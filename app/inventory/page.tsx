"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Package, Ticket } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useEconomy } from "@/contexts/EconomyContext";
import { ALL_COSMETICS, RARITY_COLORS } from "@/data/cosmetics";
import { CosmeticCategory } from "@/types/economy";
import RoomCardManager from "@/components/roomcards/RoomCardManager";
import { useTranslation } from "@/hooks/useTranslation";

const CATEGORY_TABS: { id: CosmeticCategory; label: string; icon: string }[] = [
  { id: "cardBack", label: "Card Backs", icon: "🃏" },
  { id: "tableTheme", label: "Tables", icon: "🎰" },
  { id: "profileFrame", label: "Frames", icon: "🖼️" },
  { id: "emote", label: "Emotes", icon: "😊" },
  { id: "victoryAnimation", label: "Victory", icon: "✨" },
  { id: "sticker", label: "Stickers", icon: "🏷️" },
  { id: "banner", label: "Banners", icon: "🚩" },
];

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
  const ownedItems = ALL_COSMETICS.filter((c) => ownedIds.has(c.id) && c.category === category);

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

  return (
    <div className="pt-4 pb-32 px-4">
      <PageHeader title={t("page_inventory")} />

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setTab("cosmetics")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
            tab === "cosmetics" ? "bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"
          }`}
        >
          <Package size={16} /> Cosmetics
        </button>
        <button
          onClick={() => setTab("roomCards")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
            tab === "roomCards" ? "bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"
          }`}
        >
          <Ticket size={16} /> Room Cards
        </button>
      </div>

      {tab === "cosmetics" ? (
        <>
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {CATEGORY_TABS.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  category === cat.id ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30" : "bg-[rgb(var(--c2))] text-[rgb(var(--c4))] border border-[rgb(var(--c3))]"
                }`}
              >
                <span className="mr-1">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          {ownedItems.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <Package size={28} className="text-[rgb(var(--c3))] mx-auto mb-2" />
              <p className="text-[rgb(var(--c4))] text-sm">Nothing here yet — earn or buy items from the Shop.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {ownedItems.map((item, i) => {
                const isEquipped = canEquip && equippedMap[item.category] === item.id;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`rounded-xl border p-3 ${isEquipped ? "border-[#D4AF37]/50 bg-[#D4AF37]/5" : "border-[rgb(var(--c3))] bg-[rgb(var(--c2)/50%)]"}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[rgb(var(--text-primary))] truncate">{item.name}</span>
                      <span className="text-[9px] font-bold" style={{ color: RARITY_COLORS[item.rarity] }}>
                        {item.rarity}
                      </span>
                    </div>
                    <p className="text-[rgb(var(--c4))] text-xs mb-3 line-clamp-2">{item.description}</p>
                    {canEquip ? (
                      <button
                        onClick={() => equipCosmetic(item.category, item.id)}
                        className={`w-full py-1.5 rounded-lg text-xs font-semibold ${
                          isEquipped ? "bg-[#D4AF37]/20 text-[#D4AF37]" : "bg-[rgb(var(--c3))] text-[rgb(var(--c5))]"
                        }`}
                      >
                        {isEquipped ? "Equipped" : "Equip"}
                      </button>
                    ) : (
                      <span className="block w-full text-center py-1.5 rounded-lg text-xs font-medium bg-[rgb(var(--c3))] text-[rgb(var(--c5))]">
                        Owned
                      </span>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <RoomCardManager />
      )}
    </div>
  );
}
