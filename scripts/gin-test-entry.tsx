import React from "react";
import {createRoot} from "react-dom/client";
import {GinRummyGameClient} from "../components/game/GinRummyGameClient";
createRoot(document.getElementById("test-root")!).render(<GinRummyGameClient mode={location.search.includes("pass")?"passplay":"ai"}/>);
