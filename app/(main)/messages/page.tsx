"use client";

import { Suspense } from "react";
import { MessagesClient } from "@/components/messages/MessagesClient";
import { useTranslation } from "@/hooks/useTranslation";

export default function MessagesPage() {
  const t = useTranslation();
  return (
    <Suspense
      fallback={
        <div className="arena-messages ar-page">
          <p className="muted">{t("loading_messages")}</p>
        </div>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}
