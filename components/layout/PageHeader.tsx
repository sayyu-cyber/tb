"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

export function PageHeader({ title }: { title: string }) {
  const router = useRouter();
  const t = useTranslation();

  return (
    <div className="flex items-center gap-3 mb-6 pt-2">
      <button
        aria-label={t("a11y_goBack")}
        onClick={() => router.push("/home")}
        className="p-2 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--gold)/20%)] text-[rgb(var(--gold))] hover:bg-[rgb(var(--gold)/10%)] transition-all"
      >
        <ArrowLeft size={20} />
      </button>
      <h1 className="text-xl font-bold text-[rgb(var(--gold))]">{title}</h1>
    </div>
  );
}