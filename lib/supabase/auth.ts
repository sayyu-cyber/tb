import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@/types";

export type AccountCompletion = {
  status: "signed-in" | "confirmation-required" | "password-required";
  email: string;
  upgrade: boolean;
};

export async function withAuthTimeout<T>(request: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("The request timed out. Please try again.")), 15000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

function authRedirect(path: string): string | undefined {
  return typeof window === "undefined" ? undefined : `${window.location.origin}${path}`;
}

export function toAppUser(user: SupabaseUser): User {
  const metadata = user.user_metadata ?? {};
  const displayName =
    typeof metadata.full_name === "string"
      ? metadata.full_name
      : typeof metadata.name === "string"
        ? metadata.name
        : typeof metadata.display_name === "string"
          ? metadata.display_name
          : user.email?.split("@")[0] ?? "Player";
  const photoURL = typeof metadata.avatar_url === "string" ? metadata.avatar_url : null;

  return {
    uid: user.id,
    email: user.email ?? null,
    displayName,
    photoURL,
    isGuest: user.is_anonymous ?? false,
    createdAt: new Date(user.created_at),
  };
}

export async function getSupabaseSession(): Promise<Session | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await withAuthTimeout(supabase.auth.getSession());
  if (error) throw error;
  return data.session;
}

export async function signInWithSupabaseGoogle(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const session = await getSupabaseSession();
  const credentials = {
    provider: "google",
    options: { redirectTo: authRedirect("/home") },
  } as const;
  // Linking keeps the anonymous user's id and progress. A disabled linking
  // capability must surface its error, never fall back to replacing the user.
  const { error } = session?.user.is_anonymous
    ? await supabase.auth.linkIdentity(credentials)
    : await supabase.auth.signInWithOAuth(credentials);
  if (error) throw error;
}

export async function signInWithSupabaseEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithSupabaseEmail(email: string, password: string, displayName: string): Promise<AccountCompletion> {
  const supabase = getSupabaseBrowserClient();
  const session = await getSupabaseSession();
  const metadata = { display_name: displayName, full_name: displayName };
  if (session?.user.is_anonymous) {
    // Supabase requires a verified email before an anonymous user can set a
    // password. Do not retain the submitted password while awaiting email.
    const { data, error } = await supabase.auth.updateUser(
      { email, data: metadata },
      { emailRedirectTo: authRedirect("/reset-password?upgrade=1") }
    );
    if (error) throw error;
    if (!data.user || data.user.id !== session.user.id) throw new Error("Account upgrade could not be verified. Please try again.");
    return {
      status: data.user.email_confirmed_at && !data.user.is_anonymous ? "password-required" : "confirmation-required",
      email,
      upgrade: true,
    };
  }
  if (session) throw new Error("You are already signed in. Sign out before creating another account.");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: authRedirect("/login"),
    },
  });
  if (error) throw error;
  return { status: data.session ? "signed-in" : "confirmation-required", email, upgrade: false };
}

export async function resendAccountConfirmation(completion: AccountCompletion): Promise<void> {
  const { error } = await getSupabaseBrowserClient().auth.resend({
    type: completion.upgrade ? "email_change" : "signup",
    email: completion.email,
    options: { emailRedirectTo: authRedirect(completion.upgrade ? "/reset-password?upgrade=1" : "/login") },
  });
  if (error) throw error;
}

export async function requestPasswordRecovery(email: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, {
    redirectTo: authRedirect("/reset-password"),
  });
  if (error) throw error;
}

export async function setAccountPassword(password: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { data, error: userError } = await withAuthTimeout(supabase.auth.getUser());
  if (userError) throw userError;
  if (!data.user || data.user.is_anonymous || !data.user.email_confirmed_at) {
    throw new Error("Open a valid confirmation or recovery email before setting your password.");
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

export async function signInWithSupabaseGuest(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

