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

  // Shared PageHeader titles (components/layout/PageHeader.tsx) - used
  // across most secondary screens, so translating this one list covers a
  // lot of ground cheaply and consistently.
  page_collection: { en: "Collection", dv: "ކަލެކްޝަން", hi: "संग्रह", bn: "সংগ্রহ" },
  page_achievements: { en: "Achievements", dv: "ހާސިލްކުރުންތައް", hi: "उपलब्धियां", bn: "অর্জনসমূহ" },
  page_hallOfFame: { en: "Hall of Fame", dv: "ފޭމް ހޯލް", hi: "हॉल ऑफ़ फ़ेम", bn: "হল অফ ফেম" },
  page_inventory: { en: "Inventory", dv: "އިންވެންޓްރީ", hi: "इन्वेंटरी", bn: "ইনভেন্টরি" },
  page_friends: { en: "Friends", dv: "ރަޙްމަތްތެރިން", hi: "दोस्त", bn: "বন্ধুরা" },
  page_clubs: { en: "Clubs", dv: "ކްލަބްތައް", hi: "क्लब", bn: "ক্লাব" },
  page_admin: { en: "Admin", dv: "އެޑްމިން", hi: "एडमिन", bn: "অ্যাডমিন" },
  page_adminPanel: { en: "Admin Panel", dv: "އެޑްމިން ޕެނަލް", hi: "एडमिन पैनल", bn: "অ্যাডমিন প্যানেল" },
  page_weekendLeague: { en: "Weekend League", dv: "ވީކެންޑް ލީގު", hi: "वीकेंड लीग", bn: "সাপ্তাহিক লিগ" },
  page_shop: { en: "Shop", dv: "ފިހާރަ", hi: "दुकान", bn: "দোকান" },
  page_roomCards: { en: "Room Cards", dv: "ރޫމް ކާޑް", hi: "रूम कार्ड", bn: "রুম কার্ড" },
  page_dailyRewards: { en: "Daily Rewards", dv: "ދުވަހީ އިނާމް", hi: "दैनिक पुरस्कार", bn: "দৈনিক পুরস্কার" },
  page_missions: { en: "Missions", dv: "މިޝަންތައް", hi: "मिशन", bn: "মিশন" },
  page_messages: { en: "Messages", dv: "މެސެޖް", hi: "संदेश", bn: "বার্তা" },
  page_playerProfile: { en: "Player Profile", dv: "ކުޅުންތެރިޔާގެ ޕްރޮފައިލް", hi: "खिलाड़ी प्रोफ़ाइल", bn: "খেলোয়াড়ের প্রোফাইল" },

  // Play page
  play_title: { en: "Play", dv: "ކުޅޭ", hi: "खेलें", bn: "খেলুন" },
  play_subtitle: { en: "Choose your game", dv: "ތިބާގެ ގޭމް ހޮއްވަވާ", hi: "अपना गेम चुनें", bn: "আপনার গেম বেছে নিন" },

  // Leaderboard page
  leaderboard_title: { en: "Leaderboard", dv: "ލީޑަރބޯޑް", hi: "लीडरबोर्ड", bn: "লিডারবোর্ড" },
  leaderboard_subtitle: { en: "Top players this week", dv: "މިހަފުތާގެ އެންމެ މޮޅު ކުޅުންތެރިން", hi: "इस सप्ताह के शीर्ष खिलाड़ी", bn: "এই সপ্তাহের সেরা খেলোয়াড়" },
  leaderboard_weeklyRankings: { en: "Weekly Rankings", dv: "ހަފުތާގެ ރޭންކިންގް", hi: "साप्ताहिक रैंकिंग", bn: "সাপ্তাহিক র‍্যাংকিং" },
  leaderboard_resetsMonday: { en: "Resets every Monday", dv: "ކޮންމެ ހޯމަދުވަހަކު ރީސެޓްވޭ", hi: "हर सोमवार रीसेट होता है", bn: "প্রতি সোমবার রিসেট হয়" },

  // Friends page
  friends_tabFriends: { en: "Friends", dv: "ރަޙްމަތްތެރިން", hi: "दोस्त", bn: "বন্ধুরা" },
  friends_tabRequests: { en: "Requests", dv: "ރިކުއެސްޓްތައް", hi: "अनुरोध", bn: "অনুরোধ" },
  friends_tabSearch: { en: "Search", dv: "ސާރޗް", hi: "खोजें", bn: "অনুসন্ধান" },

  // Shop (components/shop/CosmeticShop.tsx)
  shop_headerTitle: { en: "Shop", dv: "ފިހާރަ", hi: "दुकान", bn: "দোকান" },
  shop_headerSubtitle: {
    en: "Premium cosmetics and coin packs",
    dv: "ޕްރިމިއަމް ކޮސްމެޓިކްސް އަދި ކޮއިން ޕެކްތައް",
    hi: "प्रीमियम कॉस्मेटिक्स और कॉइन पैक",
    bn: "প্রিমিয়াম কসমেটিক্স এবং কয়েন প্যাক",
  },
  shop_tabFeatured: { en: "Featured", dv: "ފީޗާޑް", hi: "फ़ीचर्ड", bn: "ফিচারড" },
  shop_tabPermanent: { en: "Permanent", dv: "ދާއިމީ", hi: "स्थायी", bn: "স্থায়ী" },
  shop_tabCoins: { en: "Coin Packs", dv: "ކޮއިން ޕެކް", hi: "कॉइन पैक", bn: "কয়েন প্যাক" },
  shop_tabVip: { en: "VIP Pass", dv: "ވީއައިޕީ ޕާސް", hi: "वीआईपी पास", bn: "ভিআইপি পাস" },
  shop_catAll: { en: "All", dv: "ހުރިހާ", hi: "सभी", bn: "সব" },
  shop_catCardBacks: { en: "Card Backs", dv: "ކާޑް ބެކްސް", hi: "कार्ड बैक्स", bn: "কার্ড ব্যাক" },
  shop_catTables: { en: "Tables", dv: "މޭޒުތައް", hi: "टेबल", bn: "টেবিল" },
  shop_catFrames: { en: "Frames", dv: "ފްރޭމް", hi: "फ्रेम", bn: "ফ্রেম" },
  shop_catEmotes: { en: "Emotes", dv: "އިމޯޓް", hi: "इमोट", bn: "ইমোট" },
  shop_catVictory: { en: "Victory", dv: "ކާމިޔާބު", hi: "विजय", bn: "বিজয়" },
  shop_catStickers: { en: "Stickers", dv: "ސްޓިކާ", hi: "स्टिकर", bn: "স্টিকার" },
  shop_catBanners: { en: "Banners", dv: "ބެނާ", hi: "बैनर", bn: "ব্যানার" },
  shop_equip: { en: "Equip", dv: "އިކުއިޕް", hi: "इक्विप", bn: "ইকুইপ" },
  shop_equipped: { en: "Equipped", dv: "އިކުއިޕްކުރެވިއްޖެ", hi: "इक्विप्ड", bn: "ইকুইপড" },
  shop_purchase: { en: "Purchase", dv: "ގަންނާ", hi: "खरीदें", bn: "ক্রয় করুন" },
  shop_weeklyFeatured: { en: "Weekly Featured", dv: "ހަފުތާގެ ފީޗާޑް", hi: "साप्ताहिक फ़ीचर्ड", bn: "সাপ্তাহিক ফিচারড" },

  // Missions panel (components/missions/MissionsPanel.tsx) - mission
  // title/description text itself comes from data templates and is not
  // translated in this pass, only the surrounding chrome.
  missions_dailyTitle: { en: "Daily Missions", dv: "ދުވަހީ މިޝަންތައް", hi: "दैनिक मिशन", bn: "দৈনিক মিশন" },
  missions_dailyReset: { en: "Resets at 00:00", dv: "00:00 ގައި ރީސެޓްވޭ", hi: "00:00 पर रीसेट होता है", bn: "০০:০০ এ রিসেট হয়" },
  missions_weeklyTitle: { en: "Weekly Missions", dv: "ހަފުތާގެ މިޝަންތައް", hi: "साप्ताहिक मिशन", bn: "সাপ্তাহিক মিশন" },
  missions_weeklyReset: { en: "Resets every Sunday", dv: "ކޮންމެ އާދިއްތަދުވަހަކު ރީސެޓްވޭ", hi: "हर रविवार रीसेट होता है", bn: "প্রতি রবিবার রিসেট হয়" },
  missions_completed: { en: "completed", dv: "ފުރިހަމަވެއްޖެ", hi: "पूर्ण", bn: "সম্পন্ন" },
  missions_allDailyComplete: {
    en: "All Daily Missions Complete! Bonus: +{n} Coins",
    dv: "ހުރިހާ ދުވަހީ މިޝަންތައް ފުރިހަމަވެއްޖެ! ބޯނަސް: +{n} ކޮއިން",
    hi: "सभी दैनिक मिशन पूर्ण! बोनस: +{n} सिक्के",
    bn: "সব দৈনিক মিশন সম্পন্ন! বোনাস: +{n} কয়েন",
  },

  // Daily Login Rewards (components/rewards/DailyLoginCalendar.tsx)
  rewards_title: { en: "Daily Login Rewards", dv: "ދުވަހީ ލޮގިން އިނާމް", hi: "दैनिक लॉगिन पुरस्कार", bn: "দৈনিক লগইন পুরস্কার" },
  rewards_subtitle: {
    en: "Come back every day for premium rewards",
    dv: "ޕްރިމިއަމް އިނާމް ހޯއްދެވުމަށް ކޮންމެ ދުވަހަކުވެސް އަނބުރާ ވަޑައިގަންނަވާ",
    hi: "प्रीमियम पुरस्कारों के लिए हर दिन वापस आएं",
    bn: "প্রিমিয়াম পুরস্কারের জন্য প্রতিদিন ফিরে আসুন",
  },
  rewards_streak: { en: "Streak: {n} days", dv: "ސްޓްރީކް: {n} ދުވަސް", hi: "स्ट्रीक: {n} दिन", bn: "স্ট্রিক: {n} দিন" },
  rewards_day: { en: "Day {n}", dv: "ދުވަސް {n}", hi: "दिन {n}", bn: "দিন {n}" },
  rewards_claimedThisCycle: { en: "{n} / 7 claimed this cycle", dv: "މި ސައިކަލްގައި {n} / 7 ނަންގަވައިފި", hi: "इस चक्र में {n} / 7 दावा किया गया", bn: "এই চক্রে {n} / 7 দাবি করা হয়েছে" },
  rewards_dayClaimed: { en: "Day {n} Claimed!", dv: "ދުވަސް {n} ނަންގަވައިފި!", hi: "दिन {n} का दावा किया गया!", bn: "দিন {n} দাবি করা হয়েছে!" },
  rewards_roomCardBonus: { en: "+ 1-Hour Room Card Bonus!", dv: "+ 1 ގަޑިއިރުގެ ރޫމް ކާޑް ބޯނަސް!", hi: "+ 1 घंटे का रूम कार्ड बोनस!", bn: "+ ১ ঘণ্টার রুম কার্ড বোনাস!" },
};

export function translate(key: string, lang: LanguageCode): string {
  return TRANSLATIONS[key]?.[lang] ?? TRANSLATIONS[key]?.en ?? key;
}
