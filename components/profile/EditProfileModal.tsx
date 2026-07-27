"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AVATAR_PRESETS, BANNER_PRESETS } from "@/constants/profileCustomization";

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentName: string;
  currentAvatar?: string;
  currentBanner?: string;
}

export function EditProfileModal({ isOpen, onClose, currentName, currentAvatar, currentBanner }: EditProfileModalProps) {
  const { updatePlayerProfile, isGuest } = useAuth();
  const [name, setName] = useState(currentName);
  const [avatar, setAvatar] = useState(currentAvatar ?? "gold");
  const [banner, setBanner] = useState(currentBanner ?? "royal-gold");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Username can't be empty.");
      return;
    }
    if (trimmed.length > 24) {
      setError("Username must be 24 characters or fewer.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updatePlayerProfile({ displayName: trimmed, avatarPreset: avatar, bannerPreset: banner });
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/70 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0"
          onClick={() => !saving && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-2xl p-5 w-full max-w-sm border border-[#D4AF37]/20 max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-lg">Edit Profile</h3>
              <button onClick={onClose} className="p-1.5 rounded-lg bg-[#1A1A1A] border border-[#2A2A2A]">
                <X size={16} className="text-[#3A3A3A]" />
              </button>
            </div>

            {isGuest && (
              <p className="text-[#3A3A3A] text-xs mb-3 bg-[#1A1A1A] border border-[#2A2A2A] rounded-lg px-3 py-2">
                You&apos;re playing as a guest — changes won&apos;t be saved after you sign out.
              </p>
            )}

            <label className="block text-[#3A3A3A] text-xs uppercase tracking-wider mb-2">Username</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="Your username"
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-[#D4AF37]/50 mb-4"
            />

            <label className="block text-[#3A3A3A] text-xs uppercase tracking-wider mb-2">Avatar Color</label>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setAvatar(preset.id)}
                  className="flex flex-col items-center gap-1"
                >
                  <div
                    className={`w-11 h-11 rounded-full bg-gradient-to-br ${preset.gradient} flex items-center justify-center border-2 ${
                      avatar === preset.id ? "border-white" : "border-transparent"
                    }`}
                  >
                    {avatar === preset.id ? (
                      <Check size={16} className="text-[#0F0F0F]" />
                    ) : (
                      <UserIcon size={16} className="text-[#0F0F0F]/60" />
                    )}
                  </div>
                  <span className="text-[9px] text-[#3A3A3A]">{preset.label}</span>
                </button>
              ))}
            </div>

            <label className="block text-[#3A3A3A] text-xs uppercase tracking-wider mb-2">Banner</label>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {BANNER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setBanner(preset.id)}
                  className={`h-12 rounded-xl bg-gradient-to-r ${preset.gradient} bg-[#1A1A1A] border-2 flex items-end justify-start px-2 pb-1 ${
                    banner === preset.id ? "border-white" : "border-[#2A2A2A]"
                  }`}
                >
                  <span className="text-[9px] text-white/80 font-medium">{preset.label}</span>
                </button>
              ))}
            </div>

            {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#B8962E] to-[#D4AF37] text-[#0F0F0F] font-semibold text-sm disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Changes"}
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
