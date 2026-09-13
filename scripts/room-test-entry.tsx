import React from "react";
import { createRoot } from "react-dom/client";
import { PrivateRoomSetup } from "../components/game/PrivateRoomSetup";
createRoot(document.getElementById("test-root")!).render(<div className="app-shell"><main className="app-shell-main"><PrivateRoomSetup gameId="mindi" /></main></div>);
