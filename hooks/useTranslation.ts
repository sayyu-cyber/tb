"use client";

import { useCallback } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { translate } from "@/lib/i18n";

// Thin wrapper around lib/i18n's dictionary, bound to the current player's
// saved language setting. Usage: const t = useTranslation(); t("nav_home").
// Unknown keys fall back to English, then to the key itself, so a screen
// that hasn't been translated yet degrades gracefully instead of crashing.
export function useTranslation() {
  const { settings } = useSettings();
  return useCallback((key: string) => translate(key, settings.language), [settings.language]);
}
