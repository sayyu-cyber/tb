/**
 * Decorative hero backdrop for the Home and Play "lobby" screens.
 *
 * The brief was a PUBG Mobile-style lobby: a full-bleed scene sitting
 * behind the UI so the app reads as a game to boot into, not a settings
 * dashboard. PUBG uses 3D character renders; this app has no 3D art
 * pipeline or character assets (see the note on card-back skins), so a
 * Maldivian lagoon-at-sunset illustration stands in instead - it's the
 * app's actual setting ("The Home of Maldivian Card Games"), built from
 * the same palette as the rest of the UI (constants: --gold, --lagoon,
 * --coral, --deep, --orchid) rather than one-off hex values, so it holds
 * up in both themes.
 *
 * Pure decoration: aria-hidden, no interactive content.
 */
export function LobbyScene({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 800 320"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="lobbySky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--deep-dark))" />
          <stop offset="55%" stopColor="rgb(var(--deep))" />
          <stop offset="100%" stopColor="rgb(var(--coral))" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="lobbySun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgb(var(--gold-bright))" stopOpacity="0.9" />
          <stop offset="60%" stopColor="rgb(var(--gold))" stopOpacity="0.35" />
          <stop offset="100%" stopColor="rgb(var(--gold))" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="lobbyWaveFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--lagoon-deep))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(var(--lagoon-deep))" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id="lobbyWaveNear" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--lagoon))" stopOpacity="0.75" />
          <stop offset="100%" stopColor="rgb(var(--deep-dark))" stopOpacity="0.95" />
        </linearGradient>
        {/* Sun's reflection on the water: bright at the horizon, fading as
            it comes toward the viewer. */}
        <linearGradient id="lobbyGlint" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--gold-bright))" stopOpacity="0.55" />
          <stop offset="100%" stopColor="rgb(var(--gold))" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Sky */}
      <rect x="0" y="0" width="800" height="320" fill="url(#lobbySky)" />

      {/* Sun glow, low on the horizon */}
      <circle cx="620" cy="150" r="150" fill="url(#lobbySun)" />
      <circle cx="620" cy="150" r="46" fill="rgb(var(--gold-bright))" opacity="0.85" />

      {/* Distant island silhouette with a couple of palms */}
      <g opacity="0.9">
        <ellipse cx="180" cy="182" rx="130" ry="16" fill="rgb(var(--deep-dark))" />
        <path
          d="M120 182 Q126 150 108 132"
          stroke="rgb(var(--deep-dark))"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M108 132 Q90 122 74 128 M108 132 Q100 116 106 100 M108 132 Q122 120 134 124"
          stroke="rgb(var(--deep-dark))"
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M210 182 Q214 156 200 140"
          stroke="rgb(var(--deep-dark))"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M200 140 Q186 132 174 136 M200 140 Q194 126 200 114 M200 140 Q212 130 222 132"
          stroke="rgb(var(--deep-dark))"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </g>

      {/* Four suit glyphs drifting at different rates - the card-game wink,
          and the only motion in the scene. `lobby-drift` is defined in
          globals.css, so the global prefers-reduced-motion rule stills it. */}
      <g className="lobby-drift" style={{ animationDelay: "0s" }}>
        <text x="88" y="92" fontSize="46" fill="rgb(var(--gold))" opacity="0.2" fontFamily="serif">♠</text>
      </g>
      <g className="lobby-drift" style={{ animationDelay: "-2.5s" }}>
        <text x="300" y="66" fontSize="30" fill="rgb(var(--coral))" opacity="0.22" fontFamily="serif">♥</text>
      </g>
      <g className="lobby-drift" style={{ animationDelay: "-5s" }}>
        <text x="470" y="104" fontSize="26" fill="rgb(var(--lagoon))" opacity="0.2" fontFamily="serif">♣</text>
      </g>
      <g className="lobby-drift" style={{ animationDelay: "-7.5s" }}>
        <text x="726" y="72" fontSize="34" fill="rgb(var(--gold-bright))" opacity="0.18" fontFamily="serif">♦</text>
      </g>

      {/* Waves, far to near, with the sun's glint laid between them. */}
      <path d="M0 210 Q100 190 200 208 T400 206 T600 210 T800 204 V320 H0 Z" fill="url(#lobbyWaveFar)" />
      <path d="M596 206 L644 206 L680 320 L560 320 Z" fill="url(#lobbyGlint)" />
      <path d="M0 246 Q120 224 240 244 T480 242 T720 246 T800 240 V320 H0 Z" fill="url(#lobbyWaveNear)" />

      {/* Crests catching the last light. */}
      <path
        d="M0 246 Q120 224 240 244 T480 242 T720 246 T800 240"
        fill="none"
        stroke="rgb(var(--lagoon))"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      <path
        d="M0 278 Q140 262 280 278 T560 276 T800 280"
        fill="none"
        stroke="rgb(var(--gold))"
        strokeOpacity="0.16"
        strokeWidth="2"
      />

      {/* Bottom fade so foreground UI text stays legible over the water.
          Deliberately a fixed deep tone, not `--c1`: the hero always carries
          white text, so in light theme a `--c1` wash would have gone nearly
          white and taken the contrast with it. */}
      <rect x="0" y="225" width="800" height="95" fill="rgb(var(--deep-dark))" opacity="0.45" />
    </svg>
  );
}
