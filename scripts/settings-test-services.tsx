// Isolated component-test services. Never imported by application code.
import React, { useState } from 'react';

/**
 * Stand-ins for what Settings reads.
 *
 * The state is the Settings board's own: English, music on, notifications
 * and sound effects off and unavailable, signed in as Sayyu at Gold, and
 * nobody blocked.
 *
 * Query flags: ?guest, ?admin, ?dv (Dhivehi selected), ?blocked,
 * ?savefail.
 */
const flag = (name: string) => new URLSearchParams(location.search).has(name);

export function useSettings() {
  const [settings, setSettings] = useState({ music: true, language: flag('dv') ? 'dv' : 'en', notifications: false, sound: false });
  return {
    settings,
    updateSettings: (change: any) => {
      if (flag('savefail')) throw new Error('storage full');
      setSettings(current => ({ ...current, ...change }));
      document.body.dataset.saved = JSON.stringify(change);
    },
  };
}

export const useAuth = () => ({
  user: { uid: 'test-self', displayName: 'Sayyu', email: flag('admin') ? 'admin@thaasbai.mv' : 'sayyu@gmail.com' },
  isGuest: flag('guest'),
  playerStats: { trophies: 58, currentRank: 'Gold' },
});
export const useToast = () => ({ showToast: (message: string) => { document.body.dataset.toast = message; } });
export const useTranslation = () => (key: string) => ({
  settings_title: 'Settings',
  settings_notifications: 'Notifications',
  settings_sound: 'Sound Effects',
  settings_music: 'Background Music',
  settings_language: 'Language',
}[key] || key);
export const isAdminEmail = (email?: string) => email === 'admin@thaasbai.mv';
export const LANGUAGE_NAMES = { en: 'English', dv: 'ދިވެހި', hi: 'हिन्दी', bn: 'বাংলা' };
export const getRankFromTrophies = (trophies: number) =>
  trophies >= 75 ? 'Platinum' : trophies >= 50 ? 'Gold' : trophies >= 25 ? 'Silver' : 'Bronze';
export const RANKS = {
  BRONZE: { name: 'Bronze', min: 0 }, SILVER: { name: 'Silver', min: 25 },
  GOLD: { name: 'Gold', min: 50 }, PLATINUM: { name: 'Platinum', min: 75 },
};
export const TROPHY_WIN = 5;
export const TROPHY_LOSS = -2;
export function BlockedPlayers({ phone = false }: { phone?: boolean }) {
  const text = flag('blocked')
    ? '1 blocked player.'
    : "You haven't blocked anyone. You can block a player from their profile.";
  // Held upright the note is boxed inside the row's text column.
  return phone
    ? <span style={{ marginTop: 8, padding: '11px 12px', borderRadius: 10, background: 'rgba(255,255,255,.03)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.08)', color: '#BEBECA' }}>{text}</span>
    : <p className="muted2">{text}</p>;
}
export function LogoutBar({ phone = false }: { phone?: boolean }) {
  if (phone) {
    return (
      <button type="button" className="ar-btn ghost sm" style={{ marginLeft: 'auto', height: 42, color: '#FF6B80' }}>
        Log Out
      </button>
    );
  }
  return (
    <div className="panel set-logout">
      <b className="disp chrome">Thaasbai</b>
      <span className="lbl">v1.0.0</span>
      <button type="button" className="ar-btn danger sm">Log Out</button>
    </div>
  );
}
export default function Link({ href, children, ...props }: any) { return <a href={href} {...props}>{children}</a>; }
