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

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "gold", label: "Gold", gradient: "from-[#D4AF37] to-[#B8962E]" },
  { id: "ocean", label: "Ocean", gradient: "from-[#3EB4D9] to-[#1B6FA3]" },
  { id: "ruby", label: "Ruby", gradient: "from-[#E5484D] to-[#A61E27]" },
  { id: "emerald", label: "Emerald", gradient: "from-[#3EB489] to-[#1F7A5C]" },
  { id: "violet", label: "Violet", gradient: "from-[#A855F7] to-[#6B21A8]" },
  { id: "sunset", label: "Sunset", gradient: "from-[#F59E0B] to-[#D4405B]" },
  { id: "slate", label: "Slate", gradient: "from-[#64748B] to-[#334155]" },
  { id: "rose", label: "Rose", gradient: "from-[#FB7185] to-[#9F1239]" },
];

export const BANNER_PRESETS: BannerPreset[] = [
  { id: "royal-gold", label: "Royal Gold", gradient: "from-[#D4AF37]/30 via-[#1A1A1A] to-transparent" },
  { id: "deep-ocean", label: "Deep Ocean", gradient: "from-[#1B6FA3]/40 via-[#1A1A1A] to-transparent" },
  { id: "crimson", label: "Crimson", gradient: "from-[#A61E27]/40 via-[#1A1A1A] to-transparent" },
  { id: "jade", label: "Jade", gradient: "from-[#1F7A5C]/40 via-[#1A1A1A] to-transparent" },
  { id: "amethyst", label: "Amethyst", gradient: "from-[#6B21A8]/40 via-[#1A1A1A] to-transparent" },
  { id: "midnight", label: "Midnight", gradient: "from-[#0F172A] via-[#1A1A1A] to-transparent" },
];

export function getAvatarPreset(id?: string): AvatarPreset {
  return AVATAR_PRESETS.find((a) => a.id === id) ?? AVATAR_PRESETS[0];
}

export function getBannerPreset(id?: string): BannerPreset {
  return BANNER_PRESETS.find((b) => b.id === id) ?? BANNER_PRESETS[0];
}
