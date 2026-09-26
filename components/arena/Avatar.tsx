/**
 * The square-ish avatar tile the boards use everywhere: an initial on a
 * gradient, with an optional presence dot. `.ava` plus a tint.
 *
 * The board's four tints are placeholders. In the app the tint comes from
 * the player's Avatar Color preset, so `tone` is derived from the player's
 * id when one isn't given - the same player then keeps the same colour
 * across every screen instead of changing tile to tile.
 */
import type { CSSProperties } from "react";

export type AvatarTone = "lime" | "blue" | "white" | "grey" | "amber";
export type Presence = "online" | "offline" | "in-game";

const TONE_CLASS: Record<AvatarTone, string> = {
  lime: "",      // the base .ava gradient
  blue: "b",
  white: "w",
  grey: "g",
  amber: "o",
};

const PRESENCE_CLASS: Record<Presence, string> = {
  online: "",
  offline: "off",
  "in-game": "game",
};

/** Stable tint from a player id, so one player is one colour app-wide. */
const CYCLE: AvatarTone[] = ["lime", "blue", "amber", "white", "grey"];
export function toneFor(seed: string | undefined | null): AvatarTone {
  if (!seed) return "lime";
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return CYCLE[Math.abs(hash) % CYCLE.length];
}

export type AvatarProps = {
  /** Display name; its first character is the initial. */
  name?: string | null;
  /** A real photo, when the player has one. */
  src?: string | null;
  tone?: AvatarTone;
  /** Used to pick a stable tone when `tone` is omitted. */
  seed?: string | null;
  size?: number;
  /** Rounded-square radius. The boards scale it with the tile. */
  radius?: number;
  presence?: Presence;
  className?: string;
  style?: CSSProperties;
};

export function Avatar({
  name,
  src,
  tone,
  seed,
  size = 44,
  radius,
  presence,
  className = "",
  style,
}: AvatarProps) {
  const resolved = tone ?? toneFor(seed ?? name);
  const initial = (name ?? "?").trim().charAt(0).toUpperCase() || "?";
  const classes = ["ava", TONE_CLASS[resolved], className].filter(Boolean).join(" ");
  return (
    <span
      className={classes}
      style={{
        width: size,
        height: size,
        borderRadius: radius ?? Math.round(size * 0.25),
        fontSize: Math.round(size * 0.42),
        ...style,
      }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
        />
      ) : (
        initial
      )}
      {presence ? <i className={`on ${PRESENCE_CLASS[presence]}`.trim()} aria-hidden="true" /> : null}
    </span>
  );
}

/** Overlapping row of avatars with a "+N" tail. `.stack` on the boards. */
export function AvatarStack({
  people,
  max = 4,
  size = 28,
  className = "",
}: {
  people: readonly { id: string; name?: string | null; src?: string | null }[];
  max?: number;
  size?: number;
  className?: string;
}) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className={`stack ${className}`.trim()}>
      {shown.map((person) => (
        <Avatar key={person.id} name={person.name} src={person.src} seed={person.id} size={size} radius={8} />
      ))}
      {rest > 0 ? <span className="more">+{rest}</span> : null}
    </div>
  );
}
