"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { SplashScreen } from "@/components/auth/SplashScreen";

export default function SplashPage() {
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
      setTimeout(() => {
        router.push("/login");
      }, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <AnimatePresence>
      {showSplash && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          <SplashScreen />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
