"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  signInWithSupabaseEmail,
  signInWithSupabaseGoogle,
  signInWithSupabaseGuest,
  signOutSupabase,
  signUpWithSupabaseEmail,
  toAppUser,
} from "@/lib/supabase/auth";
import { ensureProfileCode, loadProfileBundle, nowIso, profileToPlayerStats, realtimeChannelName, subscribe } from "@/lib/supabase/data";
import { User, PlayerStats } from "@/types";
import { generatePlayerCode } from "@/lib/playerCode";

interface AuthContextType {
  user: User | null;
  playerStats: PlayerStats | null;
  loading: boolean;
  profileLoading: boolean;
  profileError: boolean;
  retryProfile: () => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  isGuest: boolean;
  updatePlayerProfile: (updates: { displayName?: string; avatarPreset?: string; bannerPreset?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    let generation = 0;
    let stopProfile: (() => void) | undefined;

    async function loadUserProfile(authUser: SupabaseUser) {
      const current = ++generation;
      stopProfile?.();
      stopProfile = undefined;

      const appUser = toAppUser(authUser);
      setUser(appUser);
      setIsGuest(appUser.isGuest);
      setPlayerStats(null);
      setProfileLoading(true);
      setProfileError(false);
      setLoading(false);

      const refreshProfile = async () => {
        try {
          const bundle = await loadProfileBundle(authUser.id);
          if (current !== generation) return;
          if (bundle) {
            if (!bundle.player_code) await ensureProfileCode(authUser.id, generatePlayerCode());
            const latest = await loadProfileBundle(authUser.id);
            if (current !== generation || !latest) return;
            setPlayerStats(profileToPlayerStats(latest));
            setUser((prev) =>
              prev
                ? {
                    ...prev,
                    displayName: latest.display_name || prev.displayName,
                    photoURL: latest.photo_url ?? prev.photoURL,
                  }
                : prev
            );
          } else {
            setProfileError(true);
          }
        } catch (error) {
          console.error("Failed to load Supabase player profile:", error);
          if (current === generation) setProfileError(true);
        } finally {
          if (current === generation) setProfileLoading(false);
        }
      };

      await refreshProfile();

      const channel = supabase
        .channel(realtimeChannelName(`profile:${authUser.id}`))
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${authUser.id}` }, refreshProfile)
        .on("postgres_changes", { event: "*", schema: "public", table: "player_stats", filter: `user_id=eq.${authUser.id}` }, refreshProfile)
        .on("postgres_changes", { event: "*", schema: "public", table: "ranked_progress", filter: `user_id=eq.${authUser.id}` }, refreshProfile);
      stopProfile = subscribe(channel, () => {
        if (current === generation) setProfileError(true);
      });
    }

    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) {
        setUser(null);
        setPlayerStats(null);
        setIsGuest(false);
        setLoading(false);
        setProfileLoading(false);
        setProfileError(false);
        return;
      }
      void loadUserProfile(data.user);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      stopProfile?.();
      stopProfile = undefined;
      if (!session?.user) {
        generation++;
        setUser(null);
        setPlayerStats(null);
        setIsGuest(false);
        setLoading(false);
        setProfileLoading(false);
        setProfileError(false);
        return;
      }
      void loadUserProfile(session.user);
    });

    return () => {
      generation++;
      stopProfile?.();
      data.subscription.unsubscribe();
    };
  }, [profileAttempt]);

  const updatePlayerProfile = async (updates: { displayName?: string; avatarPreset?: string; bannerPreset?: string }) => {
    if (!user) throw new Error("Please sign in again before editing your profile.");
    const supabase = getSupabaseBrowserClient();
    const patch = {
      ...(updates.displayName ? { display_name: updates.displayName } : {}),
      ...(updates.avatarPreset ? { avatar_preset: updates.avatarPreset } : {}),
      ...(updates.bannerPreset ? { banner_preset: updates.bannerPreset } : {}),
      updated_at: nowIso(),
    };

    if (updates.displayName) {
      const { error } = await supabase.auth.updateUser({
        data: { display_name: updates.displayName, full_name: updates.displayName },
      });
      if (error) throw error;
    }

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.uid);
    if (error) throw error;

    setUser((prev) => (prev ? { ...prev, displayName: updates.displayName ?? prev.displayName } : prev));
    setPlayerStats((prev) =>
      prev
        ? {
            ...prev,
            avatarPreset: updates.avatarPreset ?? prev.avatarPreset,
            bannerPreset: updates.bannerPreset ?? prev.bannerPreset,
          }
        : prev
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        playerStats,
        loading,
        profileLoading,
        profileError,
        retryProfile: () => setProfileAttempt((value) => value + 1),
        signInWithGoogle: signInWithSupabaseGoogle,
        signInWithEmail: signInWithSupabaseEmail,
        signUpWithEmail: signUpWithSupabaseEmail,
        signInAsGuest: signInWithSupabaseGuest,
        logout: signOutSupabase,
        isGuest,
        updatePlayerProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
