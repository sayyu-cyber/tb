import type { CosmeticCategory } from "@/types/economy";

/**
 * A cosmetic category, written for a person.
 *
 * CODE ISSUE 11. The purchase dialog printed `{item.rarity} / {item.category}`,
 * so it read "Epic / cardBack" - the internal id, camel case and all. The
 * boards write "EPIC · CARD BACK". These are the labels the boards use, and
 * every place that shows a category now goes through here, so the dialog,
 * the item card and the rarity line can't drift apart again.
 *
 * Deliberately not translated: the label sits beside the rarity, which is
 * also English in the data (`Rarity` is a union of 'Common' | 'Rare' | ...),
 * so translating one half would read worse than translating neither. When
 * rarities get translated, this should follow in the same change.
 */
const LABELS: Record<CosmeticCategory, string> = {
  cardBack: "Card Back",
  tableTheme: "Table",
  profileFrame: "Frame",
  emote: "Emote",
  victoryAnimation: "Victory",
  sticker: "Sticker",
  banner: "Banner",
};

export function categoryLabel(category: CosmeticCategory | string): string {
  return LABELS[category as CosmeticCategory]
    // An unknown category is spaced out rather than printed raw, so a new
    // one added without touching this file still reads as words.
    ?? String(category).replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()).trim();
}
