import React from "react";
import { createRoot } from "react-dom/client";
import HomePage from "../app/(main)/home/page";

/**
 * Renders Home inside the Arena shell's two namespaces, which is what the
 * board draws: `arena-app` carries the shared pieces (panels, pills,
 * avatars, card backs) and the page itself carries `arena-home`.
 *
 * The sidebar and top bar are not rendered here. They are the shell, the
 * same on every screen, and scripts/check-shell-ui.cjs already covers them;
 * including them would make every screen's screenshot a test of the shell
 * as well. The 256px left inset stands in for the expanded sidebar so the
 * page gets the width it has on the board.
 */
createRoot(document.getElementById("test-root")!).render(
  <div className="arena-app app-shell ar-stage">
    <div aria-hidden="true" style={{ width: 256, flex: "none" }} />
    <main className="app-shell-main">
      <HomePage />
    </main>
  </div>
);
