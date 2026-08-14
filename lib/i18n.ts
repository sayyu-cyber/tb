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

  // Friends page body (app/(main)/friends/page.tsx)
  friends_signInPrompt: { en: "Sign in to add friends and send invites.", dv: "ރަޙްމަތްތެރިން އިތުރުކުރެއްވުމަށާއި ދައުވަތު ފޮނުއްވުމަށް ސައިން އިން ކުރައްވާ.", hi: "दोस्त जोड़ने और आमंत्रण भेजने के लिए साइन इन करें।", bn: "বন্ধু যোগ করতে এবং আমন্ত্রণ পাঠাতে সাইন ইন করুন।" },
  friends_invitedToRoom: { en: "invited you to a room", dv: "ރޫމަކަށް ދައުވަތު ދެއްވައިފި", hi: "ने आपको एक रूम में आमंत्रित किया", bn: "আপনাকে একটি রুমে আমন্ত্রণ জানিয়েছে" },
  friends_join: { en: "Join", dv: "ބައިވެރިވޭ", hi: "शामिल हों", bn: "যোগ দিন" },
  friends_dismiss: { en: "Dismiss", dv: "ބާތިލްކުރޭ", hi: "खारिज करें", bn: "খারিজ করুন" },
  friends_searchPlaceholder: { en: "Search by username", dv: "ޔޫސަރނޭމުން ސާރޗްކުރައްވާ", hi: "उपयोगकर्ता नाम से खोजें", bn: "ইউজারনেম দিয়ে অনুসন্ধান করুন" },
  friends_searching: { en: "Searching…", dv: "ސާރޗްކުރަނީ…", hi: "खोज रहे हैं…", bn: "অনুসন্ধান করা হচ্ছে…" },
  friends_alreadyFriends: { en: "Friends", dv: "ރަޙްމަތްތެރިން", hi: "दोस्त", bn: "বন্ধু" },
  friends_requested: { en: "Requested", dv: "ރިކުއެސްޓްކުރެވިއްޖެ", hi: "अनुरोध किया गया", bn: "অনুরোধ করা হয়েছে" },
  friends_incoming: { en: "Incoming", dv: "ލިބެމުންދާ", hi: "आने वाले", bn: "ইনকামিং" },
  friends_noPendingRequests: { en: "No pending requests", dv: "މަޑުކުރެވިފައިވާ ރިކުއެސްޓެއް ނެތް", hi: "कोई लंबित अनुरोध नहीं", bn: "কোনো মুলতুবি অনুরোধ নেই" },
  friends_sent: { en: "Sent", dv: "ފޮނުއްވި", hi: "भेजे गए", bn: "পাঠানো হয়েছে" },
  friends_noOutgoingRequests: { en: "No outgoing requests", dv: "ފޮނުއްވި ރިކުއެސްޓެއް ނެތް", hi: "कोई आउटगोइंग अनुरोध नहीं", bn: "কোনো আউটগোয়িং অনুরোধ নেই" },
  friends_cancel: { en: "Cancel", dv: "ކެންސަލް", hi: "रद्द करें", bn: "বাতিল" },
  friends_noFriendsYet: { en: "No friends yet — search for players to add them.", dv: "އަދި ރަޙްމަތްތެރިއެއް ނެތް — ކުޅުންތެރިން ހޯއްދަވައި އިތުރުކުރައްވާ.", hi: "अभी तक कोई दोस्त नहीं — जोड़ने के लिए खिलाड़ी खोजें।", bn: "এখনো কোনো বন্ধু নেই — যোগ করতে খেলোয়াড় খুঁজুন।" },
  friends_message: { en: "Message", dv: "މެސެޖް", hi: "संदेश", bn: "বার্তা" },
  friends_remove: { en: "Remove", dv: "ނަގާ", hi: "हटाएं", bn: "সরান" },

  // Clubs (components/clubs/ClubsClient.tsx)
  clubs_signInPrompt: { en: "Sign in to join or create a club.", dv: "ކްލަބެއްގައި ބައިވެރިވުމަށް ނުވަތަ ހެއްދެވުމަށް ސައިން އިން ކުރައްވާ.", hi: "क्लब में शामिल होने या बनाने के लिए साइन इन करें।", bn: "ক্লাবে যোগ দিতে বা তৈরি করতে সাইন ইন করুন।" },
  clubs_loading: { en: "Loading…", dv: "ލޯޑިންގ…", hi: "लोड हो रहा है…", bn: "লোড হচ্ছে…" },
  clubs_browse: { en: "Browse", dv: "ބްރައުޒް", hi: "ब्राउज़ करें", bn: "ব্রাউজ করুন" },
  clubs_create: { en: "Create", dv: "ހަދާ", hi: "बनाएं", bn: "তৈরি করুন" },
  clubs_namePlaceholder: { en: "Club name", dv: "ކްލަބުގެ ނަން", hi: "क्लब का नाम", bn: "ক্লাবের নাম" },
  clubs_tagPlaceholder: { en: "Tag (e.g. MLE)", dv: "ޓެގް (މިސާލު MLE)", hi: "टैग (जैसे MLE)", bn: "ট্যাগ (যেমন MLE)" },
  clubs_descriptionPlaceholder: { en: "Description (optional)", dv: "ތަފްޞީލް (އިޚްތިޔާރީ)", hi: "विवरण (वैकल्पिक)", bn: "বিবরণ (ঐচ্ছিক)" },
  clubs_creating: { en: "Creating…", dv: "ހަދަނީ…", hi: "बनाया जा रहा है…", bn: "তৈরি করা হচ্ছে…" },
  clubs_createClub: { en: "Create Club", dv: "ކްލަބް ހަދާ", hi: "क्लब बनाएं", bn: "ক্লাব তৈরি করুন" },
  clubs_noClubsYet: { en: "No clubs yet — be the first to create one.", dv: "އަދި ކްލަބެއް ނެތް — ފުރަތަމަ ކްލަބް ހައްދަވާ ފަރާތަށްވެވަޑައިގަންނަވާ.", hi: "अभी तक कोई क्लब नहीं — पहला बनाने वाले बनें।", bn: "এখনো কোনো ক্লাব নেই — প্রথম তৈরি করুন।" },
  clubs_members: { en: "members", dv: "މެމްބަރުން", hi: "सदस्य", bn: "সদস্য" },
  clubs_join: { en: "Join", dv: "ބައިވެރިވޭ", hi: "शामिल हों", bn: "যোগ দিন" },
  clubs_membersTab: { en: "Members ({n})", dv: "މެމްބަރުން ({n})", hi: "सदस्य ({n})", bn: "সদস্য ({n})" },
  clubs_chatTab: { en: "Club Chat", dv: "ކްލަބް ޗެޓް", hi: "क्लब चैट", bn: "ক্লাব চ্যাট" },
  clubs_you: { en: "(you)", dv: "(ތިބާ)", hi: "(आप)", bn: "(আপনি)" },
  clubs_kick: { en: "Kick", dv: "ނެރޭ", hi: "निकालें", bn: "বহিষ্কার" },
  clubs_leaveClub: { en: "Leave Club", dv: "ކްލަބުން ނުކުމޭ", hi: "क्लब छोड़ें", bn: "ক্লাব ত্যাগ করুন" },
  clubs_noMessagesYet: { en: "No messages yet — say hi to your club.", dv: "އަދި މެސެޖެއް ނެތް — ކްލަބަށް ސަލާމް ދަންނަވާ.", hi: "अभी तक कोई संदेश नहीं — अपने क्लब को नमस्ते कहें।", bn: "এখনো কোনো বার্তা নেই — আপনার ক্লাবকে হ্যালো বলুন।" },
  clubs_messagePlaceholder: { en: "Message the club…", dv: "ކްލަބަށް މެސެޖްކުރައްވާ…", hi: "क्लब को संदेश भेजें…", bn: "ক্লাবে বার্তা পাঠান…" },

  // Messages (components/messages/MessagesClient.tsx)
  messages_signInPrompt: { en: "Sign in to message your friends.", dv: "ރަޙްމަތްތެރިންނަށް މެސެޖްކުރެއްވުމަށް ސައިން އިން ކުރައްވާ.", hi: "अपने दोस्तों को संदेश भेजने के लिए साइन इन करें।", bn: "বন্ধুদের বার্তা পাঠাতে সাইন ইন করুন।" },
  messages_noConversationsYet: { en: "No conversations yet — message a friend from the Friends tab.", dv: "އަދި ވާހަކައެއް ނެތް — ރަޙްމަތްތެރިން ޓެބުން ރަޙްމަތްތެރިއަކަށް މެސެޖްކުރައްވާ.", hi: "अभी तक कोई बातचीत नहीं — दोस्त टैब से किसी दोस्त को संदेश भेजें।", bn: "এখনো কোনো কথোপকথন নেই — বন্ধু ট্যাব থেকে বার্তা পাঠান।" },
  messages_youPrefix: { en: "You: ", dv: "ތިބާ: ", hi: "आप: ", bn: "আপনি: " },
  messages_noMessagesYet: { en: "No messages yet", dv: "އަދި މެސެޖެއް ނެތް", hi: "अभी तक कोई संदेश नहीं", bn: "এখনো কোনো বার্তা নেই" },
  messages_sayHelloTo: { en: "Say hello to {name}!", dv: "{name} އަށް ސަލާމް ދަންނަވާ!", hi: "{name} को नमस्ते कहें!", bn: "{name} কে হ্যালো বলুন!" },
  messages_placeholder: { en: "Message…", dv: "މެސެޖް…", hi: "संदेश…", bn: "বার্তা…" },

  // Accessible names for icon-only buttons. These are never rendered as
  // visible text - they're passed to aria-label so a screen reader
  // announces something meaningful instead of "button". Keep them short
  // and verb-first; that's how they're read out.
  a11y_goBack: { en: "Go back", dv: "ފަހަތަށް ދޭ", hi: "वापस जाएं", bn: "ফিরে যান" },
  a11y_close: { en: "Close", dv: "ބަންދުކުރޭ", hi: "बंद करें", bn: "বন্ধ করুন" },
  a11y_cancel: { en: "Cancel and go back", dv: "ކެންސަލްކޮށް ފަހަތަށް ދޭ", hi: "रद्द करके वापस जाएं", bn: "বাতিল করে ফিরে যান" },
  a11y_copyCode: { en: "Copy code", dv: "ކޯޑް ކޮޕީކުރޭ", hi: "कोड कॉपी करें", bn: "কোড কপি করুন" },
  a11y_sendMessage: { en: "Send message", dv: "މެސެޖް ފޮނުވާ", hi: "संदेश भेजें", bn: "বার্তা পাঠান" },
  a11y_search: { en: "Search", dv: "ހޯދާ", hi: "खोजें", bn: "অনুসন্ধান" },
  a11y_showPassword: { en: "Show password", dv: "ޕާސްވޯޑް ދައްކާ", hi: "पासवर्ड दिखाएं", bn: "পাসওয়ার্ড দেখান" },
  a11y_hidePassword: { en: "Hide password", dv: "ޕާސްވޯޑް ފޮރުވާ", hi: "पासवर्ड छिपाएं", bn: "পাসওয়ার্ড লুকান" },
  a11y_editProfile: { en: "Edit profile", dv: "ޕްރޮފައިލް އެޑިޓްކުރޭ", hi: "प्रोफ़ाइल संपादित करें", bn: "প্রোফাইল সম্পাদনা করুন" },
  a11y_acceptRequest: { en: "Accept friend request", dv: "ރަޙްމަތްތެރިކަމުގެ އެދުން ޤަބޫލުކުރޭ", hi: "मित्र अनुरोध स्वीकार करें", bn: "বন্ধুত্বের অনুরোধ গ্রহণ করুন" },
  a11y_declineRequest: { en: "Decline friend request", dv: "ރަޙްމަތްތެރިކަމުގެ އެދުން ދޫކޮށްލާ", hi: "मित्र अनुरोध अस्वीकार करें", bn: "বন্ধুত্বের অনুরোধ প্রত্যাখ্যান করুন" },
  a11y_addFriend: { en: "Send friend request", dv: "ރަޙްމަތްތެރިކަމުގެ އެދުން ފޮނުވާ", hi: "मित्र अनुरोध भेजें", bn: "বন্ধুত্বের অনুরোধ পাঠান" },
  a11y_openNews: { en: "Open news item", dv: "ޚަބަރު ހުޅުވާ", hi: "समाचार खोलें", bn: "সংবাদ খুলুন" },
  a11y_leaveMatch: { en: "Leave match", dv: "މެޗުން ނުކުމޭ", hi: "मैच छोड़ें", bn: "ম্যাচ ত্যাগ করুন" },

  // Leave-match confirmation (components/game/LeaveMatchButton.tsx) -
  // missed by the earlier translation rounds.
  leave_title: { en: "Leave match?", dv: "މެޗުން ނުކުންނަވަންތޯ؟", hi: "मैच छोड़ें?", bn: "ম্যাচ ত্যাগ করবেন?" },
  leave_onlineDesc: { en: "Leaving now ends the match as a forfeit — your opponent will be awarded the win.", dv: "މިހާރު ނުކުތުމުން މެޗް ފޯފީޓަކުން ނިމޭނެ — ކާމިޔާބު ލިބޭނީ ދެކޮޅު ފަރާތަށް.", hi: "अभी छोड़ने पर मैच फ़ॉरफ़ीट के रूप में समाप्त होगा — जीत आपके प्रतिद्वंद्वी को मिलेगी।", bn: "এখন চলে গেলে ম্যাচটি ফরফিট হিসেবে শেষ হবে — জয় আপনার প্রতিপক্ষ পাবে।" },
  leave_casualDesc: { en: "Leaving now ends the match and your progress will be lost.", dv: "މިހާރު ނުކުތުމުން މެޗް ނިމި، ތިބާގެ ކުރިއެރުން ގެއްލޭނެ.", hi: "अभी छोड़ने पर मैच समाप्त हो जाएगा और आपकी प्रगति खो जाएगी।", bn: "এখন চলে গেলে ম্যাচ শেষ হবে এবং আপনার অগ্রগতি হারিয়ে যাবে।" },
  leave_continuePlaying: { en: "Continue Playing", dv: "ކުޅުން ކުރިއަށް", hi: "खेलना जारी रखें", bn: "খেলা চালিয়ে যান" },
  leave_confirm: { en: "Leave", dv: "ނުކުމޭ", hi: "छोड़ें", bn: "ত্যাগ করুন" },
  leave_leaving: { en: "Leaving…", dv: "ނުކުންނަނީ…", hi: "छोड़ रहे हैं…", bn: "প্রস্থান করছে…" },

  // Casual Online queue (components/game/CasualOnlineClient.tsx) - also
  // missed by the earlier translation rounds.
  casual_finding: { en: "Finding Casual {label} Match{dots}", dv: "ކެޝުއަލް {label} މެޗް ހޯދަނީ{dots}", hi: "कैज़ुअल {label} मैच खोज रहे हैं{dots}", bn: "ক্যাজুয়াল {label} ম্যাচ খোঁজা হচ্ছে{dots}" },
  casual_mindiNeeds4: { en: "Needs 4 real players — you'll be auto-teamed with a random partner", dv: "4 ހަގީގީ ކުޅުންތެރިން ބޭނުންވޭ — ރެންޑަމް ޕާޓްނަރަކާއެކު އޮޓޯ-ޓީމްކުރެވޭނެ", hi: "4 असली खिलाड़ी चाहिए — आपको एक यादृच्छिक पार्टनर के साथ जोड़ा जाएगा", bn: "৪ জন প্রকৃত খেলোয়াড় প্রয়োজন — আপনাকে একজন এলোমেলো পার্টনারের সাথে দলবদ্ধ করা হবে" },
  // Edit Profile modal (components/profile/EditProfileModal.tsx) - also
  // missed by the earlier translation rounds.
  editprofile_title: { en: "Edit Profile", dv: "ޕްރޮފައިލް އެޑިޓްކުރޭ", hi: "प्रोफ़ाइल संपादित करें", bn: "প্রোফাইল সম্পাদনা" },
  editprofile_guestNote: { en: "You're playing as a guest — changes won't be saved after you sign out.", dv: "ތިބާ ކުޅުއްވަނީ މެހްމާނެއްގެ ގޮތުގައި — ސައިން އައުޓް ކުރެއްވުމުން ބަދަލުތައް ރައްކާނުވާނެ.", hi: "आप अतिथि के रूप में खेल रहे हैं — साइन आउट करने के बाद बदलाव सहेजे नहीं जाएंगे।", bn: "আপনি অতিথি হিসেবে খেলছেন — সাইন আউট করার পর পরিবর্তন সংরক্ষিত হবে না।" },
  editprofile_username: { en: "Username", dv: "ޔޫސަރނޭމް", hi: "उपयोगकर्ता नाम", bn: "ইউজারনেম" },
  editprofile_usernamePlaceholder: { en: "Your username", dv: "ތިބާގެ ޔޫސަރނޭމް", hi: "आपका उपयोगकर्ता नाम", bn: "আপনার ইউজারনেম" },
  editprofile_avatarColor: { en: "Avatar Color", dv: "އެވަޓާ ކުލަ", hi: "अवतार रंग", bn: "অবতার রঙ" },
  editprofile_banner: { en: "Banner", dv: "ބެނާ", hi: "बैनर", bn: "ব্যানার" },
  editprofile_save: { en: "Save Changes", dv: "ބަދަލުތައް ރައްކާކުރޭ", hi: "बदलाव सहेजें", bn: "পরিবর্তন সংরক্ষণ করুন" },
  editprofile_saving: { en: "Saving…", dv: "ރައްކާކުރަނީ…", hi: "सहेजा जा रहा है…", bn: "সংরক্ষণ করা হচ্ছে…" },
  editprofile_emptyName: { en: "Username can't be empty.", dv: "ޔޫސަރނޭމް ހުސްކޮށް ނުބެހެއްޓޭނެ.", hi: "उपयोगकर्ता नाम खाली नहीं हो सकता।", bn: "ইউজারনেম খালি রাখা যাবে না।" },
  editprofile_longName: { en: "Username must be 24 characters or fewer.", dv: "ޔޫސަރނޭމް ވާންޖެހޭނީ 24 އަކުރު ނުވަތަ އެއަށްވުރެ ކުރު އެއްޗަކަށް.", hi: "उपयोगकर्ता नाम 24 अक्षर या उससे कम होना चाहिए।", bn: "ইউজারনেম ২৪ অক্ষর বা তার কম হতে হবে।" },

  // Toast messages (contexts/ToastContext.tsx call sites). These replaced
  // blocking window.alert() dialogs, which were untranslated by nature.
  toast_signInToTopUp: { en: "Sign in to top up coins.", dv: "ކޮއިން އިތުރުކުރެއްވުމަށް ސައިން އިން ކުރައްވާ.", hi: "सिक्के टॉप अप करने के लिए साइन इन करें।", bn: "কয়েন টপ আপ করতে সাইন ইন করুন।" },
  toast_topupPending: { en: "Your {pack} top-up is pending admin approval — coins will be credited once approved.", dv: "ތިބާގެ {pack} ޓޮޕްއަޕް އެޑްމިންގެ ހުއްދައަށް ބަލަނީ — ހުއްދަ ލިބުމުން ކޮއިން ޖަމާވާނެ.", hi: "आपका {pack} टॉप-अप एडमिन की मंज़ूरी की प्रतीक्षा में है — मंज़ूरी मिलते ही सिक्के जमा हो जाएंगे।", bn: "আপনার {pack} টপ-আপ অ্যাডমিনের অনুমোদনের অপেক্ষায় — অনুমোদন পেলে কয়েন জমা হবে।" },
  toast_topupFailed: { en: "Couldn't submit your top-up request. Please try again.", dv: "ޓޮޕްއަޕް އެދުން ފޮނުވޭގޮތެއް ނުވި. އަލުން މަސައްކަތްކުރައްވާ.", hi: "आपका टॉप-अप अनुरोध सबमिट नहीं हो सका। कृपया फिर से कोशिश करें।", bn: "আপনার টপ-আপ অনুরোধ জমা দেওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।" },
  toast_vipActivated: { en: "{plan} VIP activated!", dv: "{plan} ވީއައިޕީ އެކްޓިވޭޓްވެއްޖެ!", hi: "{plan} VIP सक्रिय हो गया!", bn: "{plan} VIP সক্রিয় হয়েছে!" },
  toast_actionFailed: { en: "Something went wrong. Please try again.", dv: "ކަމެއް ގޯސްވެއްޖެ. އަލުން މަސައްކަތްކުރައްވާ.", hi: "कुछ गलत हो गया। कृपया फिर से कोशिश करें।", bn: "কিছু ভুল হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।" },
  toast_copied: { en: "Copied to clipboard", dv: "ކްލިޕްބޯޑަށް ކޮޕީވެއްޖެ", hi: "क्लिपबोर्ड पर कॉपी किया गया", bn: "ক্লিপবোর্ডে কপি হয়েছে" },
  toast_copyFailed: { en: "Couldn't copy — select the code and copy it manually.", dv: "ކޮޕީނުވި — ކޯޑް ސެލެކްޓްކޮށް އަމިއްލައަށް ކޮޕީކުރައްވާ.", hi: "कॉपी नहीं हो सका — कोड चुनकर मैन्युअल रूप से कॉपी करें।", bn: "কপি করা যায়নি — কোডটি নির্বাচন করে হাতে কপি করুন।" },
  toast_trophiesFailed: { en: "Couldn't save your match result — your trophies may not have updated.", dv: "މެޗްގެ ނަތީޖާ ރައްކާނުކުރެވުނު — ތިބާގެ ތަށިތައް އަޕްޑޭޓްނުވެ ހުރެދާނެ.", hi: "आपका मैच परिणाम सहेजा नहीं जा सका — हो सकता है आपकी ट्रॉफियां अपडेट न हुई हों।", bn: "আপনার ম্যাচের ফলাফল সংরক্ষণ করা যায়নি — আপনার ট্রফি আপডেট নাও হতে পারে।" },
  toast_forfeitFailed: { en: "Couldn't end the match cleanly — your opponent may still be waiting.", dv: "މެޗް ރަނގަޅަށް ނިންމާނުލެވުނު — ދެކޮޅު ފަރާތް އަދިވެސް ބަލަން ހުރެދާނެ.", hi: "मैच ठीक से समाप्त नहीं हो सका — आपका प्रतिद्वंद्वी अभी भी प्रतीक्षा कर सकता है।", bn: "ম্যাচটি সঠিকভাবে শেষ করা যায়নি — আপনার প্রতিপক্ষ এখনও অপেক্ষা করতে পারে।" },

  casual_noStakes: { en: "No trophies, no daily limits — just for fun", dv: "ތަށްޓެއް ނެތް، ދުވަހީ ލިމިޓެއް ނެތް — ހަމައެކަނި މަޖަލަށް", hi: "कोई ट्रॉफी नहीं, कोई दैनिक सीमा नहीं — बस मनोरंजन के लिए", bn: "কোনো ট্রফি নেই, কোনো দৈনিক সীমা নেই — শুধু মজার জন্য" },

  // Error / empty-state screens (app/error.tsx, app/not-found.tsx,
  // app/loading.tsx). global-error.tsx deliberately does NOT use these -
  // it replaces the root layout, so no provider (and therefore no
  // language setting) is available there and it stays English-only.
  error_title: { en: "Something went wrong", dv: "ކަމެއް ގޯސްވެއްޖެ", hi: "कुछ गलत हो गया", bn: "কিছু ভুল হয়েছে" },
  error_desc: { en: "That screen ran into a problem. You can try again, or head back to the home screen.", dv: "އެ ސްކްރީނަށް މައްސަލައެއް ދިމާވެއްޖެ. އަލުން މަސައްކަތްކުރެއްވިދާނެ، ނުވަތަ ހޯމް ސްކްރީނަށް އެނބުރި ވަޑައިގަންނަވާ.", hi: "उस स्क्रीन में समस्या आ गई। आप फिर से कोशिश कर सकते हैं, या होम स्क्रीन पर वापस जा सकते हैं।", bn: "সেই স্ক্রিনে একটি সমস্যা হয়েছে। আপনি আবার চেষ্টা করতে পারেন, বা হোম স্ক্রিনে ফিরে যেতে পারেন।" },
  error_tryAgain: { en: "Try Again", dv: "އަލުން މަސައްކަތްކުރޭ", hi: "फिर से कोशिश करें", bn: "আবার চেষ্টা করুন" },
  error_goHome: { en: "Go Home", dv: "ހޯމަށް ދޭ", hi: "होम पर जाएं", bn: "হোমে যান" },
  error_notFoundTitle: { en: "Page Not Found", dv: "ޞަފްޙާ ނުފެނުނު", hi: "पेज नहीं मिला", bn: "পৃষ্ঠা পাওয়া যায়নি" },
  error_notFoundDesc: { en: "That page doesn't exist, or it may have moved.", dv: "އެ ޞަފްޙާއެއް ނެތް، ނުވަތަ ބަދަލުވެފައި ވެދާނެ.", hi: "वह पेज मौजूद नहीं है, या हो सकता है वह हटा दिया गया हो।", bn: "সেই পৃষ্ঠাটি নেই, অথবা এটি সরিয়ে নেওয়া হয়েছে।" },
  error_loading: { en: "Loading…", dv: "ލޯޑްވަނީ…", hi: "लोड हो रहा है…", bn: "লোড হচ্ছে…" },

  // Shared strings reused across several screens (game lobbies, match
  // results) - kept generic on purpose to avoid near-duplicate entries.
  common_exit: { en: "Exit", dv: "ނުކުމޭ", hi: "बाहर निकलें", bn: "প্রস্থান" },
  common_rewards: { en: "Rewards", dv: "އިނާމް", hi: "पुरस्कार", bn: "পুরস্কার" },
  common_loadingMatch: { en: "Loading match…", dv: "މެޗް ލޯޑްވަނީ…", hi: "मैच लोड हो रहा है…", bn: "ম্যাচ লোড হচ্ছে…" },
  common_back: { en: "Back", dv: "ފަހަތަށް", hi: "वापस", bn: "পিছনে" },
  common_creating: { en: "Creating…", dv: "ހަދަނީ…", hi: "बनाया जा रहा है…", bn: "তৈরি করা হচ্ছে…" },
  common_joining: { en: "Joining…", dv: "ބައިވެރިވަނީ…", hi: "शामिल हो रहे हैं…", bn: "যোগ দেওয়া হচ্ছে…" },
  common_you: { en: "(you)", dv: "(ތިބާ)", hi: "(आप)", bn: "(আপনি)" },
  common_cards: { en: "cards", dv: "ކާޑް", hi: "पत्ते", bn: "কার্ড" },
  common_kick: { en: "Kick", dv: "ނެރޭ", hi: "निकालें", bn: "বহিষ্কার" },
  common_ban: { en: "Ban", dv: "ބޭން", hi: "बैन", bn: "নিষিদ্ধ" },

  // Settings page (remaining descriptions/buttons)
  settings_notifDesc: { en: "Push notifications for matches", dv: "މެޗްތަކަށް ޕުޝް ނޮޓިފިކޭޝަން", hi: "मैचों के लिए पुश सूचनाएं", bn: "ম্যাচের জন্য পুশ বিজ্ঞপ্তি" },
  settings_soundDesc: { en: "Game sounds and UI feedback", dv: "ގޭމް އަޑުތަކާއި UI ފީޑްބެކް", hi: "गेम की आवाज़ें और UI फ़ीडबैक", bn: "গেম সাউন্ড এবং UI ফিডব্যাক" },
  settings_musicDesc: { en: "Ambient game music", dv: "ގޭމްގެ ބެކްގްރައުންޑް މިއުޒިކް", hi: "परिवेश खेल संगीत", bn: "অ্যাম্বিয়েন্ট গেম মিউজিক" },
  settings_darkOn: { en: "On — switch to Light Theme", dv: "އޮން — ލައިޓް ތީމަށް ބަދަލުކުރޭ", hi: "चालू — लाइट थीम पर स्विच करें", bn: "চালু — লাইট থিমে পরিবর্তন করুন" },
  settings_darkOff: { en: "Off — switch to Dark Theme", dv: "އޮފް — ޑarކ ތީމަށް ބަދަލުކުރޭ", hi: "बंद — डार्क थीम पर स्विच करें", bn: "বন্ধ — ডার্ক থিমে পরিবর্তন করুন" },
  settings_privacy: { en: "Privacy & Security", dv: "ޕްރައިވެސީ އަދި ސެކިއުރިޓީ", hi: "गोपनीयता और सुरक्षा", bn: "গোপনীয়তা ও নিরাপত্তা" },
  settings_privacyDesc: { en: "Manage your data", dv: "ތިބާގެ ޑޭޓާ މެނޭޖްކުރައްވާ", hi: "अपना डेटा प्रबंधित करें", bn: "আপনার ডেটা পরিচালনা করুন" },
  settings_help: { en: "Help & Support", dv: "އެހީ އަދި ސަޕޯޓް", hi: "सहायता और समर्थन", bn: "সহায়তা ও সাপোর্ট" },
  settings_helpDesc: { en: "FAQs and contact", dv: "އޭއެފްކިޔޫ އަދި ގުޅުއްވުން", hi: "अक्सर पूछे जाने वाले प्रश्न और संपर्क", bn: "প্রশ্নোত্তর এবং যোগাযোগ" },
  settings_about: { en: "About", dv: "ބެހޭގޮތުން", hi: "जानकारी", bn: "সম্পর্কে" },
  settings_aboutDesc: { en: "Version 1.0.0", dv: "ވަރޝަން 1.0.0", hi: "संस्करण 1.0.0", bn: "সংস্করণ ১.০.০" },
  settings_logoutConfirm: { en: "Are you sure you want to log out?", dv: "ތިބާ ލޮގްއައުޓް ކުރައްވަން ބޭނުންތޯ؟", hi: "क्या आप वाकई लॉग आउट करना चाहते हैं?", bn: "আপনি কি নিশ্চিতভাবে লগ আউট করতে চান?" },
  settings_footerVersion: { en: "THAASBAI v1.0.0", dv: "ތާސްބައި v1.0.0", hi: "थासबाई v1.0.0", bn: "থাসবাই v1.0.0" },
  settings_footerTagline: { en: "The Home of Maldivian Card Games", dv: "ދިވެހި ކާޑް ގޭމްތަކުގެ ގެ", hi: "मालदीव के कार्ड गेम्स का घर", bn: "মালদ্বীপের কার্ড গেমসের ঘর" },
  settings_adminDesc: { en: "Manage the app", dv: "އެޕް މެނޭޖްކުރައްވާ", hi: "ऐप प्रबंधित करें", bn: "অ্যাপ পরিচালনা করুন" },

  // Home page subcomponents
  home_quickPlay: { en: "Quick Play", dv: "ކުއިކް ޕްލޭ", hi: "क्विक प्ले", bn: "কুইক প্লে" },
  home_guestBadge: { en: "GUEST", dv: "މެހްމާން", hi: "अतिथि", bn: "অতিথি" },
  home_trophiesLabel: { en: "Trophies", dv: "ތަށިތައް", hi: "ट्रॉफी", bn: "ট্রফি" },
  home_seasonEndsIn: { en: "Ends in", dv: "ނިމެނީ", hi: "समाप्त होता है", bn: "শেষ হবে" },
  home_days: { en: "days", dv: "ދުވަސް", hi: "दिन", bn: "দিন" },
  home_hours: { en: "hours", dv: "ގަޑިއިރު", hi: "घंटे", bn: "ঘণ্টা" },
  home_seasonProgress: { en: "Season progress", dv: "ސީޒަން ޕްރޮގްރެސް", hi: "सीज़न प्रगति", bn: "সিজন অগ্রগতি" },
  home_rankedMatches: { en: "Ranked Matches", dv: "ރޭންކްޑް މެޗް", hi: "रैंक्ड मैच", bn: "র‍্যাংকড ম্যাচ" },
  home_remainingOf: { en: "/ {n} remaining", dv: "/ {n} ބާކީ", hi: "/ {n} शेष", bn: "/ {n} বাকি" },
  home_weekendLeagueTitle: { en: "Weekend League", dv: "ވީކެންޑް ލީގު", hi: "वीकेंड लीग", bn: "সাপ্তাহিক লিগ" },
  home_startsIn: { en: "Starts in", dv: "ފެށެނީ", hi: "शुरू होता है", bn: "শুরু হবে" },
  home_doubleTrophiesDuring: { en: "Double trophies during Weekend League", dv: "ވީކެންޑް ލީގުގައި ދެގުނަ ތަށި", hi: "वीकेंड लीग के दौरान दोगुनी ट्रॉफियां", bn: "সাপ্তাহিক লিগে দ্বিগুণ ট্রফি" },
  home_newsUpdates: { en: "News & Updates", dv: "ޚަބަރު އަދި އަޕްޑޭޓް", hi: "समाचार और अपडेट", bn: "সংবাদ ও আপডেট" },
  home_currentRank: { en: "Current Rank", dv: "މިހާރުގެ ރޭންކް", hi: "वर्तमान रैंक", bn: "বর্তমান র‍্যাংক" },
  home_trophiesToNext: { en: "{n} trophies to {rank}", dv: "{rank} އަށް {n} ތަށި", hi: "{rank} तक {n} ट्रॉफियां", bn: "{rank} পর্যন্ত {n} ট্রফি" },
  home_dailyMatches: { en: "Daily Matches", dv: "ދުވަހީ މެޗް", hi: "दैनिक मैच", bn: "দৈনিক ম্যাচ" },
  home_resetsMidnight: { en: "Resets at midnight • Free users: 3/day", dv: "ދަންވަރު ރީސެޓްވޭ • ފްރީ ޔޫސަރުން: 3/day", hi: "आधी रात को रीसेट होता है • मुफ़्त उपयोगकर्ता: 3/दिन", bn: "মধ্যরাতে রিসেট হয় • ফ্রি ব্যবহারকারী: ৩/দিন" },
  home_ranksLocked: { en: "Ranks Locked", dv: "ރޭންކްތައް ލޮކްވެފައި", hi: "रैंक लॉक्ड", bn: "র‍্যাংক লকড" },
  home_ranksLockedDesc: { en: "Weekend League is active. Ranked matches resume Sunday.", dv: "ވީކެންޑް ލީގު މިހާރު ހިނގަނީ. ރޭންކްޑް މެޗްތައް އާދިއްތަދުވަހު ފަށާނެ.", hi: "वीकेंड लीग सक्रिय है। रैंक्ड मैच रविवार को फिर से शुरू होंगे।", bn: "সাপ্তাহিক লিগ চলছে। র‍্যাংকড ম্যাচ রবিবার পুনরায় শুরু হবে।" },
  home_weekendLeagueBadge: { en: "Weekend League", dv: "ވީކެންޑް ލީގު", hi: "वीकेंड लीग", bn: "সাপ্তাহিক লিগ" },
  home_doubleTrophies: { en: "Double Trophies!", dv: "ދެގުނަ ތަށި!", hi: "दोगुनी ट्रॉफियां!", bn: "দ্বিগুণ ট্রফি!" },

  // Login (app/(auth)/login + components/auth/LoginForm.tsx)
  login_welcomeBack: { en: "Welcome Back", dv: "މަރުޙަބާ", hi: "वापसी पर स्वागत है", bn: "আবার স্বাগতম" },
  login_joinThaasbai: { en: "Join Thaasbai", dv: "ތާސްބައި އާ ގުޅިވަޑައިގަންނަވާ", hi: "थासबाई से जुड़ें", bn: "থাসবাইতে যোগ দিন" },
  login_signInToContinue: { en: "Sign in to continue", dv: "ކުރިއަށްދިޔުމަށް ސައިން އިން ކުރައްވާ", hi: "जारी रखने के लिए साइन इन करें", bn: "চালিয়ে যেতে সাইন ইন করুন" },
  login_createAccount: { en: "Create your account", dv: "ތިބާގެ އެކައުންޓް ހައްދަވާ", hi: "अपना खाता बनाएं", bn: "আপনার অ্যাকাউন্ট তৈরি করুন" },
  login_continueGoogle: { en: "Continue with Google", dv: "ގޫގަލް އިން ކުރިއަށްދޭ", hi: "Google से जारी रखें", bn: "Google দিয়ে চালিয়ে যান" },
  login_or: { en: "or", dv: "ނުވަތަ", hi: "या", bn: "অথবা" },
  login_usernamePlaceholder: { en: "Username", dv: "ޔޫސަރނޭމް", hi: "उपयोगकर्ता नाम", bn: "ইউজারনেম" },
  login_emailPlaceholder: { en: "Email address", dv: "އީމެއިލް އެޑްރެސް", hi: "ईमेल पता", bn: "ইমেইল ঠিকানা" },
  login_passwordPlaceholder: { en: "Password", dv: "ޕާސްވޯޑް", hi: "पासवर्ड", bn: "পাসওয়ার্ড" },
  login_loading: { en: "Loading...", dv: "ލޯޑިންގ…", hi: "लोड हो रहा है...", bn: "লোড হচ্ছে..." },
  login_signIn: { en: "Sign In", dv: "ސައިން އިން", hi: "साइन इन करें", bn: "সাইন ইন" },
  login_createAccountBtn: { en: "Create Account", dv: "އެކައުންޓް ހައްދަވާ", hi: "खाता बनाएं", bn: "অ্যাকাউন্ট তৈরি করুন" },
  login_noAccount: { en: "Don't have an account?", dv: "އެކައުންޓެއް ނެތްތޯ؟", hi: "खाता नहीं है?", bn: "অ্যাকাউন্ট নেই?" },
  login_haveAccount: { en: "Already have an account?", dv: "މިހާރުވެސް އެކައުންޓެއް އެބައޮތްތޯ؟", hi: "पहले से खाता है?", bn: "ইতিমধ্যে অ্যাকাউন্ট আছে?" },
  login_signUp: { en: "Sign Up", dv: "ސައިން އަޕް", hi: "साइन अप करें", bn: "সাইন আপ" },
  login_continueAsGuest: { en: "Continue as Guest", dv: "މެހްމާނެއްގެ ގޮތުގައި ކުރިއަށްދޭ", hi: "अतिथि के रूप में जारी रखें", bn: "অতিথি হিসেবে চালিয়ে যান" },
  login_guestNote: { en: "Guest users can only access Casual Mode", dv: "މެހްމާން ޔޫސަރުންނަށް ބައިވެރިވެވޭނީ ހަމައެކަނި ކެޝުއަލް މޯޑްގައި", hi: "अतिथि उपयोगकर्ता केवल कैज़ुअल मोड एक्सेस कर सकते हैं", bn: "অতিথি ব্যবহারকারীরা শুধুমাত্র ক্যাজুয়াল মোড অ্যাক্সেস করতে পারবেন" },

  // Profile page (app/(main)/profile/page.tsx)
  profile_title: { en: "Profile", dv: "ޕްރޮފައިލް", hi: "प्रोफ़ाइल", bn: "প্রোফাইল" },
  profile_subtitle: { en: "Your stats & achievements", dv: "ތިބާގެ ތަފާސްހިސާބާއި ހާސިލްކުރުންތައް", hi: "आपके आँकड़े और उपलब्धियां", bn: "আপনার পরিসংখ্যান ও অর্জন" },
  profile_statistics: { en: "Statistics", dv: "ތަފާސްހިސާބު", hi: "आँकड़े", bn: "পরিসংখ্যান" },
  profile_achievements: { en: "Achievements", dv: "ހާސިލްކުރުންތައް", hi: "उपलब्धियां", bn: "অর্জন" },
  profile_matches: { en: "Matches", dv: "މެޗްތައް", hi: "मैच", bn: "ম্যাচ" },
  profile_wins: { en: "Wins", dv: "ކާމިޔާބުތައް", hi: "जीत", bn: "জয়" },
  profile_losses: { en: "Losses", dv: "ބަލިތައް", hi: "हार", bn: "পরাজয়" },
  profile_winPct: { en: "Win %", dv: "ކާމިޔާބު %", hi: "जीत %", bn: "জয় %" },
  profile_highestRank: { en: "Highest Rank", dv: "އެންމެ މަތީ ރޭންކް", hi: "उच्चतम रैंक", bn: "সর্বোচ্চ র‍্যাংক" },
  profile_favoriteGame: { en: "Favorite Game", dv: "ކަމުދާ ގޭމް", hi: "पसंदीदा खेल", bn: "প্রিয় গেম" },
  profile_trophies: { en: "Trophies", dv: "ތަށިތައް", hi: "ट्रॉफी", bn: "ট্রফি" },
  profile_moreComingSoon: { en: "More features coming soon", dv: "އިތުރު ފީޗާތައް އަންނަނީ", hi: "और सुविधाएं जल्द आ रही हैं", bn: "আরও ফিচার শীঘ্রই আসছে" },
  profile_guestPlayer: { en: "Guest Player", dv: "މެހްމާން ކުޅުންތެރިޔާ", hi: "अतिथि खिलाड़ी", bn: "অতিথি খেলোয়াড়" },
  profile_player: { en: "Player", dv: "ކުޅުންތެރިޔާ", hi: "खिलाड़ी", bn: "খেলোয়াড়" },
  profile_none: { en: "None", dv: "ނެތް", hi: "कोई नहीं", bn: "কোনোটিই নয়" },
  profile_unranked: { en: "Unranked", dv: "ރޭންކްނުކުރެވޭ", hi: "अरैंक्ड", bn: "অর‍্যাংকড" },

  // GameSelectCard (components/game/GameSelectCard.tsx)
  gamesel_casualMode: { en: "Casual Mode", dv: "ކެޝުއަލް މޯޑް", hi: "कैज़ुअल मोड", bn: "ক্যাজুয়াল মোড" },
  gamesel_vsAI: { en: "vs AI", dv: "އޭއައި އާ ދެކޮޅަށް", hi: "AI के खिलाफ", bn: "AI এর বিপক্ষে" },
  gamesel_passPlay: { en: "Pass & Play", dv: "ޕާސް އެންޑް ޕްލޭ", hi: "पास एंड प्ले", bn: "পাস অ্যান্ড প্লে" },
  gamesel_signInCasualOnline: { en: "Sign in for Casual Online matches", dv: "ކެޝުއަލް އޮންލައިން މެޗްތަކަށް ސައިން އިން ކުރައްވާ", hi: "कैज़ुअल ऑनलाइन मैचों के लिए साइन इन करें", bn: "ক্যাজুয়াল অনলাইন ম্যাচের জন্য সাইন ইন করুন" },
  gamesel_onlineMindi: { en: "Online (auto-teamed, no partner needed)", dv: "އޮންލައިން (އޮޓޯ-ޓީމް، ޕާޓްނަރެއް ބޭނުމެއްނުވޭ)", hi: "ऑनलाइन (ऑटो-टीम, पार्टनर की ज़रूरत नहीं)", bn: "অনলাইন (অটো-টিম, পার্টনার লাগবে না)" },
  gamesel_online: { en: "Online", dv: "އޮންލައިން", hi: "ऑनलाइन", bn: "অনলাইন" },
  gamesel_rankedMode: { en: "Ranked Mode", dv: "ރޭންކްޑް މޯޑް", hi: "रैंक्ड मोड", bn: "র‍্যাংকড মোড" },
  gamesel_signInRanked: { en: "Please sign in to access Ranked Mode", dv: "ރޭންކްޑް މޯޑަށް ވަނުމަށް ސައިން އިން ކުރައްވާ", hi: "रैंक्ड मोड एक्सेस करने के लिए साइन इन करें", bn: "র‍্যাংকড মোড অ্যাক্সেস করতে সাইন ইন করুন" },
  gamesel_playRankedDuo: { en: "Play Ranked (2v2 with a partner)", dv: "ރޭންކްޑް ކުޅޭ (ޕާޓްނަރަކާއެކު 2v2)", hi: "रैंक्ड खेलें (पार्टनर के साथ 2v2)", bn: "র‍্যাংকড খেলুন (পার্টনারসহ 2v2)" },
  gamesel_ranked1v1: { en: "Ranked 1v1", dv: "ރޭންކްޑް 1v1", hi: "रैंक्ड 1v1", bn: "র‍্যাংকড 1v1" },
  gamesel_ranked2v2: { en: "Ranked 2v2 (with a partner)", dv: "ރޭންކްޑް 2v2 (ޕާޓްނަރަކާއެކު)", hi: "रैंक्ड 2v2 (पार्टनर के साथ)", bn: "র‍্যাংকড 2v2 (পার্টনারসহ)" },
  gamesel_playWithFriends: { en: "Play with Friends", dv: "ރަޙްމަތްތެރިންނާއެކު ކުޅޭ", hi: "दोस्तों के साथ खेलें", bn: "বন্ধুদের সাথে খেলুন" },
  gamesel_signInPrivateRooms: { en: "Please sign in to use Private Rooms", dv: "ޕްރައިވެޓް ރޫމް ބޭނުންކުރުމަށް ސައިން އިން ކުރައްވާ", hi: "प्राइवेट रूम इस्तेमाल करने के लिए साइन इन करें", bn: "প্রাইভেট রুম ব্যবহার করতে সাইন ইন করুন" },
  gamesel_privateRoom: { en: "Private Room", dv: "ޕްރައިވެޓް ރޫމް", hi: "प्राइवेट रूम", bn: "প্রাইভেট রুম" },
  gamesel_close: { en: "Close", dv: "ބަންދުކުރޭ", hi: "बंद करें", bn: "বন্ধ করুন" },
  gamesel_selectMode: { en: "Select Mode", dv: "މޯޑް ހޮއްވަވާ", hi: "मोड चुनें", bn: "মোড নির্বাচন করুন" },

  // Room Lobby (components/game/RoomLobbyClient.tsx)
  roomlobby_title: { en: "Private Room", dv: "ޕްރައިވެޓް ރޫމް", hi: "प्राइवेट रूम", bn: "প্রাইভেট রুম" },
  roomlobby_subtitle: { en: "Play with friends using a room code", dv: "ރޫމް ކޯޑް ބޭނުންކޮށް ރަޙްމަތްތެރިންނާއެކު ކުޅޭ", hi: "रूम कोड से दोस्तों के साथ खेलें", bn: "রুম কোড দিয়ে বন্ধুদের সাথে খেলুন" },
  roomlobby_createRoom: { en: "Create a Room", dv: "ރޫމެއް ހައްދަވާ", hi: "एक रूम बनाएं", bn: "একটি রুম তৈরি করুন" },
  roomlobby_needCard: { en: "You need an active Room Card to create a room", dv: "ރޫމެއް ހެއްދެވުމަށް ހިނގަމުންދާ ރޫމް ކާޑެއް ބޭނުންވޭ", hi: "रूम बनाने के लिए एक सक्रिय रूम कार्ड चाहिए", bn: "রুম তৈরি করতে একটি সক্রিয় রুম কার্ড প্রয়োজন" },
  roomlobby_needCardDesc: { en: "Activate or buy one - once active, you can create unlimited rooms until it expires.", dv: "އެކްޓިވޭޓް ނުވަތަ ގަންނަވާ - އެކްޓިވްވުމުން، މުއްދަތު ހަމަނުވަނީސް ކިތަންމެ ރޫމެއް ހެއްދެވިދާނެ.", hi: "सक्रिय करें या खरीदें - एक बार सक्रिय होने पर, समाप्त होने तक असीमित रूम बना सकते हैं।", bn: "সক্রিয় করুন বা কিনুন - একবার সক্রিয় হলে, মেয়াদ শেষ না হওয়া পর্যন্ত অসীমিত রুম তৈরি করতে পারবেন।" },
  roomlobby_goToRoomCards: { en: "Go to Room Cards", dv: "ރޫމް ކާޑަށް ދޭ", hi: "रूम कार्ड पर जाएं", bn: "রুম কার্ডে যান" },
  roomlobby_joinWithCode: { en: "Join with a Code", dv: "ކޯޑަކުން ބައިވެރިވޭ", hi: "कोड से शामिल हों", bn: "কোড দিয়ে যোগ দিন" },
  roomlobby_mode: { en: "Mode", dv: "މޯޑް", hi: "मोड", bn: "মোড" },
  roomlobby_team2v2: { en: "Team 2v2 (4 players)", dv: "ޓީމް 2v2 (4 ކުޅުންތެރިން)", hi: "टीम 2v2 (4 खिलाड़ी)", bn: "টিম 2v2 (৪ জন খেলোয়াড়)" },
  roomlobby_ffa1v1: { en: "1v1 (2 players)", dv: "1v1 (2 ކުޅުންތެރިން)", hi: "1v1 (2 खिलाड़ी)", bn: "1v1 (২ জন খেলোয়াড়)" },
  roomlobby_ffaComingSoon: { en: "1v1v1 and 1v1v1v1 free-for-all modes are coming in a future update.", dv: "1v1v1 އަދި 1v1v1v1 ފްރީ-ފޯ-އޯލް މޯޑްތައް ފަހުން އަންނާނެ.", hi: "1v1v1 और 1v1v1v1 फ्री-फॉर-ऑल मोड भविष्य के अपडेट में आ रहे हैं।", bn: "1v1v1 এবং 1v1v1v1 ফ্রি-ফর-অল মোড ভবিষ্যতের আপডেটে আসছে।" },
  roomlobby_optionalPassword: { en: "Optional password (leave blank for no password)", dv: "އިޚްތިޔާރީ ޕާސްވޯޑް (ޕާސްވޯޑެއް ބޭނުންނުވާނަމަ ހުސްކޮށްލައްވާ)", hi: "वैकल्पिक पासवर्ड (कोई पासवर्ड नहीं चाहिए तो खाली छोड़ें)", bn: "ঐচ্ছিক পাসওয়ার্ড (পাসওয়ার্ড না চাইলে খালি রাখুন)" },
  roomlobby_passwordPlaceholder: { en: "Room password (optional)", dv: "ރޫމް ޕާސްވޯޑް (އިޚްތިޔާރީ)", hi: "रूम पासवर्ड (वैकल्पिक)", bn: "রুম পাসওয়ার্ড (ঐচ্ছিক)" },
  roomlobby_createRoomBtn: { en: "Create Room", dv: "ރޫމް ހައްދަވާ", hi: "रूम बनाएं", bn: "রুম তৈরি করুন" },
  roomlobby_roomCodePlaceholder: { en: "Room code", dv: "ރޫމް ކޯޑް", hi: "रूम कोड", bn: "রুম কোড" },
  roomlobby_passwordIfRequired: { en: "Password (if required)", dv: "ޕާސްވޯޑް (ބޭނުންނަމަ)", hi: "पासवर्ड (यदि आवश्यक हो)", bn: "পাসওয়ার্ড (প্রয়োজনে)" },
  roomlobby_joinRoomBtn: { en: "Join Room", dv: "ރޫމަށް ބައިވެރިވޭ", hi: "रूम में शामिल हों", bn: "রুমে যোগ দিন" },
  roomlobby_loadingRoom: { en: "Loading room…", dv: "ރޫމް ލޯޑްވަނީ…", hi: "रूम लोड हो रहा है…", bn: "রুম লোড হচ্ছে…" },
  roomlobby_bannedMsg: { en: "You were banned from this room by the owner.", dv: "ރޫމުގެ ވެރިފަރާތުން ތިބާ މި ރޫމުން ބޭން ކުރައްވައިފި.", hi: "आपको मालिक द्वारा इस रूम से बैन कर दिया गया है।", bn: "মালিক আপনাকে এই রুম থেকে নিষিদ্ধ করেছেন।" },
  roomlobby_removedMsg: { en: "You were removed from this room by the owner.", dv: "ރޫމުގެ ވެރިފަރާތުން ތިބާ މި ރޫމުން ނަންގަވައިފި.", hi: "आपको मालिक द्वारा इस रूम से हटा दिया गया है।", bn: "মালিক আপনাকে এই রুম থেকে সরিয়ে দিয়েছেন।" },
  roomlobby_backToPlay: { en: "Back to Play", dv: "ކުޅުމަށް ފަހަތަށް", hi: "प्ले पर वापस जाएं", bn: "খেলায় ফিরে যান" },
  roomlobby_closed: { en: "This room has closed.", dv: "މި ރޫމް ބަންދުވެއްޖެ.", hi: "यह रूम बंद हो गया है।", bn: "এই রুমটি বন্ধ হয়ে গেছে।" },
  roomlobby_roomCode: { en: "Room Code", dv: "ރޫމް ކޯޑް", hi: "रूम कोड", bn: "রুম কোড" },
  roomlobby_password: { en: "Password: {p}", dv: "ޕާސްވޯޑް: {p}", hi: "पासवर्ड: {p}", bn: "পাসওয়ার্ড: {p}" },
  roomlobby_players: { en: "Players ({n}/{m})", dv: "ކުޅުންތެރިން ({n}/{m})", hi: "खिलाड़ी ({n}/{m})", bn: "খেলোয়াড় ({n}/{m})" },
  roomlobby_waitingForPlayer: { en: "Waiting for player…", dv: "ކުޅުންތެރިއަކަށް ބަލަނީ…", hi: "खिलाड़ी का इंतज़ार…", bn: "খেলোয়াড়ের জন্য অপেক্ষা…" },
  roomlobby_teams: { en: "Teams", dv: "ޓީމްތައް", hi: "टीमें", bn: "দলসমূহ" },
  roomlobby_teamA: { en: "Team A", dv: "ޓީމް A", hi: "टीम A", bn: "টিম A" },
  roomlobby_teamB: { en: "Team B", dv: "ޓީމް B", hi: "टीम B", bn: "টিম B" },
  roomlobby_swapTeams: { en: "Swap Team A / Team B (partner 1)", dv: "ޓީމް A / ޓީމް B ބަދަލުކުރޭ (ޕާޓްނަރ 1)", hi: "टीम A / टीम B बदलें (पार्टनर 1)", bn: "টিম A / টিম B পরিবর্তন করুন (পার্টনার ১)" },
  roomlobby_startMatch: { en: "Start Match", dv: "މެޗް ފަށާ", hi: "मैच शुरू करें", bn: "ম্যাচ শুরু করুন" },
  roomlobby_waitingForPlayers: { en: "Waiting for players…", dv: "ކުޅުންތެރިންނަށް ބަލަނީ…", hi: "खिलाड़ियों का इंतज़ार…", bn: "খেলোয়াড়দের জন্য অপেক্ষা…" },
  roomlobby_leaveRoom: { en: "Leave Room", dv: "ރޫމުން ނުކުމޭ", hi: "रूम छोड़ें", bn: "রুম ত্যাগ করুন" },
  roomlobby_roomTitle: { en: "{game} Room", dv: "{game} ރޫމް", hi: "{game} रूम", bn: "{game} রুম" },

  // Ranked Queue (components/game/RankedQueueClient.tsx)
  rankedq_outOfMatches: { en: "Out of {reason} matches", dv: "{reason} މެޗް ހަމަވެއްޖެ", hi: "{reason} मैच समाप्त", bn: "{reason} ম্যাচ শেষ" },
  rankedq_vipMsg: { en: "You've used all {total} of your {reason} ranked matches. Come back {when}.", dv: "ތިބާގެ {reason} ރޭންކްޑް މެޗް {total} ބޭނުންކުރައްވައިފި. {when} އަނބުރާ ވަޑައިގަންނަވާ.", hi: "आपने अपने सभी {total} {reason} रैंक्ड मैच इस्तेमाल कर लिए हैं। {when} वापस आएं।", bn: "আপনি আপনার সব {total} {reason} র‍্যাংকড ম্যাচ ব্যবহার করেছেন। {when} ফিরে আসুন।" },
  rankedq_freeMsg: { en: "Free players get {daily} ranked matches a day ({weekly} a week). VIP raises the daily cap to {vip}. Come back {when}.", dv: "ފްރީ ކުޅުންތެރިންނަށް ދުވާލަކު {daily} ރޭންކްޑް މެޗް ({weekly} ހަފުތާއަކު) ލިބޭ. ވީއައިޕީ ދުވަހީ ކެޕް {vip} އަށް ބޮޑުކުރޭ. {when} އަނބުރާ ވަޑައިގަންނަވާ.", hi: "मुफ़्त खिलाड़ियों को दिन में {daily} रैंक्ड मैच मिलते हैं ({weekly} प्रति सप्ताह)। VIP दैनिक सीमा {vip} तक बढ़ाता है। {when} वापस आएं।", bn: "ফ্রি খেলোয়াড়রা দিনে {daily} র‍্যাংকড ম্যাচ পান ({weekly} সপ্তাহে)। VIP দৈনিক সীমা {vip} পর্যন্ত বাড়ায়। {when} ফিরে আসুন।" },
  rankedq_nextWeek: { en: "next week", dv: "އަންނަ ހަފުތާ", hi: "अगले सप्ताह", bn: "আগামী সপ্তাহে" },
  rankedq_tomorrow: { en: "tomorrow", dv: "މާދަމާ", hi: "कल", bn: "আগামীকাল" },
  rankedq_needsPartner: { en: "Mindi Ranked needs a partner", dv: "މިންޑި ރޭންކްޑަށް ޕާޓްނަރެއް ބޭނުންވޭ", hi: "मिंडी रैंक्ड को एक पार्टनर चाहिए", bn: "মিন্ডি র‍্যাংকডে একজন পার্টনার প্রয়োজন" },
  rankedq_needsPartnerDesc: { en: "Mindi is always 2v2 — bring a friend as your fixed partner instead of being randomly paired. Start or join a party to queue together.", dv: "މިންޑި އަބަދުވެސް 2v2 — ރެންޑަމް ޕެއަރ ކުރެވުމުގެ ބަދަލުގައި ރަޙްމަތްތެރިއަކު ފިކްސްޑް ޕާޓްނަރެއްގެ ގޮތުގައި ގެންނަވާ.", hi: "मिंडी हमेशा 2v2 है — यादृच्छिक रूप से जोड़े जाने के बजाय एक दोस्त को अपने स्थायी पार्टनर के रूप में लाएं।", bn: "মিন্ডি সবসময় 2v2 — এলোমেলোভাবে জোড়া লাগার পরিবর্তে একজন বন্ধুকে আপনার স্থায়ী পার্টনার হিসেবে আনুন।" },
  rankedq_goToRankedDuo: { en: "Go to Ranked Duo", dv: "ރޭންކްޑް ޑުއޯ އަށް ދޭ", hi: "रैंक्ड ड्यूओ पर जाएं", bn: "র‍্যাংকড ডুও-তে যান" },
  rankedq_weekendReq: { en: "Weekend League is Silver rank and up. You're {rank} with {trophies} trophies — keep playing Ranked during the week to climb.", dv: "ވީކެންޑް ލީގަކީ ސިލްވަރ ރޭންކާއި މަތި. ތިބާ ހުރީ {trophies} ތަށިހުރި {rank}ގައި — ހަފުތާ ތެރޭ ރޭންކްޑް ކުޅެގެން މައްޗަށް އަރާ.", hi: "वीकेंड लीग सिल्वर रैंक और उससे ऊपर है। आप {trophies} ट्रॉफियों के साथ {rank} हैं — चढ़ने के लिए सप्ताह के दौरान रैंक्ड खेलते रहें।", bn: "সাপ্তাহিক লিগ সিলভার র‍্যাংক এবং তার উপরে। আপনি {trophies} ট্রফি নিয়ে {rank} — উপরে উঠতে সপ্তাহ জুড়ে র‍্যাংকড খেলতে থাকুন।" },
  rankedq_matchFound: { en: "Match Found!", dv: "މެޗް ފެނިއްޖެ!", hi: "मैच मिल गया!", bn: "ম্যাচ পাওয়া গেছে!" },
  rankedq_starting: { en: "Starting {label}…", dv: "{label} ފަށަނީ…", hi: "{label} शुरू हो रहा है…", bn: "{label} শুরু হচ্ছে…" },
  rankedq_finding: { en: "Finding {prefix}{label} Match{dots}", dv: "{prefix}{label} މެޗް ހޯދަނީ{dots}", hi: "{prefix}{label} मैच खोज रहे हैं{dots}", bn: "{prefix}{label} ম্যাচ খোঁজা হচ্ছে{dots}" },
  rankedq_mindiNeeds4: { en: "Needs 4 real players — this can take a while", dv: "4 ހަގީގީ ކުޅުންތެރިން ބޭނުންވޭ — މިއަށް ވަގުތު ނަގާފާނެ", hi: "4 असली खिलाड़ी चाहिए — इसमें कुछ समय लग सकता है", bn: "৪ জন প্রকৃত খেলোয়াড় প্রয়োজন — এতে কিছুটা সময় লাগতে পারে" },
  rankedq_waitingReal: { en: "Waiting for another real player", dv: "އިތުރު ހަގީގީ ކުޅުންތެރިއަކަށް ބަލަނީ", hi: "एक और असली खिलाड़ी का इंतज़ार", bn: "আরেকজন প্রকৃত খেলোয়াড়ের জন্য অপেক্ষা" },
  rankedq_doubleTrophies: { en: "Double trophies this match!", dv: "މި މެޗުގައި ދެގުނަ ތަށި!", hi: "इस मैच में दोगुनी ट्रॉफियां!", bn: "এই ম্যাচে দ্বিগুণ ট্রফি!" },
  rankedq_rank: { en: "Rank", dv: "ރޭންކް", hi: "रैंक", bn: "র‍্যাংক" },
  rankedq_trophies: { en: "Trophies", dv: "ތަށިތައް", hi: "ट्रॉफी", bn: "ট্রফি" },
  rankedq_dailyLeft: { en: "Daily Left", dv: "ދުވަހީ ބާކީ", hi: "दैनिक शेष", bn: "দৈনিক বাকি" },
  rankedq_weeklyLeft: { en: "Weekly Left", dv: "ހަފުތާގެ ބާކީ", hi: "साप्ताहिक शेष", bn: "সাপ্তাহিক বাকি" },
  rankedq_cancel: { en: "Cancel", dv: "ކެންސަލް", hi: "रद्द करें", bn: "বাতিল করুন" },

  // Ranked Duo (components/game/RankedDuoClient.tsx)
  rankedduo_title: { en: "Ranked Duo", dv: "ރޭންކްޑް ޑުއޯ", hi: "रैंक्ड ड्यूओ", bn: "র‍্যাংকড ডুও" },
  rankedduo_subtitle: { en: "Team up with a friend, then queue together as one side.", dv: "ރަޙްމަތްތެރިއަކާ ޓީމް ހައްދަވާފައި، އެއް ފަރާތެއްގެ ގޮތުގައި ކިޔޫކުރައްވާ.", hi: "एक दोस्त के साथ टीम बनाएं, फिर एक तरफ के रूप में साथ में क्यू करें।", bn: "একজন বন্ধুর সাথে টিম করুন, তারপর একপক্ষ হিসেবে একসাথে সারিতে দাঁড়ান।" },
  rankedduo_startParty: { en: "Start a Party", dv: "ޕާޓީއެއް ފައްޓަވާ", hi: "एक पार्टी शुरू करें", bn: "একটি পার্টি শুরু করুন" },
  rankedduo_partyCode: { en: "Party code", dv: "ޕާޓީ ކޯޑް", hi: "पार्टी कोड", bn: "পার্টি কোড" },
  rankedduo_joinParty: { en: "Join Party", dv: "ޕާޓީއަށް ބައިވެރިވޭ", hi: "पार्टी में शामिल हों", bn: "পার্টিতে যোগ দিন" },
  rankedduo_loadingParty: { en: "Loading party…", dv: "ޕާޓީ ލޯޑްވަނީ…", hi: "पार्टी लोड हो रही है…", bn: "পার্টি লোড হচ্ছে…" },
  rankedduo_closed: { en: "This party has closed.", dv: "މި ޕާޓީ ބަންދުވެއްޖެ.", hi: "यह पार्टी बंद हो गई है।", bn: "এই পার্টিটি বন্ধ হয়ে গেছে।" },
  rankedduo_weekendReq: { en: "Weekend League is Silver rank and up.", dv: "ވީކެންޑް ލީގަކީ ސިލްވަރ ރޭންކާއި މަތި.", hi: "वीकेंड लीग सिल्वर रैंक और उससे ऊपर है।", bn: "সাপ্তাহিক লিগ সিলভার র‍্যাংক এবং তার উপরে।" },
  rankedduo_climbMsg: { en: "You're {rank} with {trophies} trophies — keep playing Ranked during the week to climb.", dv: "ތިބާ ހުރީ {trophies} ތަށިހުރި {rank}ގައި — ހަފުތާ ތެރޭ ރޭންކްޑް ކުޅެގެން މައްޗަށް އަރާ.", hi: "आप {trophies} ट्रॉफियों के साथ {rank} हैं — चढ़ने के लिए सप्ताह के दौरान रैंक्ड खेलते रहें।", bn: "আপনি {trophies} ট্রফি নিয়ে {rank} — উপরে উঠতে সপ্তাহ জুড়ে র‍্যাংকড খেলতে থাকুন।" },
  rankedduo_findingDuo: { en: "Finding another duo…", dv: "އިތުރު ޑުއޯއެއް ހޯދަނީ…", hi: "एक और ड्यूओ खोज रहे हैं…", bn: "আরেকটি ডুও খোঁজা হচ্ছে…" },
  rankedduo_faceTeam: { en: "You and your partner will face another team together.", dv: "ތިބާ އަދި ތިބާގެ ޕާޓްނަރ އިތުރު ޓީމަކާ ބައްދަލުކުރައްވާނެ.", hi: "आप और आपका पार्टनर एक साथ किसी अन्य टीम का सामना करेंगे।", bn: "আপনি এবং আপনার পার্টনার একসাথে অন্য একটি দলের মুখোমুখি হবেন।" },
  rankedduo_partyCodeLabel: { en: "Party Code", dv: "ޕާޓީ ކޯޑް", hi: "पार्टी कोड", bn: "পার্টি কোড" },
  rankedduo_shareWithPartner: { en: "Share this with your partner", dv: "މިއީ ތިބާގެ ޕާޓްނަރާ ހިއްސާކުރައްވާ", hi: "इसे अपने पार्टनर के साथ साझा करें", bn: "এটি আপনার পার্টনারের সাথে শেয়ার করুন" },
  rankedduo_party: { en: "Party ({n}/{m})", dv: "ޕާޓީ ({n}/{m})", hi: "पार्टी ({n}/{m})", bn: "পার্টি ({n}/{m})" },
  rankedduo_waitingForPartner: { en: "Waiting for partner…", dv: "ޕާޓްނަރަށް ބަލަނީ…", hi: "पार्टनर का इंतज़ार…", bn: "পার্টনারের জন্য অপেক্ষা…" },
  rankedduo_findMatchTogether: { en: "Find a Match Together", dv: "އެކުގައި މެޗެއް ހޯއްދަވާ", hi: "साथ में मैच खोजें", bn: "একসাথে ম্যাচ খুঁজুন" },
  rankedduo_waitingPartnerBtn: { en: "Waiting for your partner…", dv: "ތިބާގެ ޕާޓްނަރަށް ބަލަނީ…", hi: "आपके पार्टनर का इंतज़ार…", bn: "আপনার পার্টনারের জন্য অপেক্ষা…" },
  rankedduo_leaveParty: { en: "Leave Party", dv: "ޕާޓީން ނުކުމޭ", hi: "पार्टी छोड़ें", bn: "পার্টি ত্যাগ করুন" },
  rankedduo_title2: { en: "{game} Ranked Duo", dv: "{game} ރޭންކްޑް ޑުއޯ", hi: "{game} रैंक्ड ड्यूओ", bn: "{game} র‍্যাংকড ডুও" },

  // Spectator Mode (components/game/SpectateClient.tsx)
  spectate_spectating: { en: "Spectating", dv: "ބަލަނީ", hi: "देख रहे हैं", bn: "দেখছেন" },
  spectate_tensLabel: { en: "tens", dv: "ޓެންސް", hi: "टेंस", bn: "টেন" },
  mindi_trump: { en: "Trump", dv: "ޓްރަމްޕް", hi: "ट्रम्प", bn: "ট্রাম্প" },
  mindi_poolRanked: { en: "Ranked", dv: "ރޭންކްޑް", hi: "रैंक्ड", bn: "র‍্যাংকড" },
  spectate_matchEndedForfeit: { en: "Match ended by forfeit", dv: "މެޗް ނިމުނީ ފޯފީޓަކުން", hi: "मैच फ़ॉरफ़ीट से समाप्त हुआ", bn: "ফরফিটের মাধ্যমে ম্যাচ শেষ হয়েছে" },
  spectate_teamWon: { en: "Team {team} won", dv: "ޓީމް {team} ކާމިޔާބުކުރި", hi: "टीम {team} जीती", bn: "টিম {team} জিতেছে" },
  spectate_tens: { en: "Tens: A {a} — B {b}", dv: "ޓެންސް: A {a} — B {b}", hi: "टेंस: A {a} — B {b}", bn: "টেন্স: A {a} — B {b}" },
  spectate_cards: { en: "cards", dv: "ކާޑް", hi: "पत्ते", bn: "কার্ড" },
  spectate_waitingNextTrick: { en: "Waiting for the next trick…", dv: "ދެން ޖެހޭ ޓްރިކަށް ބަލަނީ…", hi: "अगली चाल का इंतज़ार…", bn: "পরবর্তী চালের জন্য অপেক্ষা…" },
  spectate_matchDraw: { en: "Match ended in a draw", dv: "މެޗް ނިމުނީ ޑްރޯއަކުން", hi: "मैच ड्रॉ में समाप्त हुआ", bn: "ম্যাচ ড্র হয়ে শেষ হয়েছে" },
  spectate_playerWon: { en: "{name} won", dv: "{name} ކާމިޔާބުކުރި", hi: "{name} जीता", bn: "{name} জিতেছে" },
  spectate_gin: { en: "Gin!", dv: "ގިން!", hi: "जिन!", bn: "জিন!" },
  spectate_stock: { en: "Stock ({n})", dv: "ސްޓޮކް ({n})", hi: "स्टॉक ({n})", bn: "স্টক ({n})" },
  spectate_discard: { en: "Discard", dv: "ޑިސްކާޑް", hi: "डिस्कार्ड", bn: "ডিসকার্ড" },
  spectate_turnDrawing: { en: "drawing", dv: "ދަމައި", hi: "खींच रहे हैं", bn: "টানছেন" },
  spectate_turnDiscarding: { en: "discarding", dv: "ދޫކުރަނީ", hi: "छोड़ रहे हैं", bn: "ছাড়ছেন" },
  spectate_playerTurn: { en: "{name}'s turn — {phase}", dv: "{name} ގެ ފުރުޞަތު — {phase}", hi: "{name} की बारी — {phase}", bn: "{name} এর পালা — {phase}" },

  // Room Cards (components/roomcards/RoomCardManager.tsx)
  roomcards_title: { en: "Room Cards", dv: "ރޫމް ކާޑް", hi: "रूम कार्ड", bn: "রুম কার্ড" },
  roomcards_desc: { en: "Creating a private room requires an active Room Card - once activated, you can create as many rooms as you like until it expires.", dv: "ޕްރައިވެޓް ރޫމެއް ހެއްދެވުމަށް ހިނގަމުންދާ ރޫމް ކާޑެއް ބޭނުންވޭ - އެކްޓިވޭޓްކުރެއްވުމުން، މުއްދަތު ހަމަނުވަނީސް ބޭނުންވަރަކަށް ރޫމް ހެއްދެވިދާނެ.", hi: "प्राइवेट रूम बनाने के लिए एक सक्रिय रूम कार्ड चाहिए - एक बार सक्रिय होने पर, समाप्त होने तक जितने चाहें उतने रूम बना सकते हैं।", bn: "প্রাইভেট রুম তৈরি করতে একটি সক্রিয় রুম কার্ড প্রয়োজন - একবার সক্রিয় হলে, মেয়াদ শেষ না হওয়া পর্যন্ত যত ইচ্ছা রুম তৈরি করতে পারবেন।" },
  roomcards_active: { en: "Active", dv: "އެކްޓިވް", hi: "सक्रिय", bn: "সক্রিয়" },
  roomcards_roomCard: { en: "{type} Room Card", dv: "{type} ރޫމް ކާޑް", hi: "{type} रूम कार्ड", bn: "{type} রুম কার্ড" },
  roomcards_unlimited: { en: "Unlimited private rooms", dv: "ހަމަނުވާ ޕްރައިވެޓް ރޫމް", hi: "असीमित प्राइवेट रूम", bn: "সীমাহীন প্রাইভেট রুম" },
  roomcards_available: { en: "Available", dv: "ލިބެންހުރި", hi: "उपलब्ध", bn: "উপলব্ধ" },
  roomcards_activateToCreate: { en: "Activate to create unlimited private rooms", dv: "ހަމަނުވާ ޕްރައިވެޓް ރޫމް ހެއްދެވުމަށް އެކްޓިވޭޓްކުރައްވާ", hi: "असीमित प्राइवेट रूम बनाने के लिए सक्रिय करें", bn: "সীমাহীন প্রাইভেট রুম তৈরি করতে সক্রিয় করুন" },
  roomcards_activate: { en: "Activate", dv: "އެކްޓިވޭޓް", hi: "सक्रिय करें", bn: "সক্রিয় করুন" },
  roomcards_noneAvailable: { en: "No room cards available", dv: "ރޫމް ކާޑެއް ނެތް", hi: "कोई रूम कार्ड उपलब्ध नहीं", bn: "কোনো রুম কার্ড উপলব্ধ নেই" },
  roomcards_getFrom: { en: "Get them from daily login, missions, or buy one below", dv: "ދުވަހީ ލޮގިން، މިޝަން، ނުވަތަ ތިރީގައި ގަނެގެން ލިބިވަޑައިގަންނަވާ", hi: "दैनिक लॉगिन, मिशन से प्राप्त करें, या नीचे से खरीदें", bn: "দৈনিক লগইন, মিশন থেকে পান, বা নিচে থেকে কিনুন" },
  roomcards_buyWithCoins: { en: "Buy with Coins", dv: "ކޮއިންއިން ގަންނަ", hi: "सिक्कों से खरीदें", bn: "কয়েন দিয়ে কিনুন" },

  // Collection (components/collection/CollectionPage.tsx)
  collection_title: { en: "Collection", dv: "ކަލެކްޝަން", hi: "संग्रह", bn: "সংগ্রহ" },
  collection_subtitle: { en: "Track and equip your cosmetics", dv: "ތިބާގެ ކޮސްމެޓިކްސް ޓްރެކްކޮށް އިކުއިޕްކުރައްވާ", hi: "अपने कॉस्मेटिक्स ट्रैक करें और इक्विप करें", bn: "আপনার কসমেটিক্স ট্র্যাক ও ইকুইপ করুন" },
  collection_overallProgress: { en: "Overall Progress", dv: "ޖުމްލަ ޕްރޮގްރެސް", hi: "समग्र प्रगति", bn: "সামগ্রিক অগ্রগতি" },
  collection_collected: { en: "{owned} / {total} Cosmetics Collected", dv: "{owned} / {total} ކޮސްމެޓިކްސް ހޯއްދަވައިފި", hi: "{owned} / {total} कॉस्मेटिक्स एकत्र किए गए", bn: "{owned} / {total} কসমেটিক্স সংগ্রহ করা হয়েছে" },
  collection_equipped: { en: "Equipped", dv: "އިކުއިޕްކުރެވިއްޖެ", hi: "इक्विप्ड", bn: "ইকুইপড" },
  collection_equip: { en: "Equip", dv: "އިކުއިޕް", hi: "इक्विप", bn: "ইকুইপ" },
  collection_legendary: { en: "Legendary Cosmetic", dv: "ލެޖެންޑަރީ ކޮސްމެޓިކް", hi: "लीजेंडरी कॉस्मेटिक", bn: "লিজেন্ডারি কসমেটিক" },
  collection_locked: { en: "Locked", dv: "ލޮކްކުރެވިފައި", hi: "लॉक्ड", bn: "লকড" },
  collection_unlockUnknown: { en: "Unlock Requirement Unknown", dv: "އަންލޮކްކުރުމަށް ބޭނުންވަނީ ކޮބައިކަން ނޭނގެ", hi: "अनलॉक आवश्यकता अज्ञात", bn: "আনলক করার শর্ত অজানা" },
  collection_cardBacks: { en: "Card Backs", dv: "ކާޑް ބެކްސް", hi: "कार्ड बैक्स", bn: "কার্ড ব্যাক" },
  collection_tableThemes: { en: "Table Themes", dv: "މޭޒުގެ ތީމް", hi: "टेबल थीम", bn: "টেবিল থিম" },
  collection_profileFrames: { en: "Profile Frames", dv: "ޕްރޮފައިލް ފްރޭމް", hi: "प्रोफ़ाइल फ्रेम", bn: "প্রোফাইল ফ্রেম" },
  collection_emotes: { en: "Emotes", dv: "އިމޯޓް", hi: "इमोट", bn: "ইমোট" },
  collection_victoryAnimations: { en: "Victory Animations", dv: "ކާމިޔާބުގެ އެނިމޭޝަން", hi: "विजय एनिमेशन", bn: "বিজয় অ্যানিমেশন" },

  // Achievements (components/achievements/AchievementsPage.tsx)
  achievements_title: { en: "Achievements", dv: "ހާސިލްކުރުންތައް", hi: "उपलब्धियां", bn: "অর্জন" },
  achievements_subtitle: { en: "Permanent milestones and rewards", dv: "ދާއިމީ މޭލްސްޓޯންތަކާއި އިނާމް", hi: "स्थायी मील के पत्थर और पुरस्कार", bn: "স্থায়ী মাইলফলক এবং পুরস্কার" },
  achievements_unlocked: { en: "Unlocked!", dv: "އަންލޮކްވެއްޖެ!", hi: "अनलॉक हो गया!", bn: "আনলক হয়েছে!" },

  // Hall of Fame (app/hall-of-fame/page.tsx + HallOfFameRow.tsx)
  hof_allTimeGreats: { en: "All-Time Greats", dv: "ހުރިހާ ޒަމާނެއްގެ ބޮޑުން", hi: "सर्वकालिक महान", bn: "সর্বকালের সেরা" },
  hof_rankedByPeak: { en: "Ranked by peak trophies", dv: "އެންމެ މަތީ ތަށިން ރޭންކްކުރެވިފައި", hi: "शिखर ट्रॉफियों के अनुसार रैंक किया गया", bn: "সর্বোচ্চ ট্রফি অনুযায়ী র‍্যাংক করা" },
  hof_noLegendsYet: { en: "No legends yet — climb the ranks to be the first name in the Hall of Fame.", dv: "އަދި ލެޖެންޑެއް ނެތް — ފޭމް ހޯލްގައި ފުރަތަމަ ނަން ކަމުގައި ވުމަށް ރޭންކްތައް އަރާ.", hi: "अभी तक कोई लीजेंड नहीं — हॉल ऑफ़ फ़ेम में पहला नाम बनने के लिए रैंक चढ़ें।", bn: "এখনো কোনো কিংবদন্তি নেই — হল অফ ফেমে প্রথম নাম হতে র‍্যাংক বাড়ান।" },
  hof_wins: { en: "wins", dv: "ކާމިޔާބުތައް", hi: "जीत", bn: "জয়" },

  // Weekend League / Tournament (app/tournament/page.tsx)
  tournament_isLive: { en: "Weekend League is live", dv: "ވީކެންޑް ލީގު މިހާރު ދަނީ", hi: "वीकेंड लीग लाइव है", bn: "সাপ্তাহিক লিগ লাইভ" },
  tournament_liveDesc: { en: "Silver rank and up, double trophies every match. Ends {time}.", dv: "ސިލްވަރ ރޭންކާއި މަތި، ކޮންމެ މެޗެއްގައި ދެގުނަ ތަށި. {time} ގައި ނިމޭ.", hi: "सिल्वर रैंक और उससे ऊपर, हर मैच में दोगुनी ट्रॉफियां। {time} पर समाप्त होता है।", bn: "সিলভার র‍্যাংক ও তার উপরে, প্রতি ম্যাচে দ্বিগুণ ট্রফি। {time} এ শেষ হয়।" },
  tournament_defaultDesc: { en: "Runs every Friday-Saturday. Reach Silver rank or higher during the week to qualify. Opens {time}.", dv: "ކޮންމެ ހުކުރު-ހޮނިހިރު ދުވަހެއްގައި ހިނގާ. ސުވާލީފައިވުމަށް ހަފުތާ ތެރޭ ސިލްވަރ ރޭންކަށް ނުވަތަ މަތިވުމަށް ވާސިލްވޭ. {time} ގައި ހުޅުވޭ.", hi: "हर शुक्रवार-शनिवार को चलता है। योग्य होने के लिए सप्ताह के दौरान सिल्वर रैंक या उससे ऊपर पहुंचें। {time} पर खुलता है।", bn: "প্রতি শুক্র-শনিবার চলে। যোগ্য হতে সপ্তাহ জুড়ে সিলভার র‍্যাংক বা তার উপরে পৌঁছান। {time} এ খোলে।" },
  tournament_notQualified: { en: "You're {rank} with {trophies} trophies — climb to Silver in Ranked to qualify.", dv: "ތިބާ ހުރީ {trophies} ތަށިހުރި {rank}ގައި — ސުވާލީފައިވުމަށް ރޭންކްޑްގައި ސިލްވަރ އަށް އަރާ.", hi: "आप {trophies} ट्रॉफियों के साथ {rank} हैं — योग्य होने के लिए रैंक्ड में सिल्वर तक चढ़ें।", bn: "আপনি {trophies} ট্রফি নিয়ে {rank} — যোগ্য হতে র‍্যাংকডে সিলভারে উঠুন।" },
  tournament_standings: { en: "This Week's Standings", dv: "މި ހަފުތާގެ ސްޓޭންޑިންގްސް", hi: "इस सप्ताह की स्टैंडिंग", bn: "এই সপ্তাহের স্ট্যান্ডিং" },
  tournament_noQualified: { en: "No qualified players yet this week.", dv: "މި ހަފުތާ އަދި ސުވާލީފައިވާ ކުޅުންތެރިއެއް ނެތް.", hi: "इस सप्ताह अभी तक कोई योग्य खिलाड़ी नहीं।", bn: "এই সপ্তাহে এখনো কোনো যোগ্য খেলোয়াড় নেই।" },

  // Player Profile body (components/game/PlayerProfileClient.tsx)
  playerprofile_watchingLive: { en: "Currently in a match — Watch Live", dv: "މިހާރު މެޗެއްގައި — ލައިވްކޮށް ބައްލަވާ", hi: "अभी एक मैच में — लाइव देखें", bn: "বর্তমানে একটি ম্যাচে — লাইভ দেখুন" },
  playerprofile_peakTrophies: { en: "Peak Trophies", dv: "އެންމެ މަތީ ތަށި", hi: "शिखर ट्रॉफी", bn: "সর্বোচ্চ ট্রফি" },
  playerprofile_winRate: { en: "Win Rate", dv: "ކާމިޔާބުވި ރޭޓް", hi: "जीत दर", bn: "জয়ের হার" },
  playerprofile_highestRankReached: { en: "Highest Rank Reached", dv: "ވާސިލްވި އެންމެ މަތީ ރޭންކް", hi: "पहुंची उच्चतम रैंक", bn: "পৌঁছানো সর্বোচ্চ র‍্যাংক" },
  playerprofile_notFound: { en: "Player not found.", dv: "ކުޅުންތެރިޔާ ނުފެނުނު.", hi: "खिलाड़ी नहीं मिला।", bn: "খেলোয়াড় পাওয়া যায়নি।" },
  playerprofile_noPlayer: { en: "No player specified.", dv: "ކުޅުންތެރިއެއް ބަޔާންކޮށްފައެއް ނެތް.", hi: "कोई खिलाड़ी निर्दिष्ट नहीं है।", bn: "কোনো খেলোয়াড় উল্লেখ করা হয়নি।" },

  // Inventory body (app/inventory/page.tsx)
  inventory_cosmetics: { en: "Cosmetics", dv: "ކޮސްމެޓިކްސް", hi: "कॉस्मेटिक्स", bn: "কসমেটিক্স" },
  inventory_roomCards: { en: "Room Cards", dv: "ރޫމް ކާޑް", hi: "रूम कार्ड", bn: "রুম কার্ড" },
  inventory_nothingHere: { en: "Nothing here yet — earn or buy items from the Shop.", dv: "އަދި މިތާ އެއްޗެއް ނެތް — ފިހާރައިން ހޯއްދަވާ ނުވަތަ ގަންނަވާ.", hi: "यहां अभी कुछ नहीं है — दुकान से आइटम कमाएं या खरीदें।", bn: "এখানে এখনো কিছু নেই — দোকান থেকে আইটেম অর্জন বা কিনুন।" },
  inventory_owned: { en: "Owned", dv: "މިލްކުވެފައި", hi: "स्वामित्व में", bn: "মালিকানাধীন" },
  inv_cardBacks: { en: "Card Backs", dv: "ކާޑް ބެކްސް", hi: "कार्ड बैक्स", bn: "কার্ড ব্যাক" },
  inv_tables: { en: "Tables", dv: "މޭޒުތައް", hi: "टेबल", bn: "টেবিল" },
  inv_frames: { en: "Frames", dv: "ފްރޭމް", hi: "फ्रेम", bn: "ফ্রেম" },
  inv_emotes: { en: "Emotes", dv: "އިމޯޓް", hi: "इमोट", bn: "ইমোট" },
  inv_victory: { en: "Victory", dv: "ކާމިޔާބު", hi: "विजय", bn: "বিজয়" },
  inv_stickers: { en: "Stickers", dv: "ސްޓިކާ", hi: "स्टिकर", bn: "স্টিকার" },
  inv_banners: { en: "Banners", dv: "ބެނާ", hi: "बैनर", bn: "ব্যানার" },

  // VIP plan panel (components/shop/CosmeticShop.tsx)
  vip_weeklyLabel: { en: "Weekly", dv: "ހަފުތާ", hi: "साप्ताहिक", bn: "সাপ্তাহিক" },
  vip_monthlyLabel: { en: "Monthly", dv: "މަހު", hi: "मासिक", bn: "মাসিক" },
  vip_activateBtn: { en: "Activate {plan} VIP", dv: "{plan} ވީއައިޕީ އެކްޓިވޭޓް", hi: "{plan} VIP सक्रिय करें", bn: "{plan} VIP সক্রিয় করুন" },
  vip_activeStatus: { en: "VIP Active — {n} days remaining", dv: "ވީއައިޕީ އެކްޓިވް — {n} ދުވަސް ބާކީ", hi: "VIP सक्रिय — {n} दिन शेष", bn: "VIP সক্রিয় — {n} দিন বাকি" },
  vip_pass: { en: "VIP Pass", dv: "ވީއައިޕީ ޕާސް", hi: "VIP पास", bn: "VIP পাস" },
  vip_benefit1: { en: "4 Ranked Matches per Day", dv: "ދުވާލަކު 4 ރޭންކްޑް މެޗް", hi: "प्रतिदिन 4 रैंक्ड मैच", bn: "প্রতিদিন ৪টি র‍্যাংকড ম্যাচ" },
  vip_benefit2: { en: "VIP Badge on Profile", dv: "ޕްރޮފައިލްގައި ވީއައިޕީ ބެޖް", hi: "प्रोफ़ाइल पर VIP बैज", bn: "প্রোফাইলে VIP ব্যাজ" },
  vip_benefit3: { en: "Exclusive Profile Frame", dv: "ޚާއްޞަ ޕްރޮފައިލް ފްރޭމް", hi: "विशेष प्रोफ़ाइल फ्रेम", bn: "একচেটিয়া প্রোফাইল ফ্রেম" },
  vip_benefit4: { en: "VIP Shop Section Access", dv: "ވީއައިޕީ ފިހާރަ ސެކްޝަނަށް ވަނުން", hi: "VIP शॉप सेक्शन एक्सेस", bn: "VIP দোকান সেকশন অ্যাক্সেস" },
  vip_benefit5: { en: "1x 24-Hour Room Card", dv: "1 × 24 ގަޑިއިރުގެ ރޫމް ކާޑް", hi: "1x 24-घंटे रूम कार्ड", bn: "১x ২৪-ঘণ্টার রুম কার্ড" },
  vip_benefit6: { en: "VIP Exclusive Cosmetics", dv: "ވީއައިޕީ ޚާއްޞަ ކޮސްމެޓިކްސް", hi: "VIP विशेष कॉस्मेटिक्स", bn: "VIP একচেটিয়া কসমেটিক্স" },

  // Mindi in-match UI (components/game/MindiOnlineClient.tsx)
  mindi_you: { en: "You", dv: "ތިބާ", hi: "आप", bn: "আপনি" },
  mindi_leftOpponent: { en: "Left opponent", dv: "ވާތުފަރާތު ދެކޮޅު", hi: "बायां प्रतिद्वंद्वी", bn: "বাম প্রতিপক্ষ" },
  mindi_partner: { en: "Partner", dv: "ޕާޓްނަރ", hi: "पार्टनर", bn: "পার্টনার" },
  mindi_rightOpponent: { en: "Right opponent", dv: "ކަނާތުފަރާތު ދެކޮޅު", hi: "दायां प्रतिद्वंद्वी", bn: "ডান প্রতিপক্ষ" },
  mindi_opponent: { en: "Opponent", dv: "ދެކޮޅު", hi: "प्रतिद्वंद्वी", bn: "প্রতিপক্ষ" },
  mindi_opponentForfeited: { en: "Opponent Forfeited", dv: "ދެކޮޅު ފޯފީޓްކުރި", hi: "प्रतिद्वंद्वी ने फ़ॉरफ़ीट किया", bn: "প্রতিপক্ষ ফরফিট করেছে" },
  mindi_youForfeited: { en: "You Forfeited", dv: "ތިބާ ފޯފީޓްކުރި", hi: "आपने फ़ॉरफ़ीट किया", bn: "আপনি ফরফিট করেছেন" },
  mindi_youWon: { en: "You Won!", dv: "ތިބާ ކާމިޔާބުކުރި!", hi: "आप जीत गए!", bn: "আপনি জিতেছেন!" },
  mindi_youLost: { en: "You Lost", dv: "ތިބާ ބަލިވެއްޖެ", hi: "आप हार गए", bn: "আপনি হেরেছেন" },
  mindi_baga: { en: "Baga — all 4 Tens!", dv: "ބަގާ — 4 ޓެންވެސް!", hi: "बागा — सभी 4 टेंस!", bn: "বাগা — সব ৪টি টেন!" },
  mindi_hukunbunye: { en: "Hukunbunye — clean sweep!", dv: "ހުކުނބުނިޔެ — ސާފު ސްވީޕެއް!", hi: "हुकुनबुन्ये — क्लीन स्वीप!", bn: "হুকুনবুন্যে — ক্লিন সুইপ!" },
  mindi_yourTeam: { en: "Your team", dv: "ތިބާގެ ޓީމް", hi: "आपकी टीम", bn: "আপনার দল" },
  mindi_opponents: { en: "Opponents", dv: "ދެކޮޅު ފަރާތްތައް", hi: "प्रतिद्वंद्वी", bn: "প্রতিপক্ষরা" },
  mindi_yourTurn: { en: "Your turn", dv: "ތިބާގެ ފުރުޞަތު", hi: "आपकी बारी", bn: "আপনার পালা" },
  mindi_waiting: { en: "Waiting…", dv: "ބަލަނީ…", hi: "इंतज़ार…", bn: "অপেক্ষা…" },
  mindi_selectCard: { en: "Select a card to play", dv: "ކުޅުމަށް ކާޑެއް ހޮއްވަވާ", hi: "खेलने के लिए एक पत्ता चुनें", bn: "খেলতে একটি কার্ড নির্বাচন করুন" },
  mindi_waitingOthers: { en: "Waiting for other players…", dv: "އެހެން ކުޅުންތެރިންނަށް ބަލަނީ…", hi: "अन्य खिलाड़ियों का इंतज़ार…", bn: "অন্যান্য খেলোয়াড়দের জন্য অপেক্ষা…" },

  // Gin Rummy in-match UI (components/game/GinRummyOnlineClient.tsx)
  gin_opponentForfeited: { en: "Opponent Forfeited", dv: "ދެކޮޅު ފޯފީޓްކުރި", hi: "प्रतिद्वंद्वी ने फ़ॉरफ़ीट किया", bn: "প্রতিপক্ষ ফরফিট করেছে" },
  gin_youForfeited: { en: "You Forfeited", dv: "ތިބާ ފޯފީޓްކުރި", hi: "आपने फ़ॉरफ़ीट किया", bn: "আপনি ফরফিট করেছেন" },
  gin_stockRanOut: { en: "Stock Ran Out — Draw", dv: "ސްޓޮކް ހުސްވެއްޖެ — ޑްރޯ", hi: "स्टॉक समाप्त — ड्रॉ", bn: "স্টক শেষ — ড্র" },
  gin_youWon: { en: "You Won!", dv: "ތިބާ ކާމިޔާބުކުރި!", hi: "आप जीत गए!", bn: "আপনি জিতেছেন!" },
  gin_youLost: { en: "You Lost", dv: "ތިބާ ބަލިވެއްޖެ", hi: "आप हार गए", bn: "আপনি হেরেছেন" },
  gin_gin: { en: "Gin!", dv: "ގިން!", hi: "जिन!", bn: "জিন!" },
  gin_undercut: { en: "Undercut!", dv: "އަންޑަރކަޓް!", hi: "अंडरकट!", bn: "আন্ডারকাট!" },
  gin_yourDeadwood: { en: "Your deadwood", dv: "ތިބާގެ ޑެޑްވުޑް", hi: "आपका डेडवुड", bn: "আপনার ডেডউড" },
  gin_opponentDeadwood: { en: "Opponent deadwood", dv: "ދެކޮޅުގެ ޑެޑްވުޑް", hi: "प्रतिद्वंद्वी का डेडवुड", bn: "প্রতিপক্ষের ডেডউড" },
  gin_points: { en: "Points", dv: "ޕޮއިންޓް", hi: "अंक", bn: "পয়েন্ট" },
  gin_yourTurn: { en: "Your turn", dv: "ތިބާގެ ފުރުޞަތު", hi: "आपकी बारी", bn: "আপনার পালা" },
  gin_opponentTurn: { en: "Opponent's turn", dv: "ދެކޮޅުގެ ފުރުޞަތު", hi: "प्रतिद्वंद्वी की बारी", bn: "প্রতিপক্ষের পালা" },
  gin_deadwood: { en: "Deadwood", dv: "ޑެޑްވުޑް", hi: "डेडवुड", bn: "ডেডউড" },
  gin_stock: { en: "Stock ({n})", dv: "ސްޓޮކް ({n})", hi: "स्टॉक ({n})", bn: "স্টক ({n})" },
  gin_discardPile: { en: "Discard pile", dv: "ޑިސްކާޑް ފައިލް", hi: "डिस्कार्ड पाइल", bn: "ডিসকার্ড পাইল" },
  gin_waitingOpponent: { en: "Waiting for opponent…", dv: "ދެކޮޅަށް ބަލަނީ…", hi: "प्रतिद्वंद्वी का इंतज़ार…", bn: "প্রতিপক্ষের জন্য অপেক্ষা…" },
  gin_drawCard: { en: "Draw a card", dv: "ކާޑެއް ދަމާ", hi: "एक पत्ता खींचें", bn: "একটি কার্ড টানুন" },
  gin_selectDiscard: { en: "Select a card to discard", dv: "ދޫކުރުމަށް ކާޑެއް ހޮއްވަވާ", hi: "छोड़ने के लिए एक पत्ता चुनें", bn: "ছাড়তে একটি কার্ড নির্বাচন করুন" },
  gin_discard: { en: "Discard", dv: "ޑިސްކާޑް", hi: "डिस्कार्ड", bn: "ডিসকার্ড" },
  gin_knock: { en: "Knock", dv: "ނޮކް", hi: "नॉक", bn: "নক" },
};

export function translate(key: string, lang: LanguageCode): string {
  return TRANSLATIONS[key]?.[lang] ?? TRANSLATIONS[key]?.en ?? key;
}
