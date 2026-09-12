"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { GameLoading } from "@/components/system/GameLoading";

const guestRestrictedPaths = ["/leaderboard"];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isGuest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (isGuest && pathname && guestRestrictedPaths.includes(pathname.replace(/\/$/, ''))) {
      router.push("/home");
    }
  }, [isGuest, pathname, router]);

  if (loading) {
    return <GameLoading />;
  }

  if (!user) {
    return null;
  }

  return (
    <div
      className="min-h-screen bg-[rgb(var(--c1))]"
    >
      {children}
    </div>
  );
}
