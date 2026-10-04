import { createMatchHandler } from "./matchCommandHandler";

declare const Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Promise<Response>): void };

Deno.serve(createMatchHandler({
  url: Deno.env.get("SUPABASE_URL") ?? "",
  serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  origins: (Deno.env.get("GAME_ALLOWED_ORIGINS") ?? "").split(",").map(value => value.trim()).filter(Boolean),
}));
