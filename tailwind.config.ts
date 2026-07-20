import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        thaasbai: {
          black: "#0F0F0F",
          gold: "#D4AF37",
          "gold-light": "#E8C84A",
          "gold-dark": "#B8962E",
          "dark-gray": "#1A1A1A",
          "medium-gray": "#2A2A2A",
          "light-gray": "#3A3A3A",
          white: "#FFFFFF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "gold-glow": "goldGlow 2s ease-in-out infinite alternate",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
        "pulse-gold": "pulseGold 1.5s ease-in-out infinite",
      },
      keyframes: {
        goldGlow: {
          "0%": { boxShadow: "0 0 20px rgba(212, 175, 55, 0.3)" },
          "100%": { boxShadow: "0 0 40px rgba(212, 175, 55, 0.6), 0 0 60px rgba(212, 175, 55, 0.2)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseGold: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
