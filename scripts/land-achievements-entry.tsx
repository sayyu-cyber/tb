import React from "react";
import { createRoot } from "react-dom/client";
import AchievementsPage from "../components/achievements/AchievementsPage";
import { LandFrame } from "./land-frame";

// LAchievements in the phone shell, fed the Achievements board's progress
// (scripts/achievements-test-services.tsx).
createRoot(document.getElementById("test-root")!).render(<LandFrame><AchievementsPage /></LandFrame>);
