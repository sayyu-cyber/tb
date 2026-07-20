"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updateProfile,
  User as FirebaseUser,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { User, PlayerStats } from "@/types";

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const userData: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          isGuest: false,
          createdAt: new Date(),
        };
        setUser(userData);
        setIsGuest(false);

        // Fetch player stats from Firestore
        const statsDoc = await getDoc(doc(db, "players", firebaseUser.uid));
        if (statsDoc.exists()) {
          setPlayerStats(statsDoc.data() as PlayerStats);
        } else {
          // Initialize stats for new user
          await setDoc(doc(db, "players", firebaseUser.uid), {
            ...defaultStats,
            createdAt: serverTimestamp(),
          });
          setPlayerStats(defaultStats);
        }
      } else {
        setUser(null);
        setPlayerStats(null);
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
    await updateProfile(result.user, { displayName: username });

    await setDoc(doc(db, "players", result.user.uid), {
      ...defaultStats,
      displayName: username,
      email,
      createdAt: serverTimestamp(),
    });
  };

  const signInAsGuest = async () => {
    const guestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const guestUser: User = {
      uid: guestId,
      email: null,
      displayName: `Guest_${Math.floor(Math.random() * 10000)}`,
      photoURL: null,
      isGuest: true,
      createdAt: new Date(),
    };
    setUser(guestUser);
    setIsGuest(true);
    setPlayerStats({
      ...defaultStats,
      currentRank: "Guest",
    });
  };

  const logout = async () => {
    if (isGuest) {
      setUser(null);
      setIsGuest(false);
      setPlayerStats(null);
      return;
    }
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
