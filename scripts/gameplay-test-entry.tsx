import React from "react";
import {createRoot} from "react-dom/client";
import {GinRummyGameClient} from "../components/game/GinRummyGameClient";
import {GinRummyOnlineClient} from "../components/game/GinRummyOnlineClient";
import {MindiGameClient} from "../components/game/MindiGameClient";
createRoot(document.getElementById("test-root")!).render(<React.StrictMode>{location.search.includes("mindi")?<MindiGameClient mode="ai"/>:location.search.includes("online")?<GinRummyOnlineClient matchId="fixture"/>:<GinRummyGameClient mode="ai"/>}</React.StrictMode>);
