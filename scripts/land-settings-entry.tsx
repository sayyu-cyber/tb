import React from "react";
import { createRoot } from "react-dom/client";
import SettingsPage from "../app/(main)/settings/page";
import { LandFrame } from "./land-frame";

// LSettings in the phone shell (scripts/settings-test-services.tsx, ?board).
createRoot(document.getElementById("test-root")!).render(<LandFrame><SettingsPage /></LandFrame>);
