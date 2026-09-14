import React from "react";
import {createRoot} from "react-dom/client";
import {MindiGameClient} from "../components/game/MindiGameClient";
import {MindiOnlineClient} from "../components/game/MindiOnlineClient";
createRoot(document.getElementById("test-root")!).render(location.search.includes("online")?<MindiOnlineClient matchId="test"/>:<MindiGameClient mode={location.search.includes("pass")?"passplay":"ai"}/>);
