"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";

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
    if (isGuest && pathname && guestRestrictedPaths.includes(pathname)) {
      router.push("/home");
    }
  }, [isGuest, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-10 h-10 border-2 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen bg-[#0F0F0F] pb-24"
    >
      {children}
    </motion.div>
  );
}
