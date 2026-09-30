"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { GameLoading } from "@/components/system/GameLoading";
import { rememberRoomReturn, takeRoomReturn } from "@/lib/authReturn";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isGuest } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      rememberRoomReturn(window.location.pathname + window.location.search);
      router.push("/login");
    } else if (!loading && user && !isGuest && pathname?.replace(/\/$/, "") === "/home") {
      const destination = takeRoomReturn();
      if (destination) router.replace(destination);
    }
  }, [user, loading, router, pathname, isGuest]);

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
