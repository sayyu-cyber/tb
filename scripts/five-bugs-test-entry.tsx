import React from 'react';
import { createRoot } from 'react-dom/client';
import { EconomyProvider, useEconomy } from '@/contexts/EconomyContext';
import CoinBalance from '@/components/economy/CoinBalance';
import DailyLoginCalendar from '@/components/rewards/DailyLoginCalendar';
import { AdminPanelClient } from '@/components/admin/AdminPanelClient';
import ProfilePage from '../app/(main)/profile/page';
import { fixture } from './five-bugs-test-services';
function Probe() {
  const economy = useEconomy(); fixture.economy = economy;
  return <><div id="chip"><CoinBalance /></div>{location.search.includes('profile') ? <ProfilePage /> : <><AdminPanelClient /><DailyLoginCalendar /></>}</>;
}
// Reproduce an obsolete persisted balance while all other cached fields merge
// with production defaults. The first visible balance must come from RPC.
localStorage.setItem('thaasbai-economy-state:viewer', JSON.stringify({ economy: { coins: 67603, schemaVersion: 2 } }));
createRoot(document.getElementById('test-root')!).render(<EconomyProvider><Probe /></EconomyProvider>);
