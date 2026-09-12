"use client";

import { useState, type ReactNode } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";

/**
 * Wraps a form field with a mouse-following radial glow, gold-tinted to
 * match the rest of the app rather than the generic blue often used for
 * this effect. Purely decorative (aria-hidden via the glow layer itself
 * being non-interactive) - the actual input inside is untouched.
 */
export function SpotlightField({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(false);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const { left, top } = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - left);
    mouseY.set(e.clientY - top);
  }

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      className="rounded-xl p-px transition duration-300"
      style={{
        background: useMotionTemplate`radial-gradient(${visible ? "160px" : "0px"} circle at ${mouseX}px ${mouseY}px, rgb(var(--gold)/45%), transparent 80%)`,
      }}
    >
      {children}
    </motion.div>
  );
}
