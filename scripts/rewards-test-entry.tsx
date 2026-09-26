import React from "react";
import { createRoot } from "react-dom/client";
import RewardsPage from "@/app/rewards/page";
import MissionsPage from "@/app/missions/page";

/**
 * One board (app-13) drives both routes: ?missions renders /missions,
 * otherwise /rewards. The 84px inset stands in for the collapsed sidebar
 * rail, which is what the Rewards board draws.
 */
const which = typeof location !== "undefined" && location.search.includes("missions")
  ? <MissionsPage />
  : <RewardsPage />;

createRoot(document.getElementById("test-root")!).render(
  <div className="arena-app app-shell ar-stage">
    <div aria-hidden="true" style={{ width: 84, flex: "none" }} />
    <main className="app-shell-main">{which}</main>
  </div>
);
