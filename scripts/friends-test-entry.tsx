import React from 'react';
import { createRoot } from 'react-dom/client';
import FriendsPage from '../app/(main)/friends/page';

/**
 * Friends inside the Arena shell's namespaces. The 84px inset stands in
 * for the collapsed sidebar rail, which is what the Friends board draws.
 */
createRoot(document.getElementById('test-root')!).render(
  <div className="arena-app app-shell ar-stage">
    <div aria-hidden="true" style={{ width: 84, flex: 'none' }} />
    <main className="app-shell-main"><FriendsPage /></main>
  </div>
);
