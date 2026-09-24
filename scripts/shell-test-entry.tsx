import React from "react";
import { createRoot } from "react-dom/client";
import { AppFrame } from "@/components/layout/AppShell";
import HomePage from "@/app/(main)/home/page";
createRoot(document.getElementById("test-root")!).render(<AppFrame><HomePage /></AppFrame>);
