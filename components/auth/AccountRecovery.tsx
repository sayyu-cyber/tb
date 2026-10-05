"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { requestPasswordRecovery, resendAccountConfirmation, setAccountPassword, withAuthTimeout } from "@/lib/supabase/auth";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { LandAuthFrame } from "./land/LandAuthFrame";

export function AccountRecovery({ mode }: { mode: "request" | "reset" | "confirmation" }) {
  const { clearAccountCompletion } = useAuth();
  const phone = usePhoneLayout();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(mode !== "reset");
  const [checking, setChecking] = useState(mode === "reset");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (mode !== "reset") return;
    let active = true;
    const params = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    async function checkLink() {
      try {
        if (params.has("error") || params.has("error_code") || query.has("error") || query.has("error_code")) {
          throw new Error("This link is invalid or expired. Request a new email below.");
        }
        // getUser waits for the client's URL session detection and validates
        // the resulting identity, including links opened in a fresh browser.
        const { data, error: authError } = await withAuthTimeout(getSupabaseBrowserClient().auth.getUser());
        if (authError || !data.user || data.user.is_anonymous || !data.user.email_confirmed_at) {
          throw new Error("This link is invalid or expired. Request a new email below.");
        }
        if (active) setReady(true);
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to verify this link. Please try again.");
      } finally {
        if (active) setChecking(false);
      }
    }
    void checkLink();
    return () => { active = false; };
  }, [mode]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !ready) return;
    setError("");
    if (mode === "reset" && password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        await withAuthTimeout(setAccountPassword(password));
        clearAccountCompletion();
        setPassword("");
        setConfirmation("");
      } else if (mode === "confirmation") {
        await withAuthTimeout(resendAccountConfirmation({ status: "confirmation-required", email: email.trim(), upgrade: false }));
      } else {
        await withAuthTimeout(requestPasswordRecovery(email.trim()));
      }
      setDone(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The request failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "w-full rounded-lg border border-[rgb(var(--c3))] bg-[rgb(var(--c2))] px-4 py-3 text-[rgb(var(--text-primary))]";
  const section = (
    <section aria-labelledby="recovery-title" className={phone ? "w-full max-w-sm mx-auto space-y-4 text-[rgb(var(--text-primary))]" : "w-full max-w-sm space-y-5"}>
      <h1 id="recovery-title" className="text-2xl font-bold">
        {mode === "reset" ? "Set your password" : mode === "confirmation" ? "Confirm your email" : "Reset your password"}
      </h1>
      {checking && <p role="status">Checking your link...</p>}
      {error && <p id="recovery-error" role="alert" className="text-sm text-[rgb(var(--coral-ink))]">{error}</p>}
      {done ? <>
        <p role="status">{mode === "reset" ? "Your password has been updated."
          : "If this email is eligible, you will receive a link shortly. Check your inbox and spam folder."}</p>
        {mode !== "reset" && <Button type="button" variant="secondary" fullWidth onClick={() => setDone(false)}>Send another email</Button>}
      </> : ready && <form onSubmit={submit} className="space-y-4" aria-describedby={error ? "recovery-error" : undefined}>
        {mode === "reset" ? <>
          <label className="block space-y-2"><span>New password</span><input className={inputClass} type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy} /></label>
          <label className="block space-y-2"><span>Confirm password</span><input className={inputClass} type="password" autoComplete="new-password" minLength={8} maxLength={128} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} /></label>
        </> : <label className="block space-y-2"><span>Email</span><input className={inputClass} type="email" autoComplete="email" maxLength={254} required value={email} onChange={(event) => setEmail(event.target.value)} disabled={busy} /></label>}
        <Button type="submit" fullWidth loading={busy}>{mode === "reset" ? "Save password" : "Send email"}</Button>
      </form>}
      {mode === "reset" && !checking && !ready && <Link href="/forgot-password" className="block underline">Request a new recovery email</Link>}
      <Link href="/login" className="block text-sm underline">{done && mode === "reset" ? "Continue" : "Back to sign in"}</Link>
    </section>
  );
  // A phone: the brand on the left, the form on the right (LandAuthFrame).
  if (phone) return <LandAuthFrame>{section}</LandAuthFrame>;
  return <main className="min-h-screen bg-[rgb(var(--c1))] text-[rgb(var(--text-primary))] flex items-center justify-center px-6 py-10">
    {section}
  </main>;
}
