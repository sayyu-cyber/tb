"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Chrome, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { GoldButton } from "@/components/ui/GoldButton";
import { useTranslation } from "@/hooks/useTranslation";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest } = useAuth();
  const t = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password, username);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setLoading(true);
    try {
      await signInAsGuest();
    } catch (err: any) {
      setError(err.message || "Guest mode failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="w-full max-w-sm mx-auto px-6"
    >
      {/* Logo small */}
      <div className="flex justify-center mb-8">
        <div className="w-16 h-16">
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_10px_rgba(212,175,55,0.4)]">
            <defs>
              <linearGradient id="goldGradSmall" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "rgb(var(--gold-bright))" }} />
                <stop offset="50%" style={{ stopColor: "rgb(var(--gold))" }} />
                <stop offset="100%" style={{ stopColor: "rgb(var(--gold-deep))" }} />
              </linearGradient>
            </defs>
            <path
              d="M10 70 L10 40 L25 55 L40 30 L50 50 L60 30 L75 55 L90 40 L90 70 Q90 80 80 80 L20 80 Q10 80 10 70Z"
              fill="url(#goldGradSmall)"
            />
            <circle cx="25" cy="55" r="3" fill="#0F0F0F" />
            <circle cx="50" cy="50" r="4" fill="#0F0F0F" />
            <circle cx="75" cy="55" r="3" fill="#0F0F0F" />
          </svg>
        </div>
      </div>

      <h2 className="text-2xl font-bold text-center mb-1 gold-text-gradient">
        {mode === "login" ? t("login_welcomeBack") : t("login_joinThaasbai")}
      </h2>
      <p className="text-[rgb(var(--c4))] text-sm text-center mb-8">
        {mode === "login" ? t("login_signInToContinue") : t("login_createAccount")}
      </p>

      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm text-center"
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Google Sign In */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleGoogleSignIn}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] hover:border-[rgb(var(--c4))] text-[rgb(var(--text-primary))] rounded-xl py-3.5 mb-4 transition-colors disabled:opacity-50"
      >
        <Chrome size={20} className="text-[rgb(var(--gold))]" />
        <span className="text-sm font-medium">{t("login_continueGoogle")}</span>
      </motion.button>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-[rgb(var(--c3))]" />
        <span className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider">{t("login_or")}</span>
        <div className="flex-1 h-px bg-[rgb(var(--c3))]" />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="relative"
          >
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--c4))]" />
            <input
              aria-label={t("login_usernamePlaceholder")}
              type="text"
              placeholder={t("login_usernamePlaceholder")}
              maxLength={24}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl py-3.5 pl-12 pr-4 text-[rgb(var(--text-primary))] placeholder-[rgb(var(--c4))] focus:outline-none focus:border-[rgb(var(--gold)/50%)] transition-colors text-sm"
              required
            />
          </motion.div>
        )}

        <div className="relative">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--c4))]" />
          <input
            aria-label={t("login_emailPlaceholder")}
            type="email"
            placeholder={t("login_emailPlaceholder")}
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl py-3.5 pl-12 pr-4 text-[rgb(var(--text-primary))] placeholder-[rgb(var(--c4))] focus:outline-none focus:border-[rgb(var(--gold)/50%)] transition-colors text-sm"
            required
          />
        </div>

        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[rgb(var(--c4))]" />
          <input
            aria-label={t("login_passwordPlaceholder")}
            type={showPassword ? "text" : "password"}
            placeholder={t("login_passwordPlaceholder")}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl py-3.5 pl-12 pr-12 text-[rgb(var(--text-primary))] placeholder-[rgb(var(--c4))] focus:outline-none focus:border-[rgb(var(--gold)/50%)] transition-colors text-sm"
            required
          />
          <button
            type="button"
            aria-label={showPassword ? t("a11y_hidePassword") : t("a11y_showPassword")}
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[rgb(var(--c4))] hover:text-[rgb(var(--gold))] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <GoldButton type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? t("login_loading") : mode === "login" ? t("login_signIn") : t("login_createAccountBtn")}
        </GoldButton>
      </form>

      {/* Toggle mode */}
      <p className="text-center mt-6 text-sm text-[rgb(var(--c4))]">
        {mode === "login" ? t("login_noAccount") : t("login_haveAccount")}{" "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
          }}
          className="text-[rgb(var(--gold))] hover:text-[rgb(var(--gold-bright))] font-medium transition-colors"
        >
          {mode === "login" ? t("login_signUp") : t("login_signIn")}
        </button>
      </p>

      {/* Guest mode */}
      <div className="mt-8 pt-6 border-t border-[rgb(var(--c2))]">
        <button
          onClick={handleGuestMode}
          disabled={loading}
          className="w-full text-[rgb(var(--c4))] hover:text-[rgb(var(--gold))] text-sm font-medium transition-colors disabled:opacity-50"
        >
          {t("login_continueAsGuest")}
        </button>
        <p className="text-[rgb(var(--c3))] text-[10px] text-center mt-2">
          {t("login_guestNote")}
        </p>
      </div>
    </motion.div>
  );
}
