import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import PlayPage from "../app/(main)/play/page";
import { MindiGameClient } from "../components/game/MindiGameClient";
import { GinRummyGameClient } from "../components/game/GinRummyGameClient";
import { MatchGateProvider } from "../contexts/MatchGateContext";
import { RotateGate } from "../components/layout/RotateGate";
function Fixture() {
  const [route, setRoute] = useState("/play");
  useEffect(() => { const go = (event: Event) => setRoute((event as CustomEvent<string>).detail); window.addEventListener("mobile-match-route", go); return () => window.removeEventListener("mobile-match-route", go); }, []);
  const match = route.includes("/casual/ai");
  return <div className={`arena-app arena-phone app-shell ${match ? "app-shell-match" : "ar-stage"}`}><MatchGateProvider>
    {match && <RotateGate />}
    {match ? route.includes("mindi") ? <MindiGameClient mode="ai" /> : <GinRummyGameClient mode="ai" /> : <PlayPage />}
  </MatchGateProvider></div>;
}
createRoot(document.getElementById("test-root")!).render(<Fixture />);
