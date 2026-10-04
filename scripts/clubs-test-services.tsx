// Isolated component-test services. Never imported by application code.
import React from 'react';

/**
 * Stand-ins for what Clubs reads.
 *
 * The clubs are the Clubs board's own (design/arena/boards/Clubs.dc.html):
 * four suggested clubs at 17, 9, 30 and 4 of 30 members, and "Male' Mindi
 * Masters" at 24 of 30 as my club, owned by me.
 *
 * The member fixture is what code issue 10 is about. `memberTrophies` on
 * the club document is deliberately stale - every member is recorded at the
 * figure they joined with - while the player documents carry the real,
 * current numbers. The screen must show the live ones.
 *
 * Query flags: ?none (no club), ?member (in a club I do not own),
 * ?guest, ?failure.
 */
const flag = (name: string) => new URLSearchParams(location.search).has(name);
const ME = 'test-self';

const MEMBERS = [
  { uid: 'rasheed', name: 'Rasheed', live: 71, stale: 4 },
  { uid: 'aishath', name: 'Aishath', live: 66, stale: 9 },
  { uid: ME, name: 'Sayyu', live: 58, stale: 12 },
  { uid: 'mariyam', name: 'Mariyam', live: 55, stale: 2 },
  { uid: 'ibrahim', name: 'Ibrahim', live: 49, stale: 30 },
  { uid: 'hussain', name: 'Hussain', live: 42, stale: 7 },
];

const MY_CLUB = {
  id: 'mle',
  name: "Male' Mindi Masters",
  tag: 'MLE',
  description: 'The house club.',
  ownerUid: flag('member') ? 'rasheed' : ME,
  members: MEMBERS.map(m => m.uid),
  memberNames: Object.fromEntries(MEMBERS.map(m => [m.uid, m.name])),
  // Stale on purpose - see the note above.
  memberTrophies: Object.fromEntries(MEMBERS.map(m => [m.uid, m.stale])),
  createdAt: 0,
};

const SUGGESTED = [
  { id: 'hlm', name: "Hulhumale' Aces", tag: 'HLM', description: 'Evening Mindi, all ranks welcome. Say hi in club chat before you join a table.', ownerUid: 'x', members: Array.from({ length: 17 }, (_, i) => 'h' + i), memberNames: {}, memberTrophies: {}, createdAt: 0 },
  { id: 'gin', name: 'Gin Night', tag: 'GIN', description: "Gin Rummy players only. We practise 4 · 3 · 3 until it's automatic.", ownerUid: 'x', members: Array.from({ length: 9 }, (_, i) => 'g' + i), memberNames: {}, memberTrophies: {}, createdAt: 0 },
  { id: 'adu', name: 'Addu Tens', tag: 'ADU', description: 'Weekend League every Friday. Silver and up.', ownerUid: 'x', members: Array.from({ length: 30 }, (_, i) => 'a' + i), memberNames: {}, memberTrophies: {}, createdAt: 0 },
  { id: 'fvm', name: 'Fuvahmulah Club', tag: 'FVM', description: 'A Thaasbai card-game community.', ownerUid: 'x', members: Array.from({ length: 4 }, (_, i) => 'f' + i), memberNames: {}, memberTrophies: {}, createdAt: 0 },
];

export const MAX_MEMBERS = 30;
export const useAuth = () => ({
  user: { uid: ME, displayName: 'Sayyu' },
  isGuest: flag('guest'),
  playerStats: { trophies: 58 },
});
export const useToast = () => ({ showToast: (message: string) => { document.body.dataset.toast = message; } });
export const useTranslation = () => (key: string) => key;
export default function Link({ href, children, ...props }: any) { return <a href={href} {...props}>{children}</a>; }

export const watchMyClub = (_uid: string, callback: any, error: any) => {
  const timer = setTimeout(() => flag('failure') ? error(new Error('test')) : callback(flag('none') ? null : MY_CLUB), 30);
  return () => clearTimeout(timer);
};
export const watchClubList = (callback: any, error: any) => {
  const timer = setTimeout(() => flag('failure') ? error(new Error('test')) : callback(SUGGESTED), 30);
  return () => clearTimeout(timer);
};
export const watchClub = (_id: string, callback: any) => { callback(MY_CLUB); return () => {}; };
export const joinClub = async (id: string) => { document.body.dataset.joined = id; };
export const leaveClub = async () => { document.body.dataset.left = 'yes'; };
export const kickMember = async (_c: string, _o: string, uid: string) => { document.body.dataset.kicked = uid; };
export const sendClubMessage = async (_c: string, _u: string, _n: string, text: string) => { document.body.dataset.said = text; };
const CHAT_MESSAGES = [
    { id: 'm1', senderUid: 'rasheed', senderName: 'Rasheed', text: "Weekend League is open. Who's in?", createdAt: 1 },
    { id: 'm2', senderUid: 'aishath', senderName: 'Aishath', text: 'Me! Mindi with Mariyam and Ibrahim.', createdAt: 2 },
    { id: 'm3', senderUid: ME, senderName: 'Sayyu', text: 'Count me in after dinner.', createdAt: 3 },
    { id: 'm4', senderUid: 'mariyam', senderName: 'Mariyam', text: 'Bring your luck with the Tens.', createdAt: 4 },
  ];
export const loadClubMessagesPage = async () => ({ messages: CHAT_MESSAGES, nextCursor: null });
export const loadMessagesPage = async () => ({ messages: [], nextCursor: null });
export const ensureConversation = async () => 'fixture-dm';
export function watchSocialSnapshot<T>(_key: string, _tables: unknown[], load: () => Promise<T>, callback: (value: T) => void, error?: (error: Error) => void) {
  let active = true;
  const timer = setTimeout(() => {
    void load().then(value => { if (active) callback(value); }, err => { if (active) error?.(err); });
  }, 30);
  return () => { active = false; clearTimeout(timer); };
}
export const watchClubMessages = (_id: string, callback: any) => {
  const timer = setTimeout(() => callback(CHAT_MESSAGES), 30);
  return () => clearTimeout(timer);
};
export const getClub = async () => MY_CLUB;
export const createClub = async () => 'new';

/** The live player documents - the real trophy figures. */
export const watchSocialProfiles = (uids: string[], callback: any) => {
  callback(Object.fromEntries(MEMBERS
    .filter(m => uids.includes(m.uid))
    .map(m => [m.uid, { uid: m.uid, displayName: m.name, trophies: m.live, lastSeen: Date.now() }])));
  return () => {};
};
