"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { watchFriends, watchSocialProfiles, type Friend, type PlayerSearchResult } from "@/lib/friends";
import { watchConversations, type DmConversation } from "@/lib/messages";
import { isOnline } from "@/lib/presence";

interface SocialState {
  friends: Friend[]; profiles: Record<string, PlayerSearchResult>; chats: DmConversation[];
  online: Friend[]; loading: boolean; error: boolean; retry: () => void;
}
const HomeSocial = createContext<SocialState>({ friends: [], profiles: {}, chats: [], online: [], loading: false, error: false, retry: () => {} });
export const useHomeSocial = () => useContext(HomeSocial);

export function HomeSocialProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  const { user, isGuest } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PlayerSearchResult>>({});
  const [chats, setChats] = useState<DmConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [, tick] = useState(0);
  useEffect(() => {
    setFriends([]); setProfiles({}); setChats([]); setError(false);
    if (!enabled || !user || isGuest) { setLoading(false); return; }
    setLoading(true);
    let stopProfiles = () => {};
    let friendsReady = false, chatsReady = false;
    const ready = () => setLoading(!(friendsReady && chatsReady));
    const failed = () => { setError(true); setLoading(false); };
    const stopFriends = watchFriends(user.uid, items => {
      setFriends(items); stopProfiles();
      stopProfiles = watchSocialProfiles(items.map(item => item.uid), values => {
        setProfiles(values); friendsReady = true; ready();
      }, failed);
    }, failed);
    const stopChats = watchConversations(user.uid, items => {
      setChats(items.filter(item => item.lastMessageAt > 0)); chatsReady = true; ready();
    }, failed);
    const timer = setInterval(() => tick(value => value + 1), 30000);
    return () => { stopFriends(); stopProfiles(); stopChats(); clearInterval(timer); };
  }, [enabled, user?.uid, isGuest, attempt]);
  const online = friends.filter(friend => isOnline(profiles[friend.uid]?.lastSeen ?? null));
  return <HomeSocial.Provider value={{ friends, profiles, chats, online, loading, error, retry: () => setAttempt(value => value + 1) }}>{children}</HomeSocial.Provider>;
}
