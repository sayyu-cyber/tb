import React from "react";
import { createRoot } from "react-dom/client";
import HomePage from "../app/(main)/home/page";
import { LandFrame } from "./land-frame";

// LHome in the phone shell, fed the Home board's sample data
// (scripts/home-test-services.tsx).
createRoot(document.getElementById("test-root")!).render(<LandFrame><HomePage /></LandFrame>);
