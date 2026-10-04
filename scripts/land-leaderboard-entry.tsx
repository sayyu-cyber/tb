import React from "react";
import { createRoot } from "react-dom/client";
import LeaderboardPage from "../app/(main)/leaderboard/page";
import { LandFrame } from "./land-frame";

// LLeaderboard in the phone shell, fed the Leaderboard board's rows
// (scripts/leaderboard-test-services.tsx).
createRoot(document.getElementById("test-root")!).render(<LandFrame><LeaderboardPage /></LandFrame>);
