"use client";

import { getAvatarPreset } from "@/constants/profileCustomization";
import { cn } from "@/lib/utils";

/**
 * One avatar treatment for the whole board, so the podium and the table
 * cannot drift apart. Uses the app's existing preset gradients
 * (constants/profileCustomization) and falls back to the player's uploaded
 * photo when they have one - the same order of precedence the game table and
 * friends list already use.
 */
export function LeaderboardAvatar({
  name,
  photoURL,
  presetId,
  size = 40,
  className,
}: {
  name: string;
  photoURL?: string;
  presetId?: string;
  size?: number;
  className?: string;
}) {
  const preset = getAvatarPreset(presetId);
  const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <span
      className={cn("lb-avatar bg-gradient-to-br", preset.gradient, className)}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
    >
      {photoURL ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoURL} alt="" />
      ) : (
        initial
      )}
    </span>
  );
}
