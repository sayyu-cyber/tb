import React from 'react';
import { createRoot } from 'react-dom/client';
import HallOfFamePage from '../app/hall-of-fame/page';

/** Hall of Fame inside the Arena shell, with the board's 84px rail inset. */
createRoot(document.getElementById('test-root')!).render(
  <div className="arena-app app-shell ar-stage">
    <div aria-hidden="true" style={{ width: 84, flex: 'none' }} />
    <main className="app-shell-main"><HallOfFamePage /></main>
  </div>
);
