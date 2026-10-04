import React from "react";
import { createRoot } from "react-dom/client";
import { ClubsClient } from "../components/clubs/ClubsClient";
import { LandFrame } from "./land-frame";

// LClubs in the phone shell, fed the Clubs board's clubs
// (scripts/clubs-test-services.tsx; ?roster for the full 24 members).
createRoot(document.getElementById("test-root")!).render(<LandFrame><ClubsClient /></LandFrame>);
