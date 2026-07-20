"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Bell, Volume2, Music, Moon, LogOut, Shield, HelpCircle, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { SettingButton } from "@/components/settings/SettingButton";

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { logout, user } = useAuth();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

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
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-[#3A3A3A] text-xs">Customize your experience</p>
        </div>
      </motion.div>

      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card rounded-2xl p-4"
      >
        <h3 className="text-white font-semibold text-sm mb-2 px-1">Preferences</h3>

        <SettingToggle
          icon={Bell}
          label="Notifications"
          description="Push notifications for matches"
          enabled={settings.notifications}
          onChange={() => updateSettings({ notifications: !settings.notifications })}
        />

        <div className="h-px bg-[#1A1A1A] mx-1" />

        <SettingToggle
          icon={Volume2}
          label="Sound Effects"
          description="Game sounds and UI feedback"
          enabled={settings.sound}
          onChange={() => updateSettings({ sound: !settings.sound })}
        />

        <div className="h-px bg-[#1A1A1A] mx-1" />

        <SettingToggle
          icon={Music}
          label="Background Music"
          description="Ambient game music"
          enabled={settings.music}
          onChange={() => updateSettings({ music: !settings.music })}
        />

        <div className="h-px bg-[#1A1A1A] mx-1" />

        <SettingToggle
          icon={Moon}
          label="Dark Theme"
          description="Always use dark mode"
          enabled={settings.darkTheme}
          onChange={() => updateSettings({ darkTheme: !settings.darkTheme })}
        />
      </motion.div>

      {/* Account */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-card rounded-2xl p-4"
      >
        <h3 className="text-white font-semibold text-sm mb-2 px-1">Account</h3>

        <SettingButton
          icon={Shield}
          label="Privacy & Security"
          description="Manage your data"
          onClick={() => {}}
        />

        <div className="h-px bg-[#1A1A1A] mx-1" />

        <SettingButton
          icon={HelpCircle}
          label="Help & Support"
          description="FAQs and contact"
          onClick={() => {}}
        />

        <div className="h-px bg-[#1A1A1A] mx-1" />

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
              <p className="text-white text-sm text-center">Are you sure you want to log out?</p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 py-3 rounded-xl bg-[#1A1A1A] text-[#888888] text-sm font-medium"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleLogout}
                  className="flex-1 py-3 rounded-xl bg-red-500/10 text-red-400 text-sm font-medium border border-red-500/20"
                >
                  Log Out
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
              <span className="text-sm font-medium">Log Out</span>
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
        <p className="text-[#1A1A1A] text-[10px] tracking-wider">THAASBAI v1.0.0</p>
        <p className="text-[#1A1A1A] text-[10px] mt-1">The Home of Maldivian Card Games</p>
      </motion.div>
    </div>
  );
}
