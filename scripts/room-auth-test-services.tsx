import React, { useSyncExternalStore } from 'react';
const listeners = new Set<() => void>();
const fixture: any = { user: null, path: location.pathname, destinations: [] };
(window as any).roomAuthFixture = fixture;
const notify = () => listeners.forEach(fn => fn());
const subscribe = (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; };
const router = {
  push(url: string) { fixture.destinations.push(url); history.replaceState({}, '', url); fixture.path = location.pathname; notify(); },
  replace(url: string) { this.push(url); },
};
fixture.signIn = (oauth = false) => {
  fixture.user = { uid: 'fixture', displayName: 'Fixture', isGuest: false };
  if (oauth) { history.replaceState({}, '', '/home'); fixture.path = '/home'; }
  notify();
};
export function useAuth() {
  useSyncExternalStore(subscribe, () => fixture.user);
  return { user: fixture.user, loading: false, isGuest: false, signInWithEmail: fixture.signIn, signInWithGoogle: fixture.signIn, signUpWithEmail: fixture.signIn, signInAsGuest: () => {} };
}
export function usePathname() { return useSyncExternalStore(subscribe, () => fixture.path); }
export function useRouter() { return router; }
export const useTranslation = () => (key: string) => key;
export default function Link({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) { return <a href={href} {...props}>{children}</a>; }
