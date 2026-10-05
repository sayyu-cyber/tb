import React from "react";
import { createRoot } from "react-dom/client";
import TournamentPage from "../app/tournament/page";
import { LandFrame } from "./land-frame";

// LLeague in the phone shell, fed the League board's standings
// (scripts/league-test-services.tsx).
createRoot(document.getElementById("test-root")!).render(<LandFrame><TournamentPage /></LandFrame>);
