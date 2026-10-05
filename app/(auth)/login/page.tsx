"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { LoginForm } from "@/components/auth/LoginForm";
import { ScatteredCards } from "@/components/auth/ScatteredCards";
import { useAuth } from "@/contexts/AuthContext";
import { takeRoomReturn } from "@/lib/authReturn";
import { AccountCompletionNotice } from "@/components/auth/AccountCompletionNotice";
import { LandAuthFrame } from "@/components/auth/land/LandAuthFrame";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";

export default function LoginPage() {
  const { user, loading, accountCompletion, accountBusy } = useAuth();
  const router = useRouter();
  const phone = usePhoneLayout();

  useEffect(() => {
    if (!loading && !accountBusy && !accountCompletion && user && !user.isGuest) {
      let destination = "/home";
      try { destination = takeRoomReturn() || destination; } catch { /* Storage is optional. */ }
      router.replace(destination);
    }
  }, [user, loading, router, accountCompletion, accountBusy]);

  const help = (
    <nav aria-label="Account help" className={phone ? "flex flex-wrap justify-center gap-4 mt-4 text-sm" : "flex flex-wrap justify-center gap-4 mt-6 text-sm"}>
      <Link href="/forgot-password" className="underline">Forgot password?</Link>
      <Link href="/confirm-email" className="underline">Resend confirmation</Link>
    </nav>
  );
  const guestNote = user?.isGuest && <p className="px-6 mb-4 text-sm text-center">Create an account or link Google to keep this guest profile. Signing in to an existing account switches profiles; guest progress is not merged.</p>;

  // A phone: the brand on the left, the form on the right (no rail when
  // signed out - design/arena/LANDSCAPE.md).
  if (phone) {
    return (
      <LandAuthFrame>
        {accountCompletion ? <AccountCompletionNotice /> : <>{guestNote}<LoginForm compact />{help}</>}
      </LandAuthFrame>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background: drifting playing cards (ambient, low-opacity) plus the
          existing soft gold glows on top, so the scene stays on the app's
          own dark/gold palette rather than introducing new colours. */}
      <ScatteredCards />
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[rgb(var(--gold)/5%)] rounded-full blur-3xl" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[rgb(var(--gold)/3%)] rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 34 }}
        className="w-full max-w-md relative z-10"
      >
        {accountCompletion ? <AccountCompletionNotice /> : <>
          {guestNote}
          <LoginForm />
          {help}
        </>}
      </motion.div>
    </div>
  );
}
