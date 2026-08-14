import type { Transition, Variants } from "framer-motion";

/**
 * Shared motion language.
 *
 * The app previously animated 29 different elements with the exact same
 * `initial={{ opacity: 0, y: 20 }}`, so a page title, a stat tile and a
 * victory screen all arrived identically. Motion carried no information.
 *
 * These presets give entrances a weight that matches their importance,
 * and standardise on spring physics rather than fixed durations, so
 * things settle the way physical objects do instead of easing linearly
 * into place.
 */

/* ---------------------------------------------------------------------
   TRANSITIONS
   --------------------------------------------------------------------- */

/** Default: quick and settled, no visible bounce. For most UI. */
export const SPRING: Transition = { type: "spring", stiffness: 420, damping: 34 };

/** Softer and slower - for large surfaces entering, e.g. a modal panel. */
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 260, damping: 28 };

/** Overshoots slightly. Reserve for reward/celebration moments. */
export const SPRING_POP: Transition = { type: "spring", stiffness: 500, damping: 18 };

/** Non-spring, for opacity-only or colour crossfades. */
export const EASE: Transition = { duration: 0.22, ease: [0.32, 0.72, 0, 1] };

/* ---------------------------------------------------------------------
   VARIANTS
   --------------------------------------------------------------------- */

/** Small rise. The everyday entrance - subtle, 8px not 20px. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: SPRING },
};

/** Scale-and-fade, for things that "appear" rather than "arrive". */
export const popIn: Variants = {
  hidden: { opacity: 0, scale: 0.94 },
  show: { opacity: 1, scale: 1, transition: SPRING_POP },
};

/** Slide from the leading edge - for list rows. */
export const slideIn: Variants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: SPRING },
};

/** Modal / sheet: rises from below on mobile, scales on larger screens. */
export const sheetIn: Variants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: SPRING_SOFT },
  exit: { opacity: 0, y: 16, scale: 0.98, transition: EASE },
};

/**
 * Parent for a stagger. Children inherit `hidden`/`show` automatically, so
 * a list becomes:
 *
 *   <motion.ul variants={staggerParent()} initial="hidden" animate="show">
 *     {items.map(i => <motion.li key={i} variants={riseIn} />)}
 *   </motion.ul>
 *
 * This replaces the previous pattern of hand-computing
 * `transition={{ delay: index * 0.05 }}` at every call site, which meant a
 * 40-row list ended up with a two-second cascade.
 */
export function staggerParent(stagger = 0.045, delayChildren = 0): Variants {
  return {
    hidden: {},
    show: {
      transition: {
        staggerChildren: stagger,
        delayChildren,
        // Cap the cascade: beyond ~12 items the delay stops feeling
        // deliberate and starts feeling slow.
        staggerDirection: 1,
      },
    },
  };
}

/* ---------------------------------------------------------------------
   INTERACTION
   --------------------------------------------------------------------- */

/** Press feedback. Small — 0.9 reads rubbery, 0.975 reads solid. */
export const pressable = {
  whileTap: { scale: 0.975 },
  transition: { type: "spring" as const, stiffness: 600, damping: 30 },
};

/** Lift on hover, for whole-surface targets. */
export const liftable = {
  whileHover: { y: -3 },
  transition: SPRING,
};
