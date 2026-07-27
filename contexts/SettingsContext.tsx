"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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
  darkTheme: true,
  language: "en",
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);

  useEffect(() => {
    const saved = localStorage.getItem("thaasbai_settings");
    if (saved) {
      try {
        // Merge onto defaults so an older saved blob (from before
        // `language` existed) still ends up with a valid value.
        setSettings({ ...defaultSettings, ...JSON.parse(saved) });
      } catch {
        setSettings(defaultSettings);
      }
    }
  }, []);

  // Applies the actual theme: toggles a `.light` class on <html> whenever
  // darkTheme changes. CSS variables in styles/globals.css do the rest -
  // this used to be a toggle that did nothing.
  useEffect(() => {
    document.documentElement.classList.toggle("light", !settings.darkTheme);
  }, [settings.darkTheme]);

  // Applies the selected language's text direction to <html> - Dhivehi
  // (Thaana script) reads right-to-left, everything else left-to-right.
  useEffect(() => {
    document.documentElement.dir = LANGUAGE_DIRECTION[settings.language] ?? "ltr";
    document.documentElement.lang = settings.language;
  }, [settings.language]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("thaasbai_settings", JSON.stringify(updated));
      return updated;
    });
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
