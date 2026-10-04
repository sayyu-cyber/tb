"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  signInWithSupabaseEmail,
  signInWithSupabaseGoogle,
  signInWithSupabaseGuest,
  signOutSupabase,
  signUpWithSupabaseEmail,
  toAppUser,
  withAuthTimeout,
  type AccountCompletion,
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
  accountCompletion: AccountCompletion | null;
  accountBusy: boolean;
  clearAccountCompletion: () => void;
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
  const [accountCompletion, setAccountCompletion] = useState<AccountCompletion | null>(null);
  const [accountBusy, setAccountBusy] = useState(false);
  const retryProfileRef = useRef<() => void>(() => {});
  const resetAuthRef = useRef<() => void>(() => {});
  const finishLogoutRef = useRef<() => void>(() => {});
  const logoutPending = useRef(false);
  const authVersion = useRef(0);

  useEffect(() => {
    const versionRef = authVersion;
    let supabase: ReturnType<typeof getSupabaseBrowserClient>;
    try {
      supabase = getSupabaseBrowserClient();
    } catch {
      setLoading(false);
      setProfileError(true);
      return;
    }
    let disposed = false;
    let authRevision = 0;
    let generation = 0;
    let identity: string | null = null;
    let stopProfile: (() => void) | undefined;

    function clearUser() {
      authRevision++;
      generation++;
      versionRef.current++;
      identity = null;
      stopProfile?.();
      stopProfile = undefined;
      setUser(null);
      setPlayerStats(null);
      setIsGuest(false);
      setLoading(false);
      setProfileLoading(false);
      setProfileError(false);
      setAccountCompletion(null);
      retryProfileRef.current = () => { void initialize(); };
    }
    resetAuthRef.current = clearUser;

    function loadUserProfile(authUser: SupabaseUser, force = false, metadataChanged = false) {
      if (disposed) return;
      const appUser = toAppUser(authUser);
      const sameIdentity = identity === authUser.id;
      setUser((prev) => sameIdentity && prev && !metadataChanged
        ? { ...prev, email: appUser.email, isGuest: appUser.isGuest }
        : appUser);
      setIsGuest(appUser.isGuest);
      setLoading(false);
      if (sameIdentity && !force) return;

      const current = ++generation;
      stopProfile?.();
      stopProfile = undefined;
      if (!sameIdentity) {
        versionRef.current++;
        identity = authUser.id;
        setPlayerStats(null);
      }
      setProfileLoading(true);
      setProfileError(false);
      const isCurrent = () => !disposed && current === generation;
      let subscriptionFailed = false;
      let refreshing = false;
      let refreshAgain = false;

      const refreshProfile = async () => {
        if (!isCurrent()) return;
        if (refreshing) { refreshAgain = true; return; }
        refreshing = true;
        try {
          let bundle = await withAuthTimeout(loadProfileBundle(authUser.id));
          if (!isCurrent()) return;
          if (!bundle) throw new Error("Player profile is unavailable.");
          if (!bundle.player_code) {
            await withAuthTimeout(ensureProfileCode(authUser.id, generatePlayerCode()));
            if (!isCurrent()) return;
            bundle = await withAuthTimeout(loadProfileBundle(authUser.id));
            if (!isCurrent()) return;
            if (!bundle) throw new Error("Player profile is unavailable.");
          }
          const latest = bundle;
          setPlayerStats(profileToPlayerStats(latest));
          setUser((prev) => prev?.uid === authUser.id ? {
            ...prev,
            displayName: latest.display_name || prev.displayName,
            photoURL: latest.photo_url ?? prev.photoURL,
          } : prev);
          setProfileError(subscriptionFailed);
        } catch (error) {
          if (isCurrent()) {
            console.error("Failed to load Supabase player profile:", error);
            setProfileError(true);
          }
        } finally {
          refreshing = false;
          if (isCurrent()) {
            setProfileLoading(false);
            if (refreshAgain) {
              refreshAgain = false;
              void refreshProfile();
            }
          }
        }
      };

      // Subscribe before the first read; no continuation can install a channel
      // for an identity that signed out while its profile was loading.
      try {
        const channel = supabase
          .channel(realtimeChannelName(`profile:${authUser.id}`))
          .on("postgres_changes", { event: "*", schema: "public", table: "profiles", filter: `id=eq.${authUser.id}` }, refreshProfile)
          .on("postgres_changes", { event: "*", schema: "public", table: "player_stats", filter: `user_id=eq.${authUser.id}` }, refreshProfile)
          .on("postgres_changes", { event: "*", schema: "public", table: "ranked_progress", filter: `user_id=eq.${authUser.id}` }, refreshProfile);
        stopProfile = subscribe(channel, () => {
          subscriptionFailed = true;
          if (isCurrent()) setProfileError(true);
        });
      } catch {
        subscriptionFailed = true;
        if (isCurrent()) setProfileError(true);
      }
      // Auth listeners stay synchronous and release Supabase's auth lock.
      queueMicrotask(() => { void refreshProfile(); });
      retryProfileRef.current = () => loadUserProfile(authUser, true);
    }

    async function initialize() {
      if (disposed || logoutPending.current) return;
      const revision = authRevision;
      try {
        const { data, error } = await withAuthTimeout(supabase.auth.getUser());
        if (disposed || revision !== authRevision) return;
        if (error) throw error;
        if (data.user) loadUserProfile(data.user);
        else clearUser();
      } catch {
        if (disposed || revision !== authRevision) return;
        clearUser();
        setProfileError(true);
      }
    }
    retryProfileRef.current = () => { void initialize(); };
    finishLogoutRef.current = () => { void initialize(); };

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (disposed) return;
      authRevision++;
      if (logoutPending.current && session?.user) return;
      if (!session?.user) {
        clearUser();
        retryProfileRef.current = () => { void initialize(); };
        return;
      }
      loadUserProfile(session.user, false, event === "USER_UPDATED");
    });
    void initialize();

    return () => {
      disposed = true;
      authRevision++;
      generation++;
      versionRef.current++;
      stopProfile?.();
      data.subscription.unsubscribe();
      resetAuthRef.current = () => {};
      retryProfileRef.current = () => {};
      finishLogoutRef.current = () => {};
    };
  }, []);

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    const version = authVersion.current;
    setAccountBusy(true);
    try {
      const result = await withAuthTimeout(signUpWithSupabaseEmail(email, password, username));
      // A successful fresh signup changes identity; confirmation and guest
      // upgrade responses must still belong to the initiating session.
      if (result.status !== "signed-in" && version === authVersion.current) setAccountCompletion(result);
    } finally {
      setAccountBusy(false);
    }
  };

  const logout = async () => {
    if (logoutPending.current) return;
    logoutPending.current = true;
    resetAuthRef.current();
    try {
      await withAuthTimeout(signOutSupabase());
    } catch (error) {
      // A failed sign-out leaves the server session intact. Reconcile it
      // through a fresh guarded read instead of reviving an old snapshot.
      logoutPending.current = false;
      finishLogoutRef.current();
      throw error;
    } finally {
      logoutPending.current = false;
    }
  };

  const updatePlayerProfile = async (updates: { displayName?: string; avatarPreset?: string; bannerPreset?: string }) => {
    if (!user) throw new Error("Please sign in again before editing your profile.");
    const version = authVersion.current;
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

    if (version !== authVersion.current) throw new Error("Your session changed. Please try again.");

    const { error } = await supabase.from("profiles").update(patch).eq("id", user.uid);
    if (error) throw error;
    if (version !== authVersion.current) return;

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
        accountCompletion,
        accountBusy,
        clearAccountCompletion: () => setAccountCompletion(null),
        retryProfile: () => retryProfileRef.current(),
        signInWithGoogle: signInWithSupabaseGoogle,
        signInWithEmail: signInWithSupabaseEmail,
        signUpWithEmail,
        signInAsGuest: signInWithSupabaseGuest,
        logout,
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
