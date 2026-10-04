"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { resendAccountConfirmation, withAuthTimeout } from "@/lib/supabase/auth";
import { Button } from "@/components/ui/Button";

export function AccountCompletionNotice() {
  const { accountCompletion, clearAccountCompletion } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  if (!accountCompletion) return null;

  async function resend() {
    if (!accountCompletion || busy) return;
    setBusy(true);
    setError("");
    setSent(false);
    try {
      await withAuthTimeout(resendAccountConfirmation(accountCompletion));
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not resend the email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return <section aria-labelledby="account-completion-title" className="space-y-4 px-6 text-center">
    <h1 id="account-completion-title" className="text-2xl font-bold">
      {accountCompletion.status === "password-required" ? "Set your password" : "Check your email"}
    </h1>
    <p role="status" className="text-sm break-words">
      {accountCompletion.status === "password-required"
        ? "Your email is verified. Set a password to finish your account."
        : `Follow the confirmation link sent to ${accountCompletion.email}.`}
      {accountCompletion.upgrade && " Your guest account stays in place. After confirming your email, choose a password."}
    </p>
    {error && <p role="alert" className="text-sm text-[rgb(var(--coral-ink))]">{error}</p>}
    {sent && <p role="status" className="text-sm">Confirmation email requested. Check your inbox and spam folder.</p>}
    {accountCompletion.status === "password-required"
      ? <Link href="/reset-password?upgrade=1" className="underline">Set password</Link>
      : <Button type="button" fullWidth loading={busy} onClick={resend}>Resend confirmation</Button>}
    <Button type="button" variant="ghost" fullWidth disabled={busy} onClick={clearAccountCompletion}>Back to sign in</Button>
  </section>;
}
