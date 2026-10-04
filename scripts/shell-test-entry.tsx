import React from "react";
import { createRoot } from "react-dom/client";
import { AppFrame } from "@/components/layout/AppShell";
import { TurnGate } from "@/components/layout/TurnGate";
import HomePage from "@/app/(main)/home/page";
// The root layout mounts the turn gate beside the shell, so the fixture does.
// ?iphone takes the orientation lock away, as iOS has none.
if (location.search.includes("iphone")) delete (ScreenOrientation.prototype as { lock?: unknown }).lock;
createRoot(document.getElementById("test-root")!).render(<><AppFrame><HomePage /></AppFrame><TurnGate /></>);
