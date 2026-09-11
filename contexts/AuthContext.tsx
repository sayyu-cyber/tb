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
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User, PlayerStats } from "@/types";
import { generatePlayerCode } from "@/lib/playerCode";

interface AuthContextType {
  user: User | null;
  playerStats: PlayerStats | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
  isGuest: boolean;
  updatePlayerProfile: (updates: { displayName?: string; avatarPreset?: string; bannerPreset?: string }) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        let displayName = firebaseUser.displayName;

        // Fetch player stats from Firestore
        const statsDoc = await getDoc(doc(db, "players", firebaseUser.uid));
        if (statsDoc.exists()) {
          const existing = statsDoc.data() as PlayerStats;
          // Backfill: accounts created before playerCode existed (or ones
          // whose players doc was created via a path that doesn't set it,
          // e.g. signInWithGoogle's own merge write) get one minted here,
          // the single place every signed-in session passes through.
          if (!existing.playerCode) {
            const playerCode = generatePlayerCode();
            await setDoc(doc(db, "players", firebaseUser.uid), { playerCode }, { merge: true });
            existing.playerCode = playerCode;
          }
          setPlayerStats(existing);
        } else {
          // Initialize stats for new user. Anonymous (guest) sign-ins have
          // no provider-supplied name, so mint one and persist it to the
          // Firebase Auth profile itself - that way it's still there next
          // time this same anonymous session resumes, not just this tab.
          if (firebaseUser.isAnonymous && !displayName) {
            displayName = `Guest_${Math.floor(Math.random() * 10000)}`;
            await updateFirebaseAuthProfile(firebaseUser, { displayName });
          }
          const playerCode = generatePlayerCode();
          await setDoc(doc(db, "players", firebaseUser.uid), {
            ...defaultStats,
            displayName,
            playerCode,
            createdAt: serverTimestamp(),
          });
          setPlayerStats({ ...defaultStats, playerCode });
        }

        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName,
          photoURL: firebaseUser.photoURL,
          isGuest: firebaseUser.isAnonymous,
          createdAt: new Date(),
        });
        setIsGuest(firebaseUser.isAnonymous);
      } else {
        setUser(null);
        setPlayerStats(null);
        setIsGuest(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    if (!auth.currentUser) return;

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
