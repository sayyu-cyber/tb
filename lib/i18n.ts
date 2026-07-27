// lib/i18n.ts
//
// Language switch (GDD "Add language switch option for full app -
// Bangladesh, India(hindi), Dhivehi and English"). Real infrastructure -
// persisted language choice (contexts/SettingsContext.tsx), a translation
// dictionary, and a useTranslation() hook - applied to the highest-traffic
// surfaces first (bottom nav, Settings page, Home header) rather than
// attempting every string in the app in one pass.
//
// Scope note: this is a genuinely large content task, not an architecture
// problem - every other screen's hardcoded English strings just need their
// own dictionary keys added over time following the same pattern used here.
// The four Dhivehi/Hindi/Bengali translations below are a good-faith best
// effort for common, simple UI vocabulary; they have NOT been reviewed by a
// native speaker of each language and should be before this ships widely -
// Dhivehi in particular is a lower-resource language and deserves an actual
// native-speaker pass, not just this best effort.
//
// Dhivehi (Thaana script) is written right-to-left - see the dir="rtl"
// handling wired up in SettingsContext.tsx alongside this.

import { LanguageCode } from "@/types";

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  en: "English",
  dv: "ދިވެހި", // Dhivehi
  hi: "हिन्दी", // Hindi
  bn: "বাংলা", // Bengali
};

export const LANGUAGE_DIRECTION: Record<LanguageCode, "ltr" | "rtl"> = {
  en: "ltr",
  dv: "rtl",
  hi: "ltr",
  bn: "ltr",
};

type Translations = Record<LanguageCode, string>;

export const TRANSLATIONS: Record<string, Translations> = {
  // Bottom nav
  nav_home: { en: "Home", dv: "ހޯމް", hi: "होम", bn: "হোম" },
  nav_play: { en: "Play", dv: "ކުޅޭ", hi: "खेलें", bn: "খেলুন" },
  nav_weekend: { en: "Weekend", dv: "ވީކެންޑް", hi: "वीकेंड", bn: "সাপ্তাহিক" },
  nav_friends: { en: "Friends", dv: "ރަޙްމަތްތެރިން", hi: "दोस्त", bn: "বন্ধুরা" },
  nav_messages: { en: "Messages", dv: "މެސެޖް", hi: "संदेश", bn: "বার্তা" },
  nav_shop: { en: "Shop", dv: "ފިހާރަ", hi: "दुकान", bn: "দোকান" },
  nav_missions: { en: "Missions", dv: "މިޝަންތައް", hi: "मिशन", bn: "মিশন" },
  nav_rewards: { en: "Rewards", dv: "އިނާމް", hi: "पुरस्कार", bn: "পুরস্কার" },
  nav_leaderboard: { en: "Leaderboard", dv: "ލީޑަރބޯޑް", hi: "लीडरबोर्ड", bn: "লিডারবোর্ড" },
  nav_profile: { en: "Profile", dv: "ޕްރޮފައިލް", hi: "प्रोफ़ाइल", bn: "প্রোফাইল" },
  nav_settings: { en: "Settings", dv: "ސެޓިންގްސް", hi: "सेटिंग्स", bn: "সেটিংস" },

  // Settings page
  settings_title: { en: "Settings", dv: "ސެޓިންގްސް", hi: "सेटिंग्स", bn: "সেটিংস" },
  settings_subtitle: {
    en: "Customize your experience",
    dv: "ތިބާގެ ތަޖުރިބާ ބައްޓަންކުރައްވާ",
    hi: "अपने अनुभव को अनुकूलित करें",
    bn: "আপনার অভিজ্ঞতা কাস্টমাইজ করুন",
  },
  settings_preferences: { en: "Preferences", dv: "މީލާނުތައް", hi: "प्राथमिकताएं", bn: "পছন্দসমূহ" },
  settings_notifications: { en: "Notifications", dv: "ނޮޓިފިކޭޝަންތައް", hi: "सूचनाएं", bn: "বিজ্ঞপ্তি" },
  settings_sound: { en: "Sound Effects", dv: "ސައުންޑް އިފެކްޓް", hi: "ध्वनि प्रभाव", bn: "সাউন্ড ইফেক্ট" },
  settings_music: { en: "Background Music", dv: "ބެކްގްރައުންޑް މިއުޒިކް", hi: "पृष्ठभूमि संगीत", bn: "ব্যাকগ্রাউন্ড মিউজিক" },
  settings_darktheme: { en: "Dark Theme", dv: "ޑarކ ތީމް", hi: "डार्क थीम", bn: "ডার্ক থিম" },
  settings_language: { en: "Language", dv: "ބަސް", hi: "भाषा", bn: "ভাষা" },
  settings_account: { en: "Account", dv: "އެކައުންޓް", hi: "खाता", bn: "অ্যাকাউন্ট" },
  settings_logout: { en: "Log Out", dv: "ލޮގްއައުޓް", hi: "लॉग आउट", bn: "লগ আউট" },

  // Common
  common_save: { en: "Save", dv: "ސޭވް", hi: "सहेजें", bn: "সংরক্ষণ" },
  common_cancel: { en: "Cancel", dv: "ކެންސަލް", hi: "रद्द करें", bn: "বাতিল" },
  common_loading: { en: "Loading…", dv: "ލޯޑިންގ…", hi: "लोड हो रहा है…", bn: "লোড হচ্ছে…" },

  // Home
  home_title: { en: "Thaasbai", dv: "ތާސްބައި", hi: "थासबाई", bn: "থাসবাই" },
  home_tagline: {
    en: "The Home of Maldivian Card Games",
    dv: "ދިވެހި ކާޑް ގޭމްތަކުގެ ގެ",
    hi: "मालदीव के कार्ड गेम्स का घर",
    bn: "মালদ্বীপের কার্ড গেমসের ঘর",
  },
};

export function translate(key: string, lang: LanguageCode): string {
  return TRANSLATIONS[key]?.[lang] ?? TRANSLATIONS[key]?.en ?? key;
}
