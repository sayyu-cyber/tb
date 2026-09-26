import { ALL_COSMETICS, ROOM_CARD_PRICES } from "@/data/cosmetics";

/**
 * What a daily-login bonus actually is, named.
 *
 * CODE ISSUE 7. The claim popup showed "+ 1-Hour Room Card Bonus!" whenever
 * a day had any bonus at all - so Day 3, which gives the GG sticker, and
 * Day 5, which gives the Maldives Wave banner, both promised a Room Card
 * that never arrived. Only Day 7 gives one.
 *
 * The bonus id is now looked up: a cosmetic gets its own name from the
 * catalogue, and the room-card token gets a readable duration. The Rewards
 * board writes these as "+ GG Sticker", "+ Maldives Wave banner" and
 * "+ 1-Hour Room Card", which is exactly what this produces.
 */

/** "room_card_1h" -> "1-Hour Room Card". */
const ROOM_CARD_LABELS: Record<string, string> = {
  "1h": "1-Hour", "3h": "3-Hour", "6h": "6-Hour", "24h": "24-Hour", "1w": "1-Week", "1m": "1-Month",
};

export function bonusLabel(bonusItem: string | undefined): string | null {
  if (!bonusItem) return null;

  const roomCard = bonusItem.match(/^room_card_(.+)$/);
  if (roomCard) {
    const duration = roomCard[1];
    const label = ROOM_CARD_LABELS[duration]
      // An unknown duration still reads as words rather than as the token.
      ?? (duration in ROOM_CARD_PRICES ? duration : duration.toUpperCase());
    return `${label} Room Card`;
  }

  const cosmetic = ALL_COSMETICS.find((item) => item.id === bonusItem);
  if (cosmetic) {
    // The board writes the category in lower case after the name, except
    // for stickers where the name already carries it.
    const suffix = cosmetic.category === "sticker" ? "Sticker"
      : cosmetic.category === "banner" ? "banner"
      : cosmetic.category === "profileFrame" ? "frame"
      : cosmetic.category === "cardBack" ? "card back"
      : cosmetic.category === "tableTheme" ? "table"
      : "";
    return suffix ? `${cosmetic.name} ${suffix}` : cosmetic.name;
  }

  // An id nothing recognises says nothing rather than promising the wrong
  // thing - which is the bug this file exists to fix.
  return null;
}
