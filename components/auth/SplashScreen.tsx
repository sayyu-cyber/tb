"use client";

import { motion } from "framer-motion";

export function SplashScreen() {
  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col items-center justify-center relative overflow-hidden">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 bg-[#D4AF37] rounded-full"
            initial={{ opacity: 0 }}
            animate={{
              opacity: [0, 0.3, 0],
              y: [0, -30, -60],
              x: [0, (i % 2 === 0 ? 20 : -20), 0],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
            style={{
              left: `${15 + i * 15}%`,
              top: `${60 + (i % 3) * 10}%`,
            }}
          />
        ))}
      </div>

      {/* Gold glow behind logo */}
      <motion.div
        className="absolute w-72 h-72 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212,175,55,0.15) 0%, transparent 70%)",
        }}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.5, 0.8, 0.5],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* Crown icon */}
        <motion.div
          className="w-28 h-28 mb-6"
          animate={{
            filter: [
              "drop-shadow(0 0 10px rgba(212,175,55,0.3))",
              "drop-shadow(0 0 25px rgba(212,175,55,0.6))",
              "drop-shadow(0 0 10px rgba(212,175,55,0.3))",
            ],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <defs>
              <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: "#E8C84A" }} />
                <stop offset="50%" style={{ stopColor: "#D4AF37" }} />
                <stop offset="100%" style={{ stopColor: "#B8962E" }} />
              </linearGradient>
            </defs>
            <path
              d="M10 70 L10 40 L25 55 L40 30 L50 50 L60 30 L75 55 L90 40 L90 70 Q90 80 80 80 L20 80 Q10 80 10 70Z"
              fill="url(#goldGrad)"
              stroke="#D4AF37"
              strokeWidth="1.5"
            />
            <circle cx="25" cy="55" r="3" fill="#0F0F0F" />
            <circle cx="50" cy="50" r="4" fill="#0F0F0F" />
            <circle cx="75" cy="55" r="3" fill="#0F0F0F" />
            <rect x="15" y="72" width="70" height="4" rx="2" fill="#B8962E" />
          </svg>
        </motion.div>

        {/* Brand name */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-5xl font-bold tracking-wider mb-2 gold-text-gradient"
        >
          THAASBAI
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="text-[#D4AF37] text-sm tracking-[0.3em] uppercase"
        >
          The Home of Maldivian Card Games
        </motion.p>

        {/* Loading bar */}
        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="mt-10 w-48 h-1 bg-[#1A1A1A] rounded-full overflow-hidden"
        >
          <motion.div
            className="h-full bg-gradient-to-r from-[#B8962E] via-[#D4AF37] to-[#E8C84A] rounded-full"
            initial={{ x: "-100%" }}
            animate={{ x: ["-100%", "200%"] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ width: "60%" }}
          />
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.6 }}
        className="absolute bottom-8 text-center"
      >
        <p className="text-[#2A2A2A] text-[10px] tracking-[0.2em] uppercase">
          Thaasbai — The Home of Maldivian Card Games
        </p>
      </motion.div>
    </div>
  );
}
