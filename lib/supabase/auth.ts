import type { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { User } from "@/types";

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
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signInWithSupabaseGoogle(): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/home`;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) throw error;
}

export async function signInWithSupabaseEmail(email: string, password: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signUpWithSupabaseEmail(email: string, password: string, displayName: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        full_name: displayName,
      },
    },
  });
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

