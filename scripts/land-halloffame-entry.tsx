import React from "react";
import { createRoot } from "react-dom/client";
import HallOfFamePage from "../app/hall-of-fame/page";
import { LandFrame } from "./land-frame";

// LHallOfFame in the phone shell, fed the HallOfFame board's legends
// (scripts/halloffame-test-services.tsx).
createRoot(document.getElementById("test-root")!).render(<LandFrame><HallOfFamePage /></LandFrame>);
