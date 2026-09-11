"use client";

import { ArrowLeft, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";

export function PageHeader({ title, subtitle, icon: Icon, actions }: { title: string; subtitle?: string; icon?: LucideIcon; actions?: React.ReactNode }) {
  const router = useRouter();
  const t = useTranslation();

  return (
    <header className="hub-page-header">
      <button
        aria-label={t("a11y_goBack")}
        onClick={() => router.push("/home")}
        className="p-2 rounded-lg bg-[rgb(var(--c2))] border border-[rgb(var(--gold)/20%)] text-[rgb(var(--gold-ink))] hover:bg-[rgb(var(--gold)/10%)] transition-all"
      >
        <ArrowLeft size={20} />
      </button>
      <div className="min-w-0 flex-1"><p className="text-[10px] text-[rgb(var(--c4))] mb-1">THAASBAI</p><h1 className="text-2xl font-extrabold flex items-center gap-2">{Icon && <Icon size={22} className="text-[rgb(var(--lagoon))] shrink-0" />}{title}</h1>{subtitle && <p className="mt-2 text-xs text-[rgb(var(--c4))]">{subtitle}</p>}</div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}
