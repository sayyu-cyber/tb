import { getSupabaseBrowserClient } from "./supabase/client";

/** No fallback to client-authored state: a missing server must fail closed. */
export async function invokeMatchCommand<T>(command: Record<string, unknown>): Promise<T> {
  const { data, error } = await getSupabaseBrowserClient().functions.invoke("match-command", { body: command, timeout: 30000 });
  if (error) {
    let message = "The game server is unavailable. Please try again.";
    if (error.context instanceof Response) {
      const body = await error.context.json().catch(() => null);
      if (typeof body?.error === "string") message = body.error;
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data?.result as T;
}
