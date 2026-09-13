"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, Plus, Search, Check, X, Gamepad2, MessageCircle, ChevronRight, SlidersHorizontal, Clock, Ban, MoreHorizontal, ArrowUpRight, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/hooks/useTranslation';
import { isOnline } from '@/lib/presence';
import { createRoom } from '@/lib/rooms';
import { searchPlayers, sendFriendRequest, respondToRequest, cancelOrRemove, watchIncomingRequests, watchOutgoingRequests, watchFriends, watchRoomInvites, dismissRoomInvite, sendRoomInvite, watchSocialProfiles, getFriendSuggestions, getRecentPlayers, type PlayerSearchResult, type RecentPlayer, type FriendRequestDoc, type Friend, type RoomInviteDoc } from '@/lib/friends';

function Avatar({ name, profile }: { name: string; profile?: PlayerSearchResult }) {
  return <span className="social-avatar">
    <span>{name.slice(0, 2).toUpperCase()}</span>
    {profile?.photoURL && <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" onError={event => { event.currentTarget.style.display = 'none'; }} />}
    {profile?.lastSeen != null && <i className={isOnline(profile.lastSeen) ? 'online' : ''} />}
  </span>;
}
function status(profile?: PlayerSearchResult) {
  if (isOnline(profile?.lastSeen ?? null)) return 'Online';
  if (!profile?.lastSeen) return 'Offline';
  const mins = Math.max(1, Math.floor((Date.now() - profile.lastSeen) / 60000));
  return `Last seen ${mins < 60 ? `${mins}m` : mins < 1440 ? `${Math.floor(mins / 60)}h` : `${Math.floor(mins / 1440)}d`} ago`;
}

export default function FriendsPage() {
  const { user, isGuest } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const t = useTranslation();
  const uid = user?.uid ?? '';
  const [tab, setTab] = useState<'friends' | 'requests'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequestDoc[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequestDoc[]>([]);
  const [invites, setInvites] = useState<RoomInviteDoc[]>([]);
  const [profiles, setProfiles] = useState<Record<string, PlayerSearchResult>>({});
  const [suggestions, setSuggestions] = useState<PlayerSearchResult[]>([]);
  const [recent, setRecent] = useState<RecentPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);
  const [error, setError] = useState('');
  const [suggestionError, setSuggestionError] = useState(false);
  const [recentError, setRecentError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('online');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [busy, setBusy] = useState<string[]>([]);
  const pending = useRef(new Set<string>());
  const [sent, setSent] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [results, setResults] = useState<PlayerSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState('');
  const searchVersion = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const removeDialog = useRef<HTMLDialogElement>(null);
  const [removing, setRemoving] = useState<Friend | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => tick(value => value + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setFriends([]); setIncoming([]); setOutgoing([]); setInvites([]); setSent([]); setProfiles({});
    setSuggestions([]); setRecent([]); setError(''); setLoading(Boolean(uid && !isGuest));
    setSuggestionError(false); setRecentError(false); setDiscoveryLoading(Boolean(uid && !isGuest));
    if (!uid || isGuest) return;
    let active = true;
    const fail = () => { if (active) { setError('Could not load your social activity.'); setLoading(false); } };
    const stops = [watchFriends(uid, rows => { setFriends(rows); setLoading(false); }, fail), watchIncomingRequests(uid, setIncoming, fail), watchOutgoingRequests(uid, setOutgoing, fail), watchRoomInvites(uid, setInvites, fail)];
    Promise.allSettled([getFriendSuggestions(uid), getRecentPlayers(uid)]).then(([people, history]) => {
      if (!active) return;
      if (people.status === 'fulfilled') setSuggestions(people.value); else setSuggestionError(true);
      if (history.status === 'fulfilled') setRecent(history.value); else setRecentError(true);
      setDiscoveryLoading(false);
    });
    const versionRef = searchVersion;
    return () => { active = false; stops.forEach(stop => stop()); versionRef.current++; };
  }, [uid, isGuest, retry]);

  const friendIds = JSON.stringify(Array.from(new Set(friends.map(friend => friend.uid))).sort());
  useEffect(() => {
    if (!uid || isGuest) return;
    return watchSocialProfiles(JSON.parse(friendIds), setProfiles, () => setError('Some presence information could not be loaded.'));
  }, [uid, isGuest, friendIds]);

  async function act(key: string, action: () => Promise<void>, success?: string) {
    if (pending.current.has(key)) return;
    pending.current.add(key); setBusy(Array.from(pending.current));
    try { await action(); if (success) showToast(success, 'success'); }
    catch { showToast('That action could not be completed. Please try again.', 'error'); }
    finally { pending.current.delete(key); setBusy(Array.from(pending.current)); }
  }
  function add(target: PlayerSearchResult) {
    return act(`add:${target.uid}`, async () => {
      await sendFriendRequest(uid, user?.displayName || 'Player', target.uid, target.displayName);
      setSent(value => [...value, target.uid]);
    }, 'Friend request sent');
  }
  function invite(friend: Friend, game: 'mindi' | 'gin_rummy') {
    return act('invite', async () => {
      const code = await createRoom(uid, user?.displayName || 'Player', game, null);
      await sendRoomInvite(uid, user?.displayName || 'Player', friend.uid, code, game);
      router.push(`/play/${game === 'mindi' ? 'mindi' : 'gin-rummy'}/room?code=${encodeURIComponent(code)}`);
    });
  }
  function openAdd() {
    if (isGuest) { router.push('/login'); return; }
    dialog.current?.showModal(); searchInput.current?.focus();
  }
  async function search() {
    if (!searchText.trim()) return;
    const version = ++searchVersion.current;
    setSearching(true); setSearched(false); setSearchError(''); setResults([]);
    try { const found = await searchPlayers(uid, searchText); if (version === searchVersion.current) { setResults(found); setSearched(true); } }
    catch { if (version === searchVersion.current) setSearchError('Search failed. Please try again.'); }
    finally { if (version === searchVersion.current) setSearching(false); }
  }
  const onlineCount = friends.filter(friend => isOnline(profiles[friend.uid]?.lastSeen ?? null)).length;
  const visibleFriends = friends.filter(friend => (profiles[friend.uid]?.displayName || friend.name).toLowerCase().includes(query.trim().toLowerCase()) && (!onlineOnly || isOnline(profiles[friend.uid]?.lastSeen ?? null))).sort((a,b) => {
    if (sort === 'online') { const delta = Number(isOnline(profiles[b.uid]?.lastSeen ?? null)) - Number(isOnline(profiles[a.uid]?.lastSeen ?? null)); if (delta) return delta; }
    if (sort === 'recent') return (profiles[b.uid]?.lastSeen ?? 0) - (profiles[a.uid]?.lastSeen ?? 0);
    return (profiles[a.uid]?.displayName || a.name).localeCompare(profiles[b.uid]?.displayName || b.name);
  });
  const requestState = (id: string) => friends.some(friend => friend.uid === id) ? 'Friends' : incoming.some(request => request.from === id) ? 'Respond' : sent.includes(id) || outgoing.some(request => request.to === id) ? 'Requested' : null;
  function addControl(person: PlayerSearchResult) {
    const state = requestState(person.uid);
    if (state === 'Respond') return <button className="social-small-button" onClick={() => { dialog.current?.close(); setTab('requests'); }}>Respond</button>;
    return <button className="social-small-button" disabled={Boolean(state) || busy.includes(`add:${person.uid}`)} onClick={() => add(person)} aria-label={`${state || 'Add'} ${person.displayName}`}>{busy.includes(`add:${person.uid}`) ? 'Sending...' : state || 'Add'}</button>;
  }
  const availableSuggestions = suggestions.filter(person => !friends.some(friend => friend.uid === person.uid) && !incoming.some(request => request.from === person.uid));

  return <div className="hub-page friends-page social-hub">
    <div className="social-layout">
      <section className="social-main">
        <header className="social-hero">
          <div className="social-title"><Users size={38} /><div><h1>{t('page_friends')}</h1><p>Connect, play and make it more fun.</p></div><Button className="social-primary" onClick={openAdd}><Plus size={18} />Add Friend</Button></div>
          <div className="social-stats">
            <button onClick={() => { setTab('friends'); setOnlineOnly(false); setQuery(''); }}><Users /><span><strong>{friends.length}</strong><small>Friends</small></span><ChevronRight /></button>
            <button onClick={() => setTab('requests')}><UserPlus /><span><strong>{incoming.length}</strong><small>Requests</small></span><ChevronRight /></button>
            <button onClick={() => { setTab('requests'); document.getElementById('social-invites')?.scrollIntoView({ block:'center' }); }}><Gamepad2 /><span><strong>{invites.length}</strong><small>Room Invites</small></span><ChevronRight /></button>
          </div>
        </header>
        <div className="social-tabs" role="tablist" aria-label="Friends views">
          <button role="tab" aria-selected={tab === 'friends'} aria-controls="social-panel" onClick={() => setTab('friends')}><Users size={18} />Friends</button>
          <button role="tab" aria-selected={tab === 'requests'} aria-controls="social-panel" onClick={() => setTab('requests')}><UserPlus size={18} />Requests{incoming.length > 0 && <b>{incoming.length}</b>}</button>
          <button role="tab" disabled aria-selected={false} title="Blocking is not available in the current app"><Ban size={18} />Blocked</button>
        </div>
        {error && <div className="social-error" role="alert">{error}<button onClick={() => setRetry(value => value + 1)}><RefreshCw size={14} />Retry</button></div>}
        <div id="social-panel" role="tabpanel" aria-label={tab}>
          {tab === 'friends' && <>
            <div className="social-filter-row"><label className="social-search"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search by username..." aria-label="Search friends by username" /></label><select aria-label="Sort friends" value={sort} onChange={event => setSort(event.target.value)}><option value="online">Online First</option><option value="name">Alphabetical</option><option value="recent">Last Seen</option></select><button className="social-icon-button" title="Filter friends" aria-label="Filter friends" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(!filtersOpen)}><SlidersHorizontal size={18}/></button></div>
            {filtersOpen && <div className="social-filter-options"><label><input type="checkbox" checked={onlineOnly} onChange={event => setOnlineOnly(event.target.checked)} />Online only</label><span>{onlineCount} online</span></div>}
            {loading ? <div className="social-skeletons" aria-label="Loading friends">{[0,1,2].map(i => <div key={i}/>)}</div> : isGuest || !friends.length ? <div className="social-empty"><div className="social-empty-art"><Users size={72}/><UserPlus size={30}/></div><h2>{isGuest ? 'Your squad starts here' : 'No Friends Yet'}</h2><p>{isGuest ? t('friends_signInPrompt') : 'Find your friends, share a table, and make your next match a team effort.'}</p><Button className="social-primary" onClick={openAdd}><Plus size={18}/>{isGuest ? t('login_signIn') : 'Add Friend'}</Button></div> : <div className="social-roster">
              {visibleFriends.map(friend => <div className="social-person" key={friend.requestId}>
                <Link className="social-person-identity" href={`/player?uid=${encodeURIComponent(friend.uid)}`}><Avatar name={friend.name} profile={profiles[friend.uid]}/><span><strong>{profiles[friend.uid]?.displayName || friend.name}</strong><small className={isOnline(profiles[friend.uid]?.lastSeen ?? null) ? 'is-online' : ''}>{status(profiles[friend.uid])}</small></span></Link>
                <div className="social-person-actions"><Link className="social-icon-button" title="Message" aria-label={`Message ${friend.name}`} href={`/messages?with=${encodeURIComponent(friend.uid)}&name=${encodeURIComponent(friend.name)}`}><MessageCircle size={17}/></Link><details className="social-menu"><summary className="social-icon-button" aria-label={`Actions for ${friend.name}`} title="Friend actions"><MoreHorizontal size={18}/></summary><div><Link href={`/player?uid=${encodeURIComponent(friend.uid)}`}>View Profile</Link><button disabled={busy.includes('invite')} onClick={() => invite(friend,'mindi')}>Invite to Mindi</button><button disabled={busy.includes('invite')} onClick={() => invite(friend,'gin_rummy')}>Invite to Gin Rummy</button><button className="social-danger" onClick={() => { setRemoving(friend); removeDialog.current?.showModal(); }}>Remove Friend</button></div></details></div>
              </div>)}
              {!visibleFriends.length && <div className="social-empty compact"><Search size={32}/><h2>No matching friends</h2><button className="social-small-button" onClick={() => { setQuery(''); setOnlineOnly(false); }}>Clear filters</button></div>}
            </div>}
          </>}
          {tab === 'requests' && <div className="social-request-list">
            <h2>Incoming requests</h2>{!incoming.length && <p>No pending requests.</p>}
            {incoming.map(request => <div className="social-person" key={request.id}><div className="social-person-identity"><Avatar name={request.fromName}/><strong>{request.fromName}</strong></div><div className="social-person-actions"><button className="social-icon-button" disabled={busy.includes(request.id)} title="Accept" aria-label={`Accept ${request.fromName}`} onClick={() => act(request.id,async () => { await respondToRequest(request.id,true); setIncoming(rows => rows.filter(row => row.id !== request.id)); },'Friend request accepted')}><Check size={18}/></button><button className="social-icon-button" disabled={busy.includes(request.id)} title="Decline" aria-label={`Decline ${request.fromName}`} onClick={() => act(request.id,async () => { await respondToRequest(request.id,false); setIncoming(rows => rows.filter(row => row.id !== request.id)); })}><X size={18}/></button></div></div>)}
            <h2>Sent requests</h2>{!outgoing.length && <p>No outgoing requests.</p>}{outgoing.map(request => <div className="social-person" key={request.id}><span>{request.toName}</span><button className="social-small-button" disabled={busy.includes(request.id)} onClick={() => act(request.id,async () => { await cancelOrRemove(request.id); setOutgoing(rows => rows.filter(row => row.id !== request.id)); })}>Cancel</button></div>)}
            <h2 id="social-invites">Room invites</h2>{!invites.length && <p>No room invites.</p>}{invites.map(item => <div className="social-person" key={item.id}><span><strong>{item.fromName}</strong><small>{item.gameType === 'mindi' ? 'Mindi' : 'Gin Rummy'}</small></span><div className="social-person-actions"><Link className="social-small-button" href={`/play/${item.gameType === 'mindi' ? 'mindi' : 'gin-rummy'}/room?code=${encodeURIComponent(item.code)}`}>Join</Link><button className="social-icon-button" disabled={busy.includes(item.id)} aria-label="Dismiss invitation" title="Dismiss invitation" onClick={() => act(item.id,() => dismissRoomInvite(item.id))}><X size={16}/></button></div></div>)}
          </div>}
        </div>
      </section>
      <aside className="social-discovery" aria-label="Social discovery">
        <section><header><h2><Users size={19}/>Friend Suggestions</h2><button onClick={() => setShowAllSuggestions(!showAllSuggestions)}>{showAllSuggestions ? 'Less' : 'See All'}<ArrowUpRight size={13}/></button></header>
          {discoveryLoading ? <p>Loading players...</p> : suggestionError ? <p>Players could not be loaded. <button onClick={() => setRetry(value => value + 1)}>Retry</button></p> : !availableSuggestions.length ? <p>{isGuest ? 'Sign in to discover players.' : 'No new suggestions right now.'}</p> : availableSuggestions.slice(0,showAllSuggestions ? 20 : 5).map(person => <div className="social-person" key={person.uid}><Link className="social-person-identity" href={`/player?uid=${encodeURIComponent(person.uid)}`}><Avatar name={person.displayName} profile={person}/><span><strong>{person.displayName}</strong><small>{status(person)}</small></span></Link>{addControl(person)}</div>)}
        </section>
        <section><header><h2><Clock size={19}/>Recently Played With</h2><button onClick={() => setShowAllRecent(!showAllRecent)}>{showAllRecent ? 'Less' : 'See All'}<ArrowUpRight size={13}/></button></header>
          {discoveryLoading ? <p>Loading matches...</p> : recentError ? <p>Match history is unavailable. <button onClick={() => setRetry(value => value + 1)}>Retry</button></p> : !recent.length ? <p>Your recent multiplayer opponents will appear here.</p> : recent.slice(0,showAllRecent ? 15 : 3).map(person => <div className="social-person" key={person.uid}><Link className="social-person-identity" href={`/player?uid=${encodeURIComponent(person.uid)}`}><Avatar name={person.displayName} profile={person}/><span><strong>{person.displayName}</strong><small>{person.gameType === 'mindi' ? 'Mindi' : 'Gin Rummy'} · {new Date(person.playedAt).toLocaleDateString()}</small></span></Link>{addControl(person)}</div>)}
        </section>
      </aside>
    </div>
    <dialog ref={dialog} className="social-dialog" onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }} onClose={() => { searchVersion.current++; setSearching(false); }}>
      <header><div><h2>Add Friend</h2><p>Search for a username or player ID</p></div><button className="social-icon-button" aria-label="Close add friend" onClick={() => dialog.current?.close()}><X size={18}/></button></header>
      <form className="social-filter-row" onSubmit={event => { event.preventDefault(); search(); }}><label className="social-search"><Search size={16}/><input ref={searchInput} value={searchText} onChange={event => { searchVersion.current++; setSearching(false); setSearchText(event.target.value); setResults([]); setSearched(false); }} maxLength={50} aria-label="Username or player ID" placeholder="Username or player ID" /></label><button className="social-icon-button" type="submit" disabled={searching || !searchText.trim()} aria-label="Search players"><Search size={18}/></button></form>
      <div aria-live="polite">{searching && <p>Searching...</p>}{searchError && <p className="social-danger">{searchError}</p>}{searched && !results.length && <p>No players found. Check the spelling or use their player ID.</p>}{results.map(person => <div className="social-person" key={person.uid}><div className="social-person-identity"><Avatar name={person.displayName}/><span><strong>{person.displayName}</strong><small>{person.trophies} trophies</small></span></div>{addControl(person)}</div>)}</div>
    </dialog>
    <dialog ref={removeDialog} className="social-dialog"><header><h2>Remove friend?</h2><button className="social-icon-button" aria-label="Close" onClick={() => removeDialog.current?.close()}><X size={18}/></button></header><p>{removing?.name}</p><div className="social-confirm"><Button variant="secondary" onClick={() => removeDialog.current?.close()}>Cancel</Button><Button variant="danger" disabled={!removing || busy.includes(removing.requestId)} onClick={() => removing && act(removing.requestId,async () => { await cancelOrRemove(removing.requestId); setFriends(rows => rows.filter(row => row.requestId !== removing.requestId)); removeDialog.current?.close(); },'Friend removed')}>Remove</Button></div></dialog>
  </div>;
}
