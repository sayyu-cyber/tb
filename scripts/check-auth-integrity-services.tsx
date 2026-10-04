import React from "react";

const deferred = () => {
  let resolve!: (value: any) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<any>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

export const fixture: any = {
  authRequests: [], profileRequests: [], codeRequests: [], channels: [], listeners: new Set(),
  calls: [], session: null, signUpSession: null, updateResult: null, mutationError: null,
  holdCode: false, holdLogout: false, holdUpdate: false, routes: [],
  user(id = "alpha", guest = false) {
    return { id, email: guest ? null : `${id}@example.test`, is_anonymous: guest,
      created_at: "2026-01-01T00:00:00Z", email_confirmed_at: guest ? null : "2026-01-01T00:00:00Z", user_metadata: { full_name: id } };
  },
  profile(id = "alpha", trophies = 42, code = "ABCD12") {
    return { id, display_name: `Profile ${id}`, photo_url: null, player_code: code, trophies };
  },
  emit(event: string, user: any) {
    fixture.session = user ? { user } : null;
    [...fixture.listeners].forEach((callback: any) => callback(event, fixture.session));
  },
  async mutation(name: string, args: any) {
    fixture.calls.push({ name, args });
    if (fixture.mutationError) return { data: { user: null }, error: new Error(fixture.mutationError) };
    return { data: { user: fixture.updateResult ?? fixture.session?.user, session: fixture.signUpSession }, error: null };
  },
};
(window as any).authFixture = fixture;

const client: any = {
  auth: {
    getUser() { const request = deferred(); fixture.authRequests.push(request); return request.promise; },
    getSession: async () => ({ data: { session: fixture.session }, error: null }),
    onAuthStateChange(callback: any) {
      fixture.listeners.add(callback);
      return { data: { subscription: { unsubscribe: () => fixture.listeners.delete(callback) } } };
    },
    async signOut() {
      fixture.calls.push({ name: "signOut" });
      if (fixture.holdLogout) { const request = deferred(); fixture.logoutRequest = request; return request.promise; }
      fixture.emit("SIGNED_OUT", null);
      return { error: null };
    },
    signUp: (args: any) => fixture.mutation("signUp", args),
    signInWithPassword: (args: any) => fixture.mutation("signInWithPassword", args),
    signInWithOAuth: (args: any) => fixture.mutation("signInWithOAuth", args),
    linkIdentity: (args: any) => fixture.mutation("linkIdentity", args),
    signInAnonymously: (args: any) => fixture.mutation("signInAnonymously", args),
    updateUser(args: any, options: any) {
      if (fixture.holdUpdate) {
        fixture.calls.push({ name: "updateUser", args: { ...args, options } });
        const request = deferred(); fixture.updateRequest = request; return request.promise;
      }
      return fixture.mutation("updateUser", { ...args, options });
    },
    resend: (args: any) => fixture.mutation("resend", args),
    resetPasswordForEmail: (email: string, options: any) => fixture.mutation("resetPasswordForEmail", { email, options }),
  },
  channel(name: string) {
    const channel: any = { name, active: false, callbacks: [], on(_event: string, _filter: any, callback: any) { this.callbacks.push(callback); return this; } };
    fixture.channels.push(channel);
    return channel;
  },
  from() { return { update: (args: any) => ({ eq: (key: string, id: string) => fixture.mutation("profileUpdate", { args, key, id }) }) }; },
};

export const getSupabaseBrowserClient = () => client;
export function loadProfileBundle(id: string) {
  const request = { ...deferred(), id }; fixture.profileRequests.push(request); return request.promise;
}
export function ensureProfileCode(id: string, code: string) {
  const request = { ...deferred(), id, code }; fixture.codeRequests.push(request);
  if (!fixture.holdCode) request.resolve(undefined);
  return request.promise;
}
export const nowIso = () => "2026-01-01T00:00:00Z";
export const realtimeChannelName = (name: string) => name;
export const profileToPlayerStats = (profile: any) => ({ trophies: profile.trophies });
export function subscribe(channel: any, onError: any) {
  channel.active = true; channel.fail = onError;
  return () => { channel.active = false; };
}
const router = { push: (path: string) => fixture.routes.push(path), replace: (path: string) => fixture.routes.push(path) };
export const useRouter = () => router;
export const useTranslation = () => (key: string) => key;
export default function Link({ children, ...props }: any) { return <a {...props}>{children}</a>; }
