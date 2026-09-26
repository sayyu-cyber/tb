// src/components/collection/CollectionPage.tsx
'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useEconomy } from '@/contexts/EconomyContext';
import { useTranslation } from '@/hooks/useTranslation';
import { ALL_COSMETICS } from '@/data/cosmetics';
import type { CosmeticCategory } from '@/types/economy';
import { Meter } from '@/components/arena';
import { CategoryChips, CosmeticTile, type TileAction } from '@/components/inventory/InventoryPieces';

/**
 * Collection — design/arena/screens/app/app-03-inventory.jpg.
 *
 * APP_SCREENS.md: "Collection and Room Cards use the Inventory board's
 * pieces". So this is the same `.chips` row and the same `.tile` grid, with
 * Collection's own framing: everything there is to collect, and how far
 * along you are.
 *
 * CODE ISSUE 4. This page used to declare its own totals - 25 card backs,
 * 12 tables, 18 frames, 30 emotes, 8 victory animations, 93 in all - while
 * the catalogue holds 56 items across seven categories. It then filled the
 * gap with "???" tiles for cosmetics that do not exist, so a completed
 * collection read as roughly 60% and could never reach 100%. Every total
 * here is now counted from ALL_COSMETICS, the "???" tiles are gone, and the
 * two categories the old list omitted entirely (stickers and banners) are
 * included. See also the Master Collector target in data/cosmetics.ts.
 */

const CATEGORIES: { id: CosmeticCategory; labelKey: string; collection: string }[] = [
  { id: 'cardBack', labelKey: 'collection_cardBacks', collection: 'cardBacks' },
  { id: 'tableTheme', labelKey: 'collection_tableThemes', collection: 'tableThemes' },
  { id: 'profileFrame', labelKey: 'collection_profileFrames', collection: 'profileFrames' },
  { id: 'emote', labelKey: 'collection_emotes', collection: 'emotes' },
  { id: 'victoryAnimation', labelKey: 'collection_victoryAnimations', collection: 'victoryAnimations' },
  { id: 'sticker', labelKey: 'inv_stickers', collection: 'stickers' },
  { id: 'banner', labelKey: 'inv_banners', collection: 'banners' },
];

export default function CollectionPage() {
  const { user } = useAuth();
  const { state, equipCosmetic } = useEconomy();
  const t = useTranslation();
  const [category, setCategory] = useState<CosmeticCategory>('cardBack');

  const collection = state.profile.collection as unknown as Record<string, string[]>;
  const equipped = state.profile.equipped as unknown as Record<string, string>;
  const initial = (user?.displayName ?? 'P').charAt(0).toUpperCase();

  const totals = useMemo(() => {
    const byCategory = new Map<string, number>();
    for (const item of ALL_COSMETICS) byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + 1);
    return byCategory;
  }, []);

  const owned = useMemo(() => {
    const ids = new Set<string>();
    for (const { collection: key } of CATEGORIES) for (const id of collection[key] ?? []) ids.add(id);
    return ids;
  }, [collection]);

  const chips = CATEGORIES.map(({ id, labelKey, collection: key }) => ({
    id,
    label: t(labelKey),
    owned: (collection[key] ?? []).filter(cosmeticId =>
      ALL_COSMETICS.some(item => item.id === cosmeticId && item.category === id)
    ).length,
    total: totals.get(id) ?? 0,
  }));

  const collected = ALL_COSMETICS.filter(item => owned.has(item.id)).length;
  const catalogue = ALL_COSMETICS.length;
  const percentage = catalogue ? Math.round((collected / catalogue) * 100) : 0;
  const wearable = category !== 'emote' && category !== 'sticker';
  const items = ALL_COSMETICS.filter(item => item.category === category);

  function actionFor(item: (typeof ALL_COSMETICS)[number]): TileAction {
    const isOwned = owned.has(item.id);
    if (isOwned && wearable && equipped[item.category] === item.id) return { kind: 'equipped' };
    if (isOwned) return { kind: 'equip', onEquip: () => equipCosmetic(item.category, item.id) };
    if (item.isVipExclusive && !state.profile.vip?.active) return { kind: 'vip' };
    // Collection shows what there is to collect; buying happens in the
    // Shop, so an unowned item here reads as its price and nothing more.
    return { kind: 'buy', price: item.price, affordable: false, onBuy: () => {} };
  }

  return (
    <div className="arena-inventory ar-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="phead">
        <div>
          <span className="lbl dash" style={{ color: '#C6FF33' }}>Every cosmetic in the game.</span>
          <h1 className="disp chrome ar-h1">{t('page_collection')}</h1>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
          <span style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <b className="num" style={{ fontSize: '34px' }}>{percentage}%</b>
            <span className="muted">
              {t('collection_collected').replace('{owned}', String(collected)).replace('{total}', String(catalogue))}
            </span>
          </span>
          <Meter
            value={catalogue ? collected / catalogue : 0}
            tone="blue"
            segmented
            label="Collection progress"
            valueText={`${collected} of ${catalogue} cosmetics`}
            className="inv-meter"
          />
        </div>
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="inv-toolbar">
          <CategoryChips categories={chips} value={category} onChange={setCategory} />
        </div>
        <div className="inv-grid">
          {items.map(item => (
            <CosmeticTile
              key={item.id}
              item={item}
              owned={owned.has(item.id)}
              action={actionFor(item)}
              initial={initial}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
