"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/contexts/SettingsContext";

/**
 * Global background music player. The "Background Music" toggle in
 * Settings (contexts/SettingsContext.tsx) already existed but nothing
 * ever read it - this actually plays/pauses a looping track.
 *
 * Mounted once in MainLayout so it survives navigation between pages
 * inside the app (Next.js layouts persist across route changes within
 * the same route group; only `children` swap out).
 *
 * Note: browsers block audio autoplay-with-sound until a user gesture.
 * If the setting was already "on" from a previous session, playback
 * will start on the user's first tap/click anywhere in the app rather
 * than instantly on load - this is a browser policy, not a bug.
 */
export function BackgroundMusicPlayer() {
  const { settings } = useSettings();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!settings.music) {
      audioRef.current?.pause();
      return;
    }
    if (!audioRef.current) {
      const audio = new Audio("/audio/background-music.mp3");
      audio.preload = "none";
      audio.loop = true;
      audio.volume = 0.35;
      audioRef.current = audio;
    }

    const audio = audioRef.current;

    let retry: (() => void) | undefined;
    let cancelled = false;
    if (settings.music) {
      audio.play().catch(() => {
        if (cancelled) return;
        // Blocked until a user gesture happens - retry once on the next
        // click anywhere in the app.
        retry = () => {
          // Intentionally silent: browsers reject play() until the user
          // has interacted with the page. That's expected, not an error
          // worth surfacing - the next tap starts playback.
          audio.play().catch(() => {});
          if (retry) window.removeEventListener("click", retry);
        };
        window.addEventListener("click", retry, { once: true });
      });
    } else {
      audio.pause();
    }
    return () => {
      cancelled = true;
      if (retry) window.removeEventListener("click", retry);
    };
  }, [settings.music]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  return null;
}
