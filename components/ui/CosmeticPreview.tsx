"use client";

import { CosmeticItem } from "@/types/economy";
import { PlayingCard } from "@/components/game/PlayingCard";
import { TABLE_THEME_STYLES } from "@/components/game/GameArena";
import { CategoryIcon } from "@/components/ui/icons";

/**
 * Shared "large visual preview" for a cosmetic catalogue entry - used by
 * both the Store (CosmeticShop) and Inventory, so a card back or table skin
 * looks like the exact thing you'd see equipped in a real match rather than
 * a generic category icon standing in for it.
 *
 * `cardBack` and `tableTheme` render the same procedural pattern the game
 * table itself uses (PlayingCard's `CARD_BACK_STYLES`, GameArena's
 * `TABLE_THEME_STYLES`) - one definition of what each skin looks like,
 * reused everywhere it's shown. Categories without a procedural renderer
 * (frames, emotes, victory animations, stickers, banners) fall back to the
 * existing category icon.
 */
export function CosmeticPreview({ item, className }: { item: CosmeticItem; className?: string }) {
  if (item.category === "cardBack") {
    return (
      <div className={className ?? "relative w-full h-full flex items-center justify-center"}>
        <PlayingCard rank="" suit="spades" size="lg" faceDown cardBackId={item.id} />
      </div>
    );
  }

  if (item.category === "tableTheme") {
    const theme = TABLE_THEME_STYLES[item.id] ?? TABLE_THEME_STYLES.tt_default;
    return (
      <div
        className={className ?? "relative w-full h-full overflow-hidden rounded-lg"}
        style={{ backgroundColor: theme.base }}
      >
        {theme.pattern && (
          <div className="absolute inset-0 opacity-70" style={{ backgroundImage: theme.pattern }} aria-hidden="true" />
        )}
        <div
          className="absolute inset-0"
          style={{ backgroundImage: `radial-gradient(85% 60% at 50% 0%, ${theme.glow}40, transparent 70%)` }}
          aria-hidden="true"
        />
        <div className="absolute inset-[3px] rounded-[inherit] border border-white/10" aria-hidden="true" />
      </div>
    );
  }

  return <CategoryIcon category={item.category} size={44} className="text-[rgb(var(--c4))] opacity-60" />;
}
