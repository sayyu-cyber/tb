import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { useCasualQueue } from "@/hooks/useCasualQueue";
import { fixture } from "./casual-matchmaking-test-services";
function TestQueue() {
  const [settings, setSettings] = useState({ game: "gin-rummy", active: false });
  fixture.configure = setSettings;
  const state = useCasualQueue(settings.game, settings.active);
  fixture.state = state;
  return <div>{state.error || (state.matchFound ? "found" : "waiting")}</div>;
}
createRoot(document.getElementById("test-root")!).render(<TestQueue />);
