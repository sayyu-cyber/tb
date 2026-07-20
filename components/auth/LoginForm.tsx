"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, Eye, EyeOff, Chrome, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { GoldButton } from "@/components/ui/GoldButton";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAsGuest } = useAuth();

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
                <stop offset="0%" style={{ stopColor: "#E8C84A" }} />
                <stop offset="50%" style={{ stopColor: "#D4AF37" }} />
                <stop offset="100%" style={{ stopColor: "#B8962E" }} />
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
        {mode === "login" ? "Welcome Back" : "Join Thaasbai"}
      </h2>
      <p className="text-[#3A3A3A] text-sm text-center mb-8">
        {mode === "login" ? "Sign in to continue" : "Create your account"}
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
        className="w-full flex items-center justify-center gap-3 bg-[#1A1A1A] border border-[#2A2A2A] hover:border-[#3A3A3A] text-white rounded-xl py-3.5 mb-4 transition-colors disabled:opacity-50"
      >
        <Chrome size={20} className="text-[#D4AF37]" />
        <span className="text-sm font-medium">Continue with Google</span>
      </motion.button>

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-[#2A2A2A]" />
        <span className="text-[#3A3A3A] text-xs uppercase tracking-wider">or</span>
        <div className="flex-1 h-px bg-[#2A2A2A]" />
      </div>

      {/* Email form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === "signup" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="relative"
          >
            <User size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A3A3A]" />
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-[#3A3A3A] focus:outline-none focus:border-[#D4AF37]/50 transition-colors text-sm"
              required
            />
          </motion.div>
        )}

        <div className="relative">
          <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A3A3A]" />
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-[#3A3A3A] focus:outline-none focus:border-[#D4AF37]/50 transition-colors text-sm"
            required
          />
        </div>

        <div className="relative">
          <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#3A3A3A]" />
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#1A1A1A] border border-[#2A2A2A] rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-[#3A3A3A] focus:outline-none focus:border-[#D4AF37]/50 transition-colors text-sm"
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#3A3A3A] hover:text-[#D4AF37] transition-colors"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <GoldButton type="submit" variant="primary" size="lg" className="w-full" disabled={loading}>
          {loading ? "Loading..." : mode === "login" ? "Sign In" : "Create Account"}
        </GoldButton>
      </form>

      {/* Toggle mode */}
      <p className="text-center mt-6 text-sm text-[#3A3A3A]">
        {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError("");
          }}
          className="text-[#D4AF37] hover:text-[#E8C84A] font-medium transition-colors"
        >
          {mode === "login" ? "Sign Up" : "Sign In"}
        </button>
      </p>

      {/* Guest mode */}
      <div className="mt-8 pt-6 border-t border-[#1A1A1A]">
        <button
          onClick={handleGuestMode}
          disabled={loading}
          className="w-full text-[#3A3A3A] hover:text-[#D4AF37] text-sm font-medium transition-colors disabled:opacity-50"
        >
          Continue as Guest
        </button>
        <p className="text-[#2A2A2A] text-[10px] text-center mt-2">
          Guest users can only access Casual Mode
        </p>
      </div>
    </motion.div>
  );
}
