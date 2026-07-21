"use client";

import { motion } from "framer-motion";
import { Home, Gamepad2, Trophy, User, Settings, ShoppingBag, Target, Gift } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import CoinBalance from "@/components/economy/CoinBalance";

const navItems = [
  { icon: Home, label: "Home", href: "/home" },
  { icon: Gamepad2, label: "Play", href: "/play" },
  { icon: ShoppingBag, label: "Shop", href: "/shop" },
  { icon: Target, label: "Missions", href: "/missions" },
  { icon: Gift, label: "Rewards", href: "/rewards" },
  { icon: Trophy, label: "Leaderboard", href: "/leaderboard" },
  { icon: User, label: "Profile", href: "/profile" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <motion.nav
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-[#0F0F0F]/95 backdrop-blur-xl border-t border-[#D4AF37]/10"
    >
      {/* Coin Balance - Added at top of nav */}
      <div className="max-w-md mx-auto px-4 pt-2 pb-1 flex justify-center">
        <CoinBalance size="sm" />
      </div>

      <div className="max-w-md mx-auto flex items-center justify-around py-1 px-1 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link 
              key={item.href} 
              href={item.href} 
              scroll={false}
              prefetch={false}
              className="relative flex flex-col items-center py-1 px-2 min-w-[48px]"
            >
              <motion.div
                whileTap={{ scale: 0.85 }}
                className="relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -inset-2 bg-[#D4AF37]/10 rounded-xl"
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
                <Icon
                  size={20}
                  className={cn(
                    "relative z-10 transition-colors duration-200",
                    isActive ? "text-[#D4AF37]" : "text-[#3A3A3A]"
                  )}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
              </motion.div>
              <span
                className={cn(
                  "text-[9px] mt-0.5 font-medium transition-colors duration-200",
                  isActive ? "text-[#D4AF37]" : "text-[#3A3A3A]"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area padding for iOS */}
      <div className="h-safe-area-inset-bottom" />
    </motion.nav>
  );
}