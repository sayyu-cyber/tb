"use client";

import { useEffect, useState } from "react";
import { getPublicProfile, PublicProfile } from "@/lib/publicProfile";

/**
 * Resolves the public profile (display name, avatar preset, equipped card
 * back) for a set of other players' uids, once per match. The match
 * document itself only stores uids (see MatchDoc) - this is what lets the
 * game table show real names, avatar colours and card-back skins instead
 * of generic "Opponent" placeholders.
 */
export function useOpponentProfiles(uids: string[]): Record<string, PublicProfile> {
  const key = uids.filter(Boolean).sort().join(",");
  const [profiles, setProfiles] = useState<Record<string, PublicProfile>>({});

  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    const list = key.split(",");
    Promise.all(list.map((uid) => getPublicProfile(uid).then((p) => [uid, p] as const))).then((results) => {
      if (cancelled) return;
      setProfiles((prev) => {
        const next = { ...prev };
        for (const [uid, p] of results) if (p) next[uid] = p;
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return profiles;
}
