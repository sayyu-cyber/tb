import React from "react";
import { createRoot } from "react-dom/client";
import ProfilePage from "@/app/(main)/profile/page";

/**
 * Profile inside the Arena shell's two namespaces: `arena-app` for the
 * shared pieces, and the page's own `arena-profile`. The 84px inset stands
 * in for the collapsed sidebar rail, which is what the Profile board draws
 * (`left: 84px` on its .page).
 */
createRoot(document.getElementById("test-root")!).render(
  <div className="arena-app app-shell ar-stage">
    <div aria-hidden="true" style={{ width: 84, flex: "none" }} />
    <main className="app-shell-main">
      <ProfilePage />
    </main>
  </div>
);
