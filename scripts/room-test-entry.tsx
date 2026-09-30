import React from "react";
import { createRoot } from "react-dom/client";
import { PrivateRoomSetup } from "../components/game/PrivateRoomSetup";
import { AppFrame } from "../components/layout/AppShell";
localStorage.setItem("thaasbai.rooms.sayyu", JSON.stringify(["TF2GRQ", "76MTJX", "X9FDGC", "Z4C3EF"]));
createRoot(document.getElementById("test-root")!).render(<AppFrame><PrivateRoomSetup gameId={location.search.includes("gin") ? "gin-rummy" : "mindi"} /></AppFrame>);
