import React from "react";
import { createRoot } from "react-dom/client";
import ProfilePage from "../app/(main)/profile/page";
import { LandFrame } from "./land-frame";

// LProfile in the phone shell, fed the Profile board's sample data
// (scripts/profile-test-services.tsx).
createRoot(document.getElementById("test-root")!).render(<LandFrame><ProfilePage /></LandFrame>);
