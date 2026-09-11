"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Spade } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIMARY, SECONDARY, isActiveHref, type NavItem } from "@/constants/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { SPRING } from "@/lib/motion";

/**
 * Persistent desktop navigation: every destination the mobile "More" sheet
 * hides behind a tap, listed top-to-bottom in one always-visible left
 * column instead. Desktop has the width to spare, so there is no reason to
 * make a wide-screen player dig through a modal for Missions or Settings.
 *
 * Hidden below md - phones keep the bottom bar + sheet (see BottomNav),
 * which is the layout that actually fits a thumb-reachable 375px screen.
 */
function Row({ item, active }: { item: NavItem; active: boolean }) {
  const t = useTranslation();
  const accent = item.accent ?? "var(--gold)";

  return (
    <Link
      href={item.href}
      prefetch={false}
      style={{ ["--accent" as string]: accent } as React.CSSProperties}
      className="relative flex items-center gap-3 rounded-xl px-3 py-2.5"
    >
      {active && (
        <motion.span
          layoutId="sideNavActive"
          transition={SPRING}
          className="absolute inset-0 rounded-xl bg-[rgb(var(--accent)/12%)] border border-[rgb(var(--accent)/25%)]"
        />
      )}
      <item.icon
        size={18}
        strokeWidth={active ? 2.4 : 1.75}
        className={cn("relative z-10 shrink-0", active ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]")}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative z-10 text-[13px] font-medium truncate",
          active ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c5))]"
        )}
      >
        {t(item.key)}
      </span>
    </Link>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const t = useTranslation();

  return (
    <aside
      className="hidden md:flex md:flex-col md:w-60 lg:w-64 shrink-0 sticky top-0 h-screen overflow-y-auto
                 border-r border-[rgb(var(--c3))] bg-[rgb(var(--c1))] px-3 py-5"
    >
      <div className="flex items-center gap-2 px-2 mb-6">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-[rgb(var(--gold)/12%)]">
          <Spade size={16} className="text-[rgb(var(--gold))]" aria-hidden="true" />
        </span>
        <span className="gold-text-gradient text-base font-bold tracking-tight">Thaasbai</span>
      </div>

      <nav className="flex flex-col gap-0.5">
        {PRIMARY.map((item) => (
          <Row key={item.href} item={item} active={isActiveHref(pathname, item.href)} />
        ))}
      </nav>

      {SECONDARY.map((group) => (
        <div key={group.titleKey} className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--c4))] mb-1.5 px-3">
            {t(group.titleKey)}
          </p>
          <nav className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <Row key={`${group.titleKey}-${item.key}`} item={item} active={isActiveHref(pathname, item.href)} />
            ))}
          </nav>
        </div>
      ))}
    </aside>
  );
}
