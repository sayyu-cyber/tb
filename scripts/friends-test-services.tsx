// Isolated component-test services. Never imported by application code.
import React from 'react';

/**
 * Stand-ins for what Friends reads.
 *
 * ?populated gives the Friends board's own roster
 * (design/arena/boards/Friends.dc.html): twelve friends of whom five are
 * online, two incoming requests, one sent, one room invite, and the five
 * suggestions with their ranks. Without it the screen is empty, which is
 * the other state worth checking.
 *
 * ?failure makes every watcher error, ?guest signs out.
 */
const flag = (name: string) => new URLSearchParams(location.search).has(name);
const populated = flag('populated');
const failure = flag('failure');

const now = Date.now();
const online = now - 10_000;
const person = (uid: string, displayName: string, trophies = 12, lastSeen = online) =>
  ({ uid, displayName, trophies, lastSeen });

/** The board's roster: five online, then four with a last-seen time. */
const NAMES = ['Mariyam', 'Ibrahim', 'Aishath', 'Hussain', 'Fathimath', 'Shifa', 'Ahmed', 'Nazim', 'Rifaa', 'Sana', 'Latheef', 'Adam'];
const FRIENDS = NAMES.map((name, index) => ({
  uid: `friend-${index}`,
  name,
  requestId: `req-${index}`,
}));
const PROFILES = Object.fromEntries(FRIENDS.map((friend, index) => [
  friend.uid,
  person(friend.uid, friend.name, 20 + index, index < 5 ? online : now - (index * 30 + 5) * 60_000),
]));

export const useAuth = () => ({ user: { uid: 'test-self', displayName: 'Sayyu' }, isGuest: flag('guest') });
export const useToast = () => ({ showToast: (message: string) => { document.body.dataset.toast = message; } });
export const useRouter = () => ({ push: (url: string) => { document.body.dataset.destination = url; } });
export const useTranslation = () => (key: string) => ({
  page_friends: 'Friends',
  login_signIn: 'Sign in',
  friends_signInPrompt: 'Sign in to add friends and play together.',
}[key] || key);
export default function Link({ href, children, ...props }: any) { return <a href={href} {...props}>{children}</a>; }
export const isOnline = (time: number) => Boolean(time) && Date.now() - time < 90_000;

const watch = (value: any) => (_uid: any, callback: any, error: any) => {
  const timer = setTimeout(() => failure ? error(new Error('test')) : callback(value), 30);
  return () => clearTimeout(timer);
};

export const watchFriends = watch(populated ? FRIENDS : []);
export const watchIncomingRequests = watch(populated
  ? [{ id: 'req-in-1', from: 'nashid', fromName: 'Nashid' }, { id: 'req-in-2', from: 'hawwa', fromName: 'Hawwa' }]
  : []);
export const watchOutgoingRequests = watch(populated ? [{ id: 'req-out-1', to: 'yoosuf', toName: 'Yoosuf' }] : []);
export const watchRoomInvites = watch(populated
  ? [{ id: 'inv-1', from: 'friend-1', fromName: 'Ibrahim', code: 'TEST01', gameType: 'mindi' }]
  : []);
export const watchSocialProfiles = (_ids: any, callback: any) => { callback(PROFILES); return () => {}; };

/** The board's five suggestions, with the ranks it draws. */
export const getFriendSuggestions = async () => [
  person('aminath', 'Aminath', 31),
  person('moosa', 'Moosa', 52),
  person('zaha', 'Zaha', 12),
  person('yoosuf', 'Yoosuf', 44),
  person('nashid', 'Nashid', 83),
];
export const getRecentPlayers = async () => [
  { ...person('rasheed', 'Rasheed', 18), playedAt: now - 3_600_000, gameType: 'mindi' },
  { ...person('ismail', 'Ismail', 26), playedAt: now - 7_200_000, gameType: 'gin_rummy' },
  { ...person('friend-6', 'Ahmed', 40), playedAt: now - 90_000_000, gameType: 'mindi' },
];
export const searchPlayers = async (_uid: string, query: string) => {
  if (query === 'error') throw Error('test');
  return query === 'none' ? [] : [person('result-one', 'ZxNova', 7)];
};
export const sendFriendRequest = async () => { document.body.dataset.sent = 'yes'; };
export const respondToRequest = async (_id: string, accepted: boolean) => { document.body.dataset.accepted = String(accepted); };
export const cancelOrRemove = async () => { document.body.dataset.removed = 'yes'; };
export const dismissRoomInvite = async () => { document.body.dataset.dismissed = 'yes'; };
export const sendRoomInvite = async () => {};
export const createRoom = async () => 'TEST01';
