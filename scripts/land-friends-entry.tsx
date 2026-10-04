import React from "react";
import { createRoot } from "react-dom/client";
import FriendsPage from "../app/(main)/friends/page";
import { LandFrame } from "./land-frame";

// LFriends in the phone shell, fed the Friends board's roster
// (scripts/friends-test-services.tsx, ?populated).
createRoot(document.getElementById("test-root")!).render(<LandFrame><FriendsPage /></LandFrame>);
