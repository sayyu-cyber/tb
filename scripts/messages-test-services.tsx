// Isolated component-test services. Never imported by application code.
import React from 'react';

/**
 * Stand-ins for what Messages reads.
 *
 * The threads are the Messages board's own
 * (design/arena/boards/Messages.dc.html): five conversations with Mariyam
 * open, Hussain unread, and the six-message exchange the board draws.
 *
 * Query flags: ?empty (no conversations), ?failure, ?guest.
 */
const flag = (name: string) => new URLSearchParams(location.search).has(name);
const now = Date.now();
const day = 86_400_000;

const ME = 'test-self';
const CONVERSATIONS = [
  { id: 'c-mariyam', participants: [ME, 'mariyam'], participantNames: { mariyam: 'Mariyam' }, lastMessage: 'Sending the invite now', lastMessageAt: now - 60_000, lastSenderUid: ME, lastReadAt: { [ME]: now } },
  { id: 'c-hussain', participants: [ME, 'hussain'], participantNames: { hussain: 'Hussain' }, lastMessage: 'gg, rematch at Gin?', lastMessageAt: now - 120_000, lastSenderUid: 'hussain', lastReadAt: { [ME]: now - 600_000 } },
  { id: 'c-ibrahim', participants: [ME, 'ibrahim'], participantNames: { ibrahim: 'Ibrahim' }, lastMessage: 'See you Sunday for ranked', lastMessageAt: now - day, lastSenderUid: ME, lastReadAt: { [ME]: now } },
  { id: 'c-shifa', participants: [ME, 'shifa'], participantNames: { shifa: 'Shifa' }, lastMessage: 'Thanks for the invite!', lastMessageAt: now - 2 * day, lastSenderUid: 'shifa', lastReadAt: { [ME]: now } },
  { id: 'c-aishath', participants: [ME, 'aishath'], participantNames: { aishath: 'Aishath' }, lastMessage: '', lastMessageAt: 0, lastSenderUid: '', lastReadAt: { [ME]: now } },
];

/** The board's exchange with Mariyam, them-first and alternating. */
const THREAD = [
  { id: 'm1', senderUid: 'mariyam', text: 'Weekend League is live. Mindi tonight?', createdAt: now - 360_000 },
  { id: 'm2', senderUid: ME, text: 'Yes! Give me ten minutes.', createdAt: now - 300_000 },
  { id: 'm3', senderUid: 'mariyam', text: 'Nice call on trump last game.', createdAt: now - 240_000 },
  { id: 'm4', senderUid: ME, text: 'That Ten of spades rescue was lucky.', createdAt: now - 180_000 },
  { id: 'm5', senderUid: 'mariyam', text: 'Lucky or not, we took three Tens.', createdAt: now - 120_000 },
  { id: 'm6', senderUid: ME, text: 'Sending the invite now', createdAt: now - 60_000 },
];

export const useAuth = () => ({ user: { uid: ME, displayName: 'Sayyu' }, isGuest: flag('guest') });
export const useToast = () => ({ showToast: (message: string) => { document.body.dataset.toast = message; } });
export const useRouter = () => ({
  push: (url: string) => { document.body.dataset.destination = url; },
  replace: (url: string) => { document.body.dataset.opened = url; history.replaceState(null, '', url); },
});
export const useSearchParams = () => new URLSearchParams(location.search);
export const useTranslation = () => (key: string) => ({
  page_messages: 'Messages',
  messages_placeholder: 'Message…',
  messages_youPrefix: 'You: ',
  messages_noMessagesYet: 'No messages yet',
  messages_noConversationsYet: 'No conversations yet',
  messages_loadError: 'Conversations could not be loaded.',
  messages_signInPrompt: 'Sign in to message your friends.',
  login_signIn: 'Sign In',
  messages_sayHelloTo: 'Say hello to {name}',
  error_tryAgain: 'Try again',
  a11y_sendMessage: 'Send message',
  a11y_goBack: 'Go back',
}[key] || key);

export const isOnline = (time: number) => Boolean(time) && Date.now() - time < 90_000;
export const useHomeSocial = () => ({
  friends: [], chats: [], online: [], loading: false, error: false, retry: () => {},
  profiles: {
    mariyam: { uid: 'mariyam', displayName: 'Mariyam', trophies: 58, lastSeen: now - 5_000 },
    hussain: { uid: 'hussain', displayName: 'Hussain', trophies: 31, lastSeen: now - 5_000 },
  },
});

export const watchConversations = (_uid: string, callback: any, error: any) => {
  const timer = setTimeout(() => flag('failure') ? error(new Error('test')) : callback(flag('empty') ? [] : CONVERSATIONS), 30);
  return () => clearTimeout(timer);
};
export const ensureConversation = async (_a: string, _b: string, other: string) => `c-${other}`;
export const watchMessages = (id: string, callback: any) => {
  const timer = setTimeout(() => callback(id === 'c-mariyam' ? THREAD : []), 30);
  return () => clearTimeout(timer);
};
export const sendMessage = async (_id: string, _uid: string, text: string) => { document.body.dataset.said = text; };
export const markConversationRead = async () => {};
export const conversationIdFor = (a: string, b: string) => [a, b].sort().join('_');
export const createRoom = async () => 'TEST01';
export const sendRoomInvite = async () => { document.body.dataset.invited = 'yes'; };

export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a href={href} {...props}>{children}</a>;
}
