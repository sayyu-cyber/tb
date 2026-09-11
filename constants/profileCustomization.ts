// constants/profileCustomization.ts
//
// Preset-based profile customization (avatar color + banner gradient).
// Deliberately preset-based rather than free-form image upload: this app
// has no Firebase Storage set up, and adding it would mean new Storage
// rules (another manual paste-in-console step) and file-upload validation
// (size/type/moderation) - real work with real risk. Presets get players
// a genuinely customizable profile today with zero new infrastructure;
// real image uploads can be a later, deliberate addition if wanted.

export interface AvatarPreset {
  id: string;
  label: string;
  gradient: string; // Tailwind gradient classes
}

export interface BannerPreset {
  id: string;
  label: string;
  gradient: string; // Tailwind gradient classes
}

/**
 * Avatar colours, drawn from the app palette rather than one-off hex.
 *
 * These were previously eight unrelated literals - including `#D4AF37`,
 * the *old* gold from before the palette existed - so every avatar in the
 * app quietly rendered off-brand and ignored the theme. Each preset is now
 * a token pair, which also means they restyle with the palette instead of
 * drifting from it.
 */
export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "gold", label: "Gold", gradient: "from-[rgb(var(--gold-bright))] to-[rgb(var(--gold-deep))]" },
  { id: "lagoon", label: "Lagoon", gradient: "from-[rgb(var(--lagoon))] to-[rgb(var(--lagoon-deep))]" },
  { id: "ocean", label: "Ocean", gradient: "from-[rgb(var(--deep))] to-[rgb(var(--deep-dark))]" },
  { id: "coral", label: "Coral", gradient: "from-[rgb(var(--coral))] to-[rgb(var(--coral-deep))]" },
  { id: "orchid", label: "Orchid", gradient: "from-[rgb(var(--orchid))] to-[rgb(var(--orchid)/60%)]" },
  { id: "sunset", label: "Sunset", gradient: "from-[rgb(var(--gold))] to-[rgb(var(--coral))]" },
  { id: "reef", label: "Reef", gradient: "from-[rgb(var(--lagoon))] to-[rgb(var(--deep))]" },
  { id: "dusk", label: "Dusk", gradient: "from-[rgb(var(--orchid))] to-[rgb(var(--deep-dark))]" },
];

/** Profile banners - same palette, faded into the page background. */
export const BANNER_PRESETS: BannerPreset[] = [
  { id: "royal-gold", label: "Royal Gold", gradient: "from-[rgb(var(--gold)/30%)] via-[rgb(var(--c2))] to-transparent" },
  { id: "deep-ocean", label: "Deep Ocean", gradient: "from-[rgb(var(--deep)/40%)] via-[rgb(var(--c2))] to-transparent" },
  { id: "lagoon", label: "Lagoon", gradient: "from-[rgb(var(--lagoon)/35%)] via-[rgb(var(--c2))] to-transparent" },
  { id: "crimson", label: "Crimson", gradient: "from-[rgb(var(--coral)/40%)] via-[rgb(var(--c2))] to-transparent" },
  { id: "amethyst", label: "Amethyst", gradient: "from-[rgb(var(--orchid)/40%)] via-[rgb(var(--c2))] to-transparent" },
  { id: "midnight", label: "Midnight", gradient: "from-[rgb(var(--deep-dark))] via-[rgb(var(--c2))] to-transparent" },
];

/**
 * Ids from the pre-palette preset set, mapped to their nearest replacement.
 *
 * Players' choices are already persisted as an id string on
 * `players/{uid}.avatarPreset`, so dropping the old ids outright would have
 * silently reset everyone who picked one back to gold. These aliases keep
 * an existing choice pointing at the closest colour we still ship.
 */
const LEGACY_AVATAR_IDS: Record<string, string> = {
  ruby: "coral",
  rose: "coral",
  emerald: "lagoon",
  violet: "orchid",
  slate: "reef",
};

const LEGACY_BANNER_IDS: Record<string, string> = {
  jade: "lagoon",
};

export function getAvatarPreset(id?: string): AvatarPreset {
  const resolved = id ? LEGACY_AVATAR_IDS[id] ?? id : id;
  return AVATAR_PRESETS.find((a) => a.id === resolved) ?? AVATAR_PRESETS[0];
}

export function getBannerPreset(id?: string): BannerPreset {
  const resolved = id ? LEGACY_BANNER_IDS[id] ?? id : id;
  return BANNER_PRESETS.find((b) => b.id === resolved) ?? BANNER_PRESETS[0];
}
