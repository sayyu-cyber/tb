"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShieldOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { unblockUser, watchBlocks } from "@/lib/moderation";
import { getPublicProfile } from "@/lib/publicProfile";

/**
 * The player's block list, with a way out of it.
 *
 * This exists because blocking without unblocking is a one-way door, and a
 * safety feature people are afraid to use is not much of a safety feature.
 * It lives in Settings rather than the Friends page because you can block
 * someone who was never a friend — from their profile, or from a match.
 *
 * Names are resolved from the public profile so the list reads as people
 * rather than a column of user ids. A lookup that fails (deleted account)
 * degrades to the raw id rather than dropping the row, because you must
 * still be able to unblock it.
 */
export function BlockedPlayers() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [blocked, setBlocked] = useState<string[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    return watchBlocks(
      user.uid,
      (list) => {
        setBlocked(list);
        setLoading(false);
      },
      () => setLoading(false)
    );
  }, [user]);

  // Resolve display names for ids we have not seen yet.
  useEffect(() => {
    let cancelled = false;
    const unknown = blocked.filter((uid) => !(uid in names));
    if (unknown.length === 0) return;
    (async () => {
      const resolved = await Promise.all(
        unknown.map(async (uid) => {
          try {
            const profile = await getPublicProfile(uid);
            return [uid, profile?.displayName ?? uid] as const;
          } catch {
            return [uid, uid] as const;
          }
        })
      );
      if (!cancelled) {
        setNames((prev) => ({ ...prev, ...Object.fromEntries(resolved) }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [blocked, names]);

  if (!user) return null;

  if (loading) {
    return <p className="settings-note">Loading blocked players…</p>;
  }

  if (blocked.length === 0) {
    return (
      <p className="settings-note">
        You haven&rsquo;t blocked anyone. You can block a player from their profile.
      </p>
    );
  }

  return (
    <ul className="mod-blocked-list">
      {blocked.map((uid) => (
        <li key={uid}>
          <Link href={`/player?uid=${encodeURIComponent(uid)}`}>{names[uid] ?? uid}</Link>
          <button
            type="button"
            disabled={busy === uid}
            onClick={async () => {
              setBusy(uid);
              try {
                await unblockUser(user.uid, uid);
                showToast(`Unblocked ${names[uid] ?? "player"}.`, "success");
              } catch {
                showToast("Could not unblock. Please try again.", "error");
              } finally {
                setBusy(null);
              }
            }}
          >
            <ShieldOff size={14} aria-hidden="true" />
            {busy === uid ? "Unblocking…" : "Unblock"}
          </button>
        </li>
      ))}
    </ul>
  );
}
