"use client";

import { useTranslation } from "@/hooks/useTranslation";

/**
 * Full-screen translated loading state, used as a <Suspense fallback>.
 *
 * This exists as its own client component for a specific reason: the pages
 * that use it are dynamic `[game]` routes that must export
 * generateStaticParams() so `output: 'export'` can pre-render them, and a
 * file cannot both be a client component and export that. Keeping the
 * translation lookup here lets those pages stay server components.
 *
 * @param labelKey i18n key for the message. Defaults to the generic
 *                 "Loading…" so callers that don't care can omit it.
 */
export function LoadingScreen({ labelKey = "error_loading" }: { labelKey?: string }) {
  const t = useTranslation();

  return (
    <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
      <p className="text-[rgb(var(--c4))] text-sm">{t(labelKey)}</p>
    </div>
  );
}
