import React from "react";
import { createRoot } from "react-dom/client";
import RewardsPage from "../app/rewards/page";
import MissionsPage from "../app/missions/page";
import { LandFrame } from "./land-frame";

// LRewards in the phone shell, fed the Rewards board's week and missions
// (scripts/rewards-test-services.tsx). ?missions opens the other route,
// which is the same screen on a phone.
const which = location.search.includes("missions") ? <MissionsPage /> : <RewardsPage />;
createRoot(document.getElementById("test-root")!).render(<LandFrame>{which}</LandFrame>);
