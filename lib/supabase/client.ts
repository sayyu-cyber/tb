import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type ThaasbaiSupabaseClient = SupabaseClient<any, "public", any>;

let browserClient: ThaasbaiSupabaseClient | null = null;

function requirePublicEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local and Netlify environment variables.`);
  }
  return value;
}

export function getSupabaseBrowserClient(): ThaasbaiSupabaseClient {
  if (browserClient) return browserClient;

  const url = requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
  const publishableKey = requirePublicEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  );

  browserClient = createClient(url, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

