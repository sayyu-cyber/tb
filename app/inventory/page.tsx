"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Package, Ticket, Lock, Crown, Search, Check } from "lucide-react";
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
  const [query, setQuery] = useState('');
  const [ownedOnly, setOwnedOnly] = useState(false);

  const collection = state.profile.collection as unknown as Record<string, string[]>;
  const ownedIds = new Set(collection[COLLECTION_KEY[category]] ?? []);
  // The full catalogue for this category, not just what's owned - an
  // unowned item renders locked/dimmed rather than simply not existing, so
  // a new account sees what there is to collect instead of one card lost
  // in an otherwise empty page.
  const categoryItems = ALL_COSMETICS.filter((c) => c.category === category && (!ownedOnly || ownedIds.has(c.id)) && c.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(ownedIds.has(b.id)) - Number(ownedIds.has(a.id)));

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
  const equippedItem = ALL_COSMETICS.find(item => item.id === equippedMap[category]);

  return (
    <div className="hub-page inventory-page">
      <PageHeader title={t("page_inventory")} icon={Package} actions={<span className="hub-count">{Object.values(collection).flat().length} / {ALL_COSMETICS.length}</span>} />

      <div className="hub-tabs">
        <button
          onClick={() => setTab("cosmetics")}
          aria-pressed={tab === 'cosmetics'}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
            tab === "cosmetics" ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"
          }`}
        >
          <Package size={16} /> {t("inventory_cosmetics")}
        </button>
        <button
          onClick={() => setTab("roomCards")}
          aria-pressed={tab === 'roomCards'}
          className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 ${
            tab === "roomCards" ? "bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F]" : "bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))]"
          }`}
        >
          <Ticket size={16} /> {t("inventory_roomCards")}
        </button>
      </div>

      {tab === "cosmetics" ? (
        <>
          {equippedItem && <div className="inventory-loadout"><div className="inventory-equipped-art"><CosmeticPreview item={equippedItem} /></div><div><span className="flex items-center gap-2 text-xs text-[rgb(var(--lagoon))]"><Check size={14} />{t('collection_equipped')}</span><h2 className="text-xl font-bold mt-2">{equippedItem.name}</h2><p className="text-xs text-[rgb(var(--c4))] mt-2 max-w-md">{equippedItem.description}</p></div></div>}
          <div className="hub-tabs hub-category-tabs">
            {categoryTabs.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                aria-pressed={category === cat.id}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                  category === cat.id ? "bg-[rgb(var(--gold)/20%)] text-[rgb(var(--gold-ink))] border border-[rgb(var(--gold)/30%)]" : "bg-[rgb(var(--c2))] text-[rgb(var(--c4))] border border-[rgb(var(--c3))]"
                }`}
              >
                <CategoryIcon category={cat.id} size={14} />
                {cat.label}
              </button>
            ))}
          </div>

          <div className="catalog-toolbar"><label className="hub-search"><Search size={16} /><input aria-label="Search inventory" placeholder="Search inventory" value={query} onChange={event=>setQuery(event.target.value)} /></label><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={ownedOnly} onChange={event=>setOwnedOnly(event.target.checked)} />{t('inventory_owned')}</label><span className="hub-count">{categoryItems.length}</span></div>
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
                  className={`inventory-item rounded-lg border p-3 transition-colors ${
                    isEquipped
                      ? "border-[rgb(var(--gold)/50%)] bg-[rgb(var(--gold)/5%)]"
                      : isOwned
                        ? "border-[rgb(var(--c3))] bg-[rgb(var(--c2)/50%)]"
                        : "border-[rgb(var(--c3)/60%)] bg-[rgb(var(--c2)/25%)]"
                  }`}
                >
                  <div
                    className={`cosmetic-display relative mb-2 flex items-center justify-center overflow-hidden ${
                      isOwned ? "" : "opacity-80"
                    }`}
                  >
                    <CosmeticPreview item={item} />
                    {isEquipped && (
                      <span className="absolute top-1 right-1 rounded-full bg-[rgb(var(--gold))] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide text-[#0C0E12]">
                        {t("collection_equipped")}
                      </span>
                    )}
                    {!isOwned && (
                      <span className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5">
                        <Lock size={14} className="text-[rgb(var(--c5))]" aria-hidden="true" />
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col items-start gap-1 mb-2">
                    <span
                      className={`text-sm font-medium min-h-10 ${isOwned ? "text-[rgb(var(--text-primary))]" : "text-[rgb(var(--c4))]"}`}
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
                        disabled={isEquipped}
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
