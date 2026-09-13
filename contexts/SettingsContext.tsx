"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { AppSettings } from "@/types";
import { LANGUAGE_DIRECTION } from "@/lib/i18n";

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: Partial<AppSettings>) => void;
}

const defaultSettings: AppSettings = {
  notifications: true,
  sound: true,
  music: false,
  language: "en",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const currentSettings = useRef(defaultSettings);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("thaasbai_settings");
      if (saved) {
        // Merge onto defaults so an older saved blob (from before
        // `language` existed) still ends up with a valid value.
        const parsed = JSON.parse(saved);
        const restored = { ...defaultSettings, ...parsed };
        if (!["en", "dv", "hi", "bn"].includes(restored.language)) restored.language = "en";
        for (const key of ["music", "sound", "notifications"] as const) {
          if (typeof restored[key] !== "boolean") restored[key] = defaultSettings[key];
        }
        currentSettings.current = restored;
        setSettings(restored);
      }
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  // Applies the selected language's text direction to <html> - Dhivehi
  // (Thaana script) reads right-to-left, everything else left-to-right.
  useEffect(() => {
    document.documentElement.dir = LANGUAGE_DIRECTION[settings.language] ?? "ltr";
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...currentSettings.current, ...newSettings };
    localStorage.setItem("thaasbai_settings", JSON.stringify(updated));
    currentSettings.current = updated;
    setSettings(updated);
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}
