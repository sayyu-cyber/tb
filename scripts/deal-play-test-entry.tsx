import React from "react";
import { createRoot } from "react-dom/client";
import { MindiGameClient } from "../components/game/MindiGameClient";
import { MindiOnlineClient } from "../components/game/MindiOnlineClient";
import { GinRummyGameClient } from "../components/game/GinRummyGameClient";
import { GinRummyOnlineClient } from "../components/game/GinRummyOnlineClient";

/**
 * The opening deal played for real, through the game clients and their
 * engines rather than a fixture table: vs AI in both games, and online
 * replaying the cut stored on the match (scripts/mindi-test-services.tsx and
 * gameplay-test-services.tsx serve the match documents).
 *
 *   ?mindi-ai  ?gin-ai  ?mindi-online&intro[&duel]  ?gin-online&intro
 */
const q = location.search;
const game = q.includes("mindi-online") ? <MindiOnlineClient matchId="test" />
  : q.includes("mindi-ai") ? <MindiGameClient mode="ai" />
  : q.includes("gin-online") ? <GinRummyOnlineClient matchId="fixture" />
  : <GinRummyGameClient mode="ai" />;

createRoot(document.getElementById("test-root")!).render(<div className="arena-app">{game}</div>);
