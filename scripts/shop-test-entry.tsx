import React from "react";
import { createRoot } from "react-dom/client";
import ShopPage from "../app/shop/page";

/**
 * The Shop inside the Arena shell's namespaces. The 84px inset stands in
 * for the collapsed sidebar rail, which is what the Shop board draws
 * (`left: 84px` on its .page).
 */
createRoot(document.getElementById("test-root")!).render(
  <div className="arena-app app-shell ar-stage">
    <div aria-hidden="true" style={{ width: 84, flex: "none" }} />
    <main className="app-shell-main"><ShopPage /></main>
  </div>
);
