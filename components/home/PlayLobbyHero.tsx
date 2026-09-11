"use client";
import { Gamepad2 } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

export function PlayLobbyHero() {
  const t = useTranslation();
  return (
    <header className="flex items-center gap-4 py-2">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[rgb(var(--lagoon)/30%)] bg-[rgb(var(--lagoon)/10%)] text-[rgb(var(--lagoon))]"><Gamepad2 size={25} /></span>
      <div><p className="text-xs text-[rgb(var(--c4))] mb-1">Thaasbai</p><h1 className="text-2xl font-extrabold">{t("play_title")}</h1></div>
    </header>
  );
}
