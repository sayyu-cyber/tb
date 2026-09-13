import React from "react";
import { createRoot } from "react-dom/client";
import SettingsPage from "../app/(main)/settings/page";
import { SettingsProvider } from "../contexts/SettingsContext";
createRoot(document.getElementById("test-root")!).render(<SettingsProvider><div className="app-shell"><main className="app-shell-main"><SettingsPage /></main></div></SettingsProvider>);
