import React from "react";
import { createRoot } from "react-dom/client";
import { ClubsClient } from "../components/clubs/ClubsClient";
createRoot(document.getElementById("test-root")!).render(<div className="app-shell"><main className="app-shell-main"><ClubsClient /></main></div>);
