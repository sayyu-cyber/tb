"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/contexts/ToastContext";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AVATAR_PRESETS, BANNER_PRESETS, getAvatarPreset, getBannerPreset } from "@/constants/profileCustomization";
import { useTranslation } from "@/hooks/useTranslation";

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
  // Resolved through the getters so a player still holding a legacy preset
  // id (see LEGACY_AVATAR_IDS) opens the modal with their swatch actually
  // marked as selected, rather than nothing highlighted.
  const [avatar, setAvatar] = useState(() => getAvatarPreset(currentAvatar).id);
  const [banner, setBanner] = useState(() => getBannerPreset(currentBanner).id);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = useTranslation();
  const { showToast } = useToast();
  const panel = useRef<HTMLDivElement>(null);
  const savingRef = useRef(false);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLInputElement>("input")?.focus();
    return () => previous?.focus();
  }, [isOpen]);

  async function handleSave() {
    if (savingRef.current) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError(t("editprofile_emptyName"));
      return;
    }
    if (trimmed.length > 24) {
      setError(t("editprofile_longName"));
      return;
    }
    setSaving(true);
    savingRef.current = true;
    setError(null);
    try {
      await updatePlayerProfile({ displayName: trimmed, avatarPreset: avatar, bannerPreset: banner });
      showToast("Profile updated.", "success");
      onClose();
    } catch (err) {
      setError("Couldn't save profile changes. Please try again.");
    } finally {
      setSaving(false);
      savingRef.current = false;
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
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !savingRef.current) { event.stopPropagation(); onClose(); }
              if (event.key !== "Tab") return;
              const elements = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)') || []);
              const first = elements[0], last = elements[elements.length - 1];
              if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
              else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
            }}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            onClick={(e) => e.stopPropagation()}
            className="glass-card rounded-2xl p-5 w-full max-w-sm border border-[rgb(var(--gold)/20%)] max-h-[85vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 id="edit-profile-title" className="text-[rgb(var(--text-primary))] font-bold text-lg">{t("editprofile_title")}</h3>
              <button disabled={saving} aria-label={t("a11y_close")} onClick={onClose} className="p-1.5 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--c3))]">
                <X size={16} className="text-[rgb(var(--c4))]" />
              </button>
            </div>

            {isGuest && (
              <p className="text-[rgb(var(--c4))] text-xs mb-3 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-lg px-3 py-2">
                {t("editprofile_guestNote")}
              </p>
            )}

            <label className="block text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-2">{t("editprofile_username")}</label>
            <input
              aria-label={t("editprofile_usernamePlaceholder")}
              value={name}
              disabled={saving}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder={t("editprofile_usernamePlaceholder")}
              className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-3 text-[rgb(var(--text-primary))] text-sm outline-none focus:border-[rgb(var(--gold)/50%)] mb-4"
            />

            <label className="block text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-2">{t("editprofile_avatarColor")}</label>
            <div className="grid grid-cols-4 gap-3 mb-4">
              {AVATAR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setAvatar(preset.id)}
                  aria-pressed={avatar === preset.id}
                  disabled={saving}
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
                  <span className="text-[9px] text-[rgb(var(--c4))]">{preset.label}</span>
                </button>
              ))}
            </div>

            <label className="block text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-2">{t("editprofile_banner")}</label>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {BANNER_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setBanner(preset.id)}
                  aria-pressed={banner === preset.id}
                  disabled={saving}
                  className={`h-12 rounded-xl bg-gradient-to-r ${preset.gradient} bg-[rgb(var(--c2))] border-2 flex items-end justify-start px-2 pb-1 ${
                    banner === preset.id ? "border-white" : "border-[rgb(var(--c3))]"
                  }`}
                >
                  <span className="text-[9px] text-[rgb(var(--text-primary))]/80 font-medium">{preset.label}</span>
                </button>
              ))}
            </div>

            {error && <p role="alert" className="text-[rgb(var(--coral-ink))] text-xs mb-3">{error}</p>}

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold text-sm disabled:opacity-50"
            >
              {saving ? t("editprofile_saving") : t("editprofile_save")}
            </motion.button>
            <button disabled={saving} onClick={onClose} className="w-full mt-2 py-2 text-sm text-[rgb(var(--c4))] disabled:opacity-50">Cancel</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
