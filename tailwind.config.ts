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
        // The existing gold theme. Kept in place, NOT renamed, so screens can
        // move to `arena` one at a time (design/arena/README.md, porting note 4).
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
        /**
         * Arena palette (design/arena/README.md "Palette").
         *
         * ONE DELIBERATE DIFFERENCE FROM THE DESIGN PACK: the pack's violet
         * (#7D39EB) is replaced throughout by #00BCC8, at the owner's
         * request. The role is unchanged - it is still the table felt,
         * the opponents, trump and secondary actions - so everywhere the
         * README or the boards say "violet", read `arena.blue`.
         *
         * The lighter and darker steps are derived from #00BCC8 rather than
         * all being set to it, because the button lip has to be darker than
         * the face and the felt darker still, or the depth collapses.
         */
        arena: {
          black: "#000000",        // stage, rails
          blue: "#00BCC8",         // felt, opponents, trump, secondary action
          "blue-hi": "#4FE3EC",    // top of blue gradients
          "blue-soft": "#6FE9F0",  // opponent dots, Thaana, small blue text
          "blue-lo": "#00727A",    // blue button base / lip
          "blue-deep": "#005A61",
          lime: "#C6FF33",         // you, your team, the main action
          "lime-hi": "#DDFF70",
          "lime-lo": "#6F9412",    // lime button base / lip
          white: "#FFFFFF",
          graphite: "#121217",     // icon buttons, panels
          "card-red": "#E0213A",   // hearts and diamonds
          urgent: "#FF3B55",       // turn clock under 5s
        },
      },
      fontFamily: {
        // Body text is Inter Tight; `display` and `thaana` are opt-in.
        sans: ["var(--font-ui)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        thaana: ["var(--font-thaana)", "sans-serif"],
      },
      letterSpacing: {
        // The Arena tracking scale: headlines are tight, small caps labels
        // are wide, buttons sit between the two.
        headline: "-0.02em",
        button: "0.06em",
        label: "0.22em",
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
