import React from "react";
import { createRoot } from "react-dom/client";
import HomePage from "../app/(main)/home/page";
import { HomeSidebar } from "../components/layout/HomeSidebar";
createRoot(document.getElementById("test-root")!).render(<div className="app-shell app-shell-home"><aside className="app-side-nav" style={{width:56,flexShrink:0}} /><HomeSidebar /><main className="app-shell-main"><HomePage /></main></div>);
