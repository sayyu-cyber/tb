"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Bell, Volume2, Music, Moon, LogOut, Shield, HelpCircle, Info, LayoutDashboard, Languages } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { SettingButton } from "@/components/settings/SettingButton";
import { isAdminEmail } from "@/lib/admin";
import { useTranslation } from "@/hooks/useTranslation";
import { LANGUAGE_NAMES } from "@/lib/i18n";
import { LanguageCode } from "@/types";

const LANGUAGE_OPTIONS: LanguageCode[] = ["en", "dv", "hi", "bn"];

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { logout, user } = useAuth();
  const router = useRouter();
  const t = useTranslation();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="px-4 pt-6 pb-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
          <Settings size={20} className="text-[#D4AF37]" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[rgb(var(--text-primary))]">{t("settings_title")}</h1>
          <p className="text-[rgb(var(--c4))] text-xs">{t("settings_subtitle")}</p>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-4"
      >
        <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm mb-2 px-1">{t("settings_preferences")}</h3>

        <SettingToggle
          icon={Bell}
          label={t("settings_notifications")}
          description="Push notifications for matches"
          enabled={settings.notifications}
          onChange={() => updateSettings({ notifications: !settings.notifications })}
        />

        <div className="h-px bg-[rgb(var(--c2))] mx-1" />

        <SettingToggle
          icon={Volume2}
          label={t("settings_sound")}
          description="Game sounds and UI feedback"
          enabled={settings.sound}
          onChange={() => updateSettings({ sound: !settings.sound })}
        />

        <div className="h-px bg-[rgb(var(--c2))] mx-1" />

        <SettingToggle
          icon={Music}
          label={t("settings_music")}
          description="Ambient game music"
          enabled={settings.music}
          onChange={() => updateSettings({ music: !settings.music })}
        />

        <div className="h-px bg-[rgb(var(--c2))] mx-1" />

        <SettingToggle
          icon={Moon}
          label={t("settings_darktheme")}
          description={settings.darkTheme ? "On — switch to Light Theme" : "Off — switch to Dark Theme"}
          enabled={settings.darkTheme}
          onChange={() => updateSettings({ darkTheme: !settings.darkTheme })}
        />

        <div className="h-px bg-[rgb(var(--c2))] mx-1" />

        <SettingButton
          icon={Languages}
          label={t("settings_language")}
          description={LANGUAGE_NAMES[settings.language]}
          onClick={() => setShowLanguagePicker((v) => !v)}
        />

        <AnimatePresence>
          {showLanguagePicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="grid grid-cols-2 gap-2 px-1 pb-2 overflow-hidden"
            >
              {LANGUAGE_OPTIONS.map((code) => (
                <button
                  key={code}
                  onClick={() => {
                    updateSettings({ language: code });
                    setShowLanguagePicker(false);
                  }}
                  className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                    settings.language === code
                      ? "bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30"
                      : "bg-[rgb(var(--c2))] text-[rgb(var(--c4))]"
                  }`}
                >
                  {LANGUAGE_NAMES[code]}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Account */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-4"
      >
        <h3 className="text-[rgb(var(--text-primary))] font-semibold text-sm mb-2 px-1">{t("settings_account")}</h3>

        {isAdminEmail(user?.email) && (
          <>
            <SettingButton icon={LayoutDashboard} label="Admin Panel" description="Manage the app" onClick={() => router.push("/admin")} />
            <div className="h-px bg-[rgb(var(--c2))] mx-1" />
          </>
        )}

        <SettingButton
          icon={Shield}
          label="Privacy & Security"
          description="Manage your data"
          onClick={() => {}}
        />

        <div className="h-px bg-[rgb(var(--c2))] mx-1" />

        <SettingButton
          icon={HelpCircle}
          label="Help & Support"
          description="FAQs and contact"
          onClick={() => {}}
        />

        <div className="h-px bg-[rgb(var(--c2))] mx-1" />

        <SettingButton
          icon={Info}
          label="About"
          description="Version 1.0.0"
          onClick={() => {}}
        />
      </motion.div>

      {/* Logout */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <AnimatePresence>
          {showLogoutConfirm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card rounded-2xl p-4 space-y-3"
            >
              <p className="text-[rgb(var(--text-primary))] text-sm text-center">{t("settings_logoutConfirm")}</p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-[rgb(var(--c2))] text-[rgb(var(--c5))] text-sm font-medium"
                >
                  {t("common_cancel")}
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLogout}
                  className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium border border-red-500/20"
                >
                  {t("settings_logout")}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">{t("settings_logout")}</span>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-center pt-4"
      >
        <p className="text-[rgb(var(--c2))] text-[10px] tracking-wider">THAASBAI v1.0.0</p>
        <p className="text-[rgb(var(--c2))] text-[10px] mt-1">The Home of Maldivian Card Games</p>
      </motion.div>
    </div>
  );
}
