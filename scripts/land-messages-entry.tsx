import React from "react";
import { createRoot } from "react-dom/client";
import MessagesPage from "../app/(main)/messages/page";
import { LandFrame } from "./land-frame";

// LMessages / LChat in the phone shell, fed the Messages board's threads
// (scripts/messages-test-services.tsx). ?with= opens one.
createRoot(document.getElementById("test-root")!).render(<LandFrame><MessagesPage /></LandFrame>);
