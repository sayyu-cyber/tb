"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile as updateFirebaseAuthProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, onSnapshot, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
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

const defaultStats: PlayerStats = {
  totalMatches: 0,
  wins: 0,
  losses: 0,
  winPercentage: 0,
  favoriteGame: null,
  highestRank: "Unranked",
  trophies: 0,
  currentRank: "Unranked",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(false);
  const [profileAttempt, setProfileAttempt] = useState(0);

  useEffect(() => {
    let generation = 0;
    let stopProfile: (() => void) | undefined;
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      const current = ++generation;
      stopProfile?.();
      stopProfile = undefined;
      if (!firebaseUser) {
        setUser(null);
        setPlayerStats(null);
        setIsGuest(false);
        setLoading(false);
        setProfileLoading(false);
        setProfileError(false);
        return;
      }

      const displayName = firebaseUser.displayName || (firebaseUser.isAnonymous ? "Guest" : "Player");
      // Authentication is already resolved; profile reads do not block navigation.
      setUser({
        uid: firebaseUser.uid, email: firebaseUser.email, displayName,
        photoURL: firebaseUser.photoURL, isGuest: firebaseUser.isAnonymous,
        createdAt: new Date(firebaseUser.metadata.creationTime || NaN),
      });
      setIsGuest(firebaseUser.isAnonymous);
      setPlayerStats(null);
      setProfileLoading(true);
      setProfileError(false);
      setLoading(false);

      try {
        const ref = doc(db, "players", firebaseUser.uid);
        const statsDoc = await getDoc(ref);
        if (current !== generation) return;
        if (statsDoc.exists()) {
          const existing = statsDoc.data() as PlayerStats;
          if (!existing.playerCode) {
            existing.playerCode = generatePlayerCode();
            await setDoc(ref, { playerCode: existing.playerCode }, { merge: true });
          }
          if (current === generation) setPlayerStats(existing);
        } else {
          const playerCode = generatePlayerCode();
          await setDoc(ref, { ...defaultStats, displayName, playerCode, createdAt: serverTimestamp() });
          if (current === generation) setPlayerStats({ ...defaultStats, playerCode });
        }
        if (current !== generation) return;
        // Match results and edits on another device should reach every HUD
        // through the same player state, without a full-page reload.
        stopProfile = onSnapshot(ref, snapshot => {
          if (current !== generation) return;
          if (!snapshot.exists()) { setProfileError(true); return; }
          setPlayerStats(snapshot.data() as PlayerStats);
          setProfileError(false);
        }, () => {
          if (current === generation) setProfileError(true);
        });
      } catch (error) {
        console.error("Failed to load player profile:", error);
        if (current === generation) setProfileError(true);
      } finally {
        if (current === generation) setProfileLoading(false);
      }
    });
    return () => { generation++; stopProfile?.(); unsubscribe(); };
  }, [profileAttempt]);

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);

    await setDoc(
      doc(db, "players", result.user.uid),
      {
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        email: result.user.email,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  };

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await updateFirebaseAuthProfile(result.user, { displayName: username });

    await setDoc(doc(db, "players", result.user.uid), {
      ...defaultStats,
      displayName: username,
      email,
      createdAt: serverTimestamp(),
    });
  };

  // A real (anonymous) Firebase session rather than a locally-fabricated
  // user - so it survives a refresh via Firebase's own persistence, and
  // satisfies the `request.auth != null` Firestore rules that every other
  // read/write in the app is already gated on. onAuthStateChanged above
  // handles naming the guest and initialising their stats doc.
  const signInAsGuest = async () => {
    await signInAnonymously(auth);
  };

  const updatePlayerProfile = async (updates: { displayName?: string; avatarPreset?: string; bannerPreset?: string }) => {
    const { displayName, ...cosmeticUpdates } = updates;
    if (!auth.currentUser) throw new Error("Please sign in again before editing your profile.");

    if (displayName && displayName !== auth.currentUser.displayName) {
      await updateFirebaseAuthProfile(auth.currentUser, { displayName });
    }

    await setDoc(
      doc(db, "players", auth.currentUser.uid),
      { ...updates, updatedAt: serverTimestamp() },
      { merge: true }
    );

    setUser((prev) => (prev ? { ...prev, displayName: displayName ?? prev.displayName } : prev));
    setPlayerStats((prev) => (prev ? { ...prev, ...cosmeticUpdates } : prev));
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        playerStats,
        loading,
        profileLoading,
        profileError,
        retryProfile: () => setProfileAttempt(value => value + 1),
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInAsGuest,
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
