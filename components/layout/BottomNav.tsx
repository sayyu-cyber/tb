"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import CoinBalance from "@/components/economy/CoinBalance";
import { useTranslation } from "@/hooks/useTranslation";
import { sheetIn, staggerParent, riseIn, SPRING } from "@/lib/motion";
import { PRIMARY, SECONDARY, isActiveHref, type NavItem } from "@/constants/navigation";

function NavLink({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate?: () => void }) {
  const t = useTranslation();
  const accent = item.accent ?? "var(--gold)";

  return (
    <Link
      href={item.href}
      scroll={false}
      prefetch
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="relative flex flex-1 flex-col items-center gap-1 py-2 min-w-0 min-h-[52px] rounded-xl"
      style={{ ["--accent" as string]: accent } as React.CSSProperties}
    >
      {/* Shared layout id makes the pill glide between tabs rather than
          cross-fading in place. */}
      {active && (
        <motion.span
          layoutId="navActive"
          transition={SPRING}
          className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-[rgb(var(--accent)/12%)] border border-[rgb(var(--accent)/22%)]"
        />
      )}
      <item.icon
        size={20}
        strokeWidth={active ? 2.4 : 1.75}
        className={cn(
          "relative z-10 transition-colors duration-200",
          active ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]"
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          "relative z-10 text-[9px] font-semibold leading-none truncate max-w-full transition-colors duration-200",
          active ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]"
        )}
      >
        {t(item.key)}
      </span>
    </Link>
  );
}

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslation();
  const [moreOpen, setMoreOpen] = useState(false);

  const secondaryActive = SECONDARY.some((g) => g.items.some((i) => isActiveHref(pathname, i.href)));

  return (
    <>
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm"
            onClick={() => setMoreOpen(false)}
          >
            <motion.div
              variants={sheetIn}
              initial="hidden"
              animate="show"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={t("nav_moreTitle")}
              className="absolute bottom-0 inset-x-0 max-h-[80vh] overflow-y-auto rounded-t-3xl surface-raised
                         border-t border-[rgb(var(--gold)/20%)] px-4 pt-3 pb-28
                         max-w-md md:max-w-3xl lg:max-w-5xl mx-auto"
            >
              {/* Grab handle - signals the sheet is dismissible. */}
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[rgb(var(--c3))]" />

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-[rgb(var(--text-primary))]">{t("nav_moreTitle")}</h2>
                <button
                  onClick={() => setMoreOpen(false)}
                  aria-label={t("a11y_close")}
                  className="p-2 -mr-2 rounded-lg text-[rgb(var(--c4))] hover:text-[rgb(var(--text-primary))]"
                >
                  <X size={18} />
                </button>
              </div>

              <motion.div
                variants={staggerParent(0.03)}
                initial="hidden"
                animate="show"
                className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5"
              >
                {SECONDARY.map((group) => (
                  <div key={group.titleKey}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[rgb(var(--c4))] mb-2 px-1">
                      {t(group.titleKey)}
                    </p>
                    <div className="flex flex-col gap-1">
                      {group.items.map((item) => {
                        const accent = item.accent ?? "var(--gold)";
                        return (
                          <motion.div key={`${group.titleKey}-${item.key}`} variants={riseIn}>
                            <Link
                              href={item.href}
                              prefetch
                              onClick={() => setMoreOpen(false)}
                              style={{ ["--accent" as string]: accent } as React.CSSProperties}
                              className="flex items-center gap-3 rounded-xl border border-transparent
                                         px-2 py-2.5 min-h-[48px]
                                         transition-colors hover:bg-[rgb(var(--c2))] hover:border-[rgb(var(--accent)/35%)]"
                            >
                              <span className="flex items-center justify-center w-9 h-9 rounded-lg shrink-0 bg-[rgb(var(--accent)/12%)]">
                                <item.icon size={18} className="text-[rgb(var(--accent))]" aria-hidden="true" />
                              </span>
                              <span className="text-[13px] font-medium leading-tight text-[rgb(var(--c5))] truncate">
                                {t(item.key)}
                              </span>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.nav
        initial={{ y: 88 }}
        animate={{ y: 0 }}
        transition={SPRING}
        className="fixed bottom-0 left-0 right-0 z-[56] border-t border-[rgb(var(--c3))]
                   bg-[rgb(var(--c1)/92%)] backdrop-blur-xl
                   pb-[env(safe-area-inset-bottom)]"
      >
        <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto px-4 pt-2 flex justify-center md:hidden">
          <CoinBalance size="sm" />
        </div>

        <div className="max-w-md md:max-w-3xl lg:max-w-5xl mx-auto flex items-stretch gap-0.5 px-2 pb-1">
          {PRIMARY.map((item) => (
            <NavLink key={item.href} item={item} active={isActiveHref(pathname, item.href)} />
          ))}

          <button
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className="relative flex flex-1 flex-col items-center gap-1 py-2 min-w-0 min-h-[52px] rounded-xl"
            style={{ ["--accent" as string]: "var(--gold)" } as React.CSSProperties}
          >
            {secondaryActive && (
              <motion.span
                layoutId="navActive"
                transition={SPRING}
                className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-[rgb(var(--accent)/12%)] border border-[rgb(var(--accent)/22%)]"
              />
            )}
            <MoreHorizontal
              size={20}
              strokeWidth={secondaryActive ? 2.4 : 1.75}
              className={cn(
                "relative z-10 transition-colors duration-200",
                secondaryActive ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]"
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "relative z-10 text-[9px] font-semibold leading-none transition-colors duration-200",
                secondaryActive ? "text-[rgb(var(--accent))]" : "text-[rgb(var(--c4))]"
              )}
            >
              {t("nav_more")}
            </span>
          </button>
        </div>
      </motion.nav>
    </>
  );
}
