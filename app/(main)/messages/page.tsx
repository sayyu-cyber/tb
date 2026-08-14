"use client";

import { Suspense } from "react";
import { MessagesClient } from "@/components/messages/MessagesClient";
import { useTranslation } from "@/hooks/useTranslation";

export default function MessagesPage() {
  const t = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
          <p className="text-[rgb(var(--c4))] text-sm">{t("loading_messages")}</p>
        </div>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}
