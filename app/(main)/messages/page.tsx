"use client";

import { Suspense } from "react";
import { MessagesClient } from "@/components/messages/MessagesClient";

export default function MessagesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[rgb(var(--c1))] flex items-center justify-center">
          <p className="text-[rgb(var(--c4))] text-sm">Loading messages…</p>
        </div>
      }
    >
      <MessagesClient />
    </Suspense>
  );
}
