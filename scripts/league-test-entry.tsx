import React from 'react';
import { createRoot } from 'react-dom/client';
import TournamentPage from '../app/tournament/page';

/** Weekend League inside the Arena shell, with the board's 84px rail inset. */
createRoot(document.getElementById('test-root')!).render(
  <div className="arena-app app-shell ar-stage">
    <div aria-hidden="true" style={{ width: 84, flex: 'none' }} />
    <main className="app-shell-main"><TournamentPage /></main>
  </div>
);
