import Image from "next/image";

/**
 * Photographic hero backdrop for the Home and Play "lobby" screens.
 *
 * Replaces the illustrated LobbyScene with the app's real card-back art:
 * a macro shot of the deck fanned on driftwood at a Maldivian sunset -
 * the actual product, not a stand-in for it.
 *
 * A photo has far less predictable local contrast than a flat illustration
 * (a bright sunset sky sits right next to dark wood grain), so this
 * component always ships its own legibility scrim rather than leaving that
 * to each caller - two gradients tuned for where callers place text
 * (bottom-left) and controls (bottom-right / top-right chips), on top of
 * which callers may still layer their own page-specific tint (e.g.
 * PlayLobbyHero's per-game colour wash).
 *
 * `next/image` with `priority` rather than a plain `<img>`: this is the
 * largest content on both Home and Play, so it's the page's LCP element -
 * worth the correct loading hint even though `unoptimized: true` (required
 * by static export) means no server-side resizing happens either way.
 *
 * Pure decoration: aria-hidden, no interactive content.
 */
export function LobbyPhoto({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      {/* Gradient fallback, painted first: if the photo file is missing or
          still loading, this - not flat grey - is what shows through. Uses
          the brand palette so the banner never looks broken. */}
      <div className="absolute inset-0 bg-[#0c1916]" />
      <Image
        src="/images/lobby-table.webp"
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="object-cover"
        style={{ objectPosition: "center 58%" }}
      />
      {/* Bottom scrim: every caller's heading and quick links sit here. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent" />
      {/* Left scrim: text is always left-aligned, so guarantee contrast
          there independent of what's directly behind it in the photo. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/25 to-transparent" />
    </div>
  );
}
