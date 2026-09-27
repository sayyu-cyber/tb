"use client";

import { useEffect, useState } from "react";
import { canLockOrientation } from "@/lib/orientationLock";

/**
 * Whether this browser can turn the screen itself, which is what decides
 * if "Go landscape" is drawn at all — design/arena/MOBILE.md: the button
 * "appears only where the lock exists; on iPhone the sheet shows Stop
 * looking and the hint alone."
 *
 * Read in an effect rather than during render because the static export
 * renders on a machine with no `screen` at all, and a button that appeared
 * in the HTML and then vanished would be worse than one that arrives a
 * frame late.
 */
export function useCanLockOrientation(): boolean {
  const [can, setCan] = useState(false);
  useEffect(() => setCan(canLockOrientation()), []);
  return can;
}
