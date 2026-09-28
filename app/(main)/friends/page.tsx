'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users, UserPlus, Search, X, Gamepad2, Ban, Clock, ChevronDown, RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useTranslation } from '@/hooks/useTranslation';
import { isOnline } from '@/lib/presence';
import { createRoom } from '@/lib/rooms';
import {
  searchPlayers, sendFriendRequest, respondToRequest, cancelOrRemove,
  watchIncomingRequests, watchOutgoingRequests, watchFriends, watchRoomInvites,
  dismissRoomInvite, sendRoomInvite, watchSocialProfiles, getFriendSuggestions, getRecentPlayers,
  type PlayerSearchResult, type RecentPlayer, type FriendRequestDoc, type Friend, type RoomInviteDoc,
} from '@/lib/friends';
import { Avatar } from '@/components/arena';
import {
  StatButton, OnlineToggle, FriendRow, RequestRow, SuggestionRow,
} from '@/components/friends/FriendsPieces';
import { PhoneFriends } from '@/components/friends/phone/PhoneFriends';

/**
 * Friends — design/arena/screens/app/app-04-friends.jpg, with the Requests
 * tab from app-04b, built on the Friends board.
 *
 * All the behaviour the screen already had is kept: live friends, incoming
 * and outgoing requests, room invites, presence, search, sort, the
 * online-only filter, the add-friend dialog with player search, and the
 * remove confirmation. What changed is the markup, which is now the
 * board's.
 *
 * The board draws Blocked as a disabled tab with a "Coming soon" tooltip,
 * which is honest: the app has no blocking from this screen (blocking is in
 * Settings > Privacy). That stays disabled rather than being given a fake
 * panel.
 *
 * Held upright a phone gets MFriends (design/arena/boards/MFriends.dc.html):
 * one column instead of two, and the row's more-menu opens the shared bottom
 * sheet rather than a dropdown that would cover the row it belongs to. Every
 * watcher, handler and dialog below is shared between the two compositions.
 */
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

  // Presence ages, so "Last seen 5m ago" does not sit there saying 5m an
  // hour later.
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
    const stops = [
      watchFriends(uid, rows => { setFriends(rows); setLoading(false); }, fail),
      watchIncomingRequests(uid, setIncoming, fail),
      watchOutgoingRequests(uid, setOutgoing, fail),
      watchRoomInvites(uid, setInvites, fail),
    ];
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
    try {
      const found = await searchPlayers(uid, searchText);
      if (version === searchVersion.current) { setResults(found); setSearched(true); }
    } catch {
      if (version === searchVersion.current) setSearchError('Search failed. Please try again.');
    } finally {
      if (version === searchVersion.current) setSearching(false);
    }
  }

  const onlineCount = friends.filter(friend => isOnline(profiles[friend.uid]?.lastSeen ?? null)).length;
  const visibleFriends = friends
    .filter(friend =>
      (profiles[friend.uid]?.displayName || friend.name).toLowerCase().includes(query.trim().toLowerCase())
      && (!onlineOnly || isOnline(profiles[friend.uid]?.lastSeen ?? null)))
    .sort((a, b) => {
      if (sort === 'online') {
        const delta = Number(isOnline(profiles[b.uid]?.lastSeen ?? null)) - Number(isOnline(profiles[a.uid]?.lastSeen ?? null));
        if (delta) return delta;
      }
      if (sort === 'recent') return (profiles[b.uid]?.lastSeen ?? 0) - (profiles[a.uid]?.lastSeen ?? 0);
      return (profiles[a.uid]?.displayName || a.name).localeCompare(profiles[b.uid]?.displayName || b.name);
    });

  const requestState = (id: string) =>
    friends.some(friend => friend.uid === id) ? 'Friends'
      : incoming.some(request => request.from === id) ? 'Respond'
      : sent.includes(id) || outgoing.some(request => request.to === id) ? 'Requested'
      : null;

  /** The board's four right-hand pill states: Add, Requested, Respond, Friends. */
  function addControl(person: PlayerSearchResult) {
    const state = requestState(person.uid);
    if (state === 'Respond') {
      return (
        <button type="button" className="minibtn blue" onClick={() => { dialog.current?.close(); setTab('requests'); }} data-flat>
          Respond<span className="sr-only"> to {person.displayName}</span>
        </button>
      );
    }
    if (state) {
      return <span className="minibtn dim">{state}</span>;
    }
    const sending = busy.includes(`add:${person.uid}`);
    return (
      <button type="button" className="minibtn lime" disabled={sending} onClick={() => add(person)} data-flat>
        {sending ? 'Sending' : 'Add'}<span className="sr-only"> {person.displayName}</span>
      </button>
    );
  }

  const availableSuggestions = suggestions.filter(person =>
    !friends.some(friend => friend.uid === person.uid) && !incoming.some(request => request.from === person.uid));

  const clearFilters = () => { setQuery(''); setOnlineOnly(false); };

  return (
    <>
    <div className="portrait-view">
      <PhoneFriends
        title={t('page_friends')}
        isGuest={isGuest}
        signInPrompt={t('friends_signInPrompt')}
        signInLabel={t('login_signIn')}
        tab={tab}
        onTab={setTab}
        friends={friends}
        visibleFriends={visibleFriends}
        incoming={incoming}
        outgoing={outgoing}
        invites={invites}
        profiles={profiles}
        suggestions={availableSuggestions}
        recent={recent}
        loading={loading}
        discoveryLoading={discoveryLoading}
        error={error}
        suggestionError={suggestionError}
        recentError={recentError}
        onRetry={() => setRetry(value => value + 1)}
        query={query}
        onQuery={setQuery}
        sort={sort}
        onSort={setSort}
        onlineOnly={onlineOnly}
        onOnlineOnly={setOnlineOnly}
        onlineCount={onlineCount}
        onClearFilters={clearFilters}
        busy={busy}
        onOpenAdd={openAdd}
        onInvite={invite}
        onRemove={friend => { setRemoving(friend); removeDialog.current?.showModal(); }}
        onAccept={request => act(request.id, () => respondToRequest(request.id, true))}
        onDecline={request => act(request.id, () => respondToRequest(request.id, false))}
        onCancel={request => act(request.id, () => cancelOrRemove(request.id))}
        onDismissInvite={item => act(item.id, () => dismissRoomInvite(item.id))}
        onScrollToInvites={() => document.getElementById('room-invites-phone')?.scrollIntoView({ block: 'center' })}
        addControl={person => addControl(person as PlayerSearchResult)}
      />
    </div>
    <div className="landscape-view">
    <div className="arena-friends ar-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="phead">
        <div>
          <span className="lbl dash" style={{ color: '#C6FF33' }}>Connect, play and make it more fun.</span>
          <h1 className="disp chrome ar-h1">{t('page_friends')}</h1>
        </div>
        <button type="button" className="ar-btn" onClick={openAdd}>
          <UserPlus aria-hidden="true" />Add Friend
        </button>
      </div>

      <div className="social-layout">
        <section style={{ display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 0 }}>
          <div className="stat-row">
            <StatButton icon={<Users />} value={friends.length} label="Friends"
              onClick={() => { setTab('friends'); setOnlineOnly(false); setQuery(''); }} />
            <StatButton icon={<UserPlus />} value={incoming.length} label="Requests" tone="b"
              onClick={() => setTab('requests')} />
            <StatButton icon={<Gamepad2 />} value={invites.length} label="Room Invites" tone="b"
              onClick={() => { setTab('requests'); document.getElementById('room-invites')?.scrollIntoView({ block: 'center' }); }} />
          </div>

          <div className="panel tick roster" style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px', minHeight: 0 }}>
            <div className="roster-toolbar">
              {/* The board writes these as plain buttons with aria-pressed,
                  not a tablist - the same pattern every other Arena screen
                  uses, and the one `.tabs button[aria-pressed]` styles. */}
              <div className="tabs" role="group" aria-label="Friends views">
                <button type="button" aria-pressed={tab === 'friends'}
                  onClick={() => setTab('friends')} data-flat>Friends</button>
                <button type="button" aria-pressed={tab === 'requests'}
                  onClick={() => setTab('requests')} data-flat>
                  Requests{incoming.length > 0 && <span className="n">{incoming.length}</span>}
                </button>
                <button type="button" disabled
                  title="Blocking is managed in Settings > Privacy" data-flat>
                  <Ban aria-hidden="true" />Blocked
                </button>
              </div>
              {tab === 'friends' && (
                <>
                  <label className="field roster-search">
                    <Search aria-hidden="true" />
                    <input value={query} onChange={event => setQuery(event.target.value)}
                      placeholder="Search by username..." aria-label="Search friends by username" />
                  </label>
                  <div className="select">
                    <select value={sort} onChange={event => setSort(event.target.value)} aria-label="Sort friends">
                      <option value="online">Online First</option>
                      <option value="name">Alphabetical</option>
                      <option value="recent">Last Seen</option>
                    </select>
                    <ChevronDown aria-hidden="true" />
                  </div>
                  <OnlineToggle checked={onlineOnly} onChange={setOnlineOnly} onlineCount={onlineCount} />
                </>
              )}
            </div>

            {error && (
              <div className="lockbar" role="alert">
                <span className="muted">{error}</span>
                <button type="button" className="link" onClick={() => setRetry(value => value + 1)} data-flat>
                  <RefreshCw aria-hidden="true" />Retry
                </button>
              </div>
            )}

            {tab === 'friends' && (
              loading ? (
                <p className="muted">Loading your friends...</p>
              ) : isGuest || friends.length === 0 ? (
                <div className="roster-empty">
                  <Users aria-hidden="true" />
                  <h2 className="disp">{isGuest ? 'Your squad starts here' : 'No friends yet'}</h2>
                  <p className="muted">
                    {isGuest ? t('friends_signInPrompt') : 'Find your friends, share a table, and make your next match a team effort.'}
                  </p>
                  <button type="button" className="ar-btn sm" onClick={openAdd}>
                    <UserPlus aria-hidden="true" />{isGuest ? t('login_signIn') : 'Add Friend'}
                  </button>
                </div>
              ) : visibleFriends.length === 0 ? (
                <div className="roster-empty">
                  <Search aria-hidden="true" />
                  <h2 className="disp">No matching friends</h2>
                  <button type="button" className="minibtn lime" onClick={() => { setQuery(''); setOnlineOnly(false); }} data-flat>
                    Clear filters
                  </button>
                </div>
              ) : (
                <div className="roster-list">
                  {visibleFriends.map(friend => (
                    <FriendRow
                      key={friend.requestId}
                      friend={friend}
                      profile={profiles[friend.uid]}
                      busy={busy.includes('invite')}
                      onInvite={game => invite(friend, game)}
                      onRemove={() => { setRemoving(friend); removeDialog.current?.showModal(); }}
                    />
                  ))}
                </div>
              )
            )}

            {tab === 'requests' && (
              <div className="roster-list">
                <span className="lbl dash">Incoming requests</span>
                {incoming.length === 0 && <p className="muted2">No pending requests.</p>}
                {incoming.map(request => (
                  <RequestRow
                    key={request.id}
                    name={request.fromName}
                    uid={request.from}
                    line="Wants to be friends"
                    busy={busy.includes(request.id)}
                    onAccept={() => act(request.id, async () => {
                      await respondToRequest(request.id, true);
                      setIncoming(rows => rows.filter(row => row.id !== request.id));
                    }, 'Friend request accepted')}
                    onDecline={() => act(request.id, async () => {
                      await respondToRequest(request.id, false);
                      setIncoming(rows => rows.filter(row => row.id !== request.id));
                    })}
                  />
                ))}

                <span className="lbl dash" style={{ marginTop: '8px' }}>Sent requests</span>
                {outgoing.length === 0 && <p className="muted2">No outgoing requests.</p>}
                {outgoing.map(request => (
                  <div className="fr" key={request.id}>
                    <Avatar name={request.toName} seed={request.to} size={42} radius={11} />
                    <div className="nm2"><b>{request.toName}</b><span className="st">Pending</span></div>
                    <button type="button" className="minibtn dim cancel" disabled={busy.includes(request.id)}
                      onClick={() => act(request.id, async () => {
                        await cancelOrRemove(request.id);
                        setOutgoing(rows => rows.filter(row => row.id !== request.id));
                      })} data-flat>
                      Cancel<span className="sr-only"> request to {request.toName}</span>
                    </button>
                  </div>
                ))}

                <span className="lbl dash" id="room-invites" style={{ marginTop: '8px' }}>Room invites</span>
                {invites.length === 0 && <p className="muted2">No room invites.</p>}
                {invites.map(item => (
                  <div className="fr invite" key={item.id}>
                    <Avatar name={item.fromName} seed={item.from} size={42} radius={11} />
                    <div className="nm2">
                      <b>{item.fromName}</b>
                      <span className="st">Invited you to {item.gameType === 'mindi' ? 'Mindi' : 'Gin Rummy'}</span>
                    </div>
                    <div className="acts">
                      <Link className="minibtn lime"
                        href={`/play/${item.gameType === 'mindi' ? 'mindi' : 'gin-rummy'}/room?code=${encodeURIComponent(item.code)}`}>
                        Join
                      </Link>
                      <button type="button" className="ibtn" aria-label="Dismiss invitation"
                        disabled={busy.includes(item.id)} onClick={() => act(item.id, () => dismissRoomInvite(item.id))}>
                        <X aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '16px' }} aria-label="Social discovery">
          <div className="panel tick b" style={{ padding: '18px' }}>
            <div className="ph" style={{ marginBottom: '6px' }}>
              <h2>Friend Suggestions</h2>
              <button type="button" className="link b" onClick={() => setShowAllSuggestions(!showAllSuggestions)} data-flat>
                {showAllSuggestions ? 'Less' : 'See All'}
              </button>
            </div>
            {discoveryLoading ? <p className="muted2">Loading players...</p>
              : suggestionError ? (
                <p className="muted2">
                  Players could not be loaded.{' '}
                  <button type="button" className="link" onClick={() => setRetry(value => value + 1)} data-flat>Retry</button>
                </p>
              )
              : availableSuggestions.length === 0 ? (
                <p className="muted2">{isGuest ? 'Sign in to discover players.' : 'No new suggestions right now.'}</p>
              )
              : availableSuggestions.slice(0, showAllSuggestions ? 20 : 5).map(person => (
                <SuggestionRow key={person.uid} person={person} action={addControl(person)} />
              ))}
          </div>

          <div className="panel" style={{ padding: '18px' }}>
            <div className="ph" style={{ marginBottom: '6px' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock aria-hidden="true" style={{ width: '18px', height: '18px', color: '#00BCC8' }} />
                Recently Played
              </h2>
              <button type="button" className="link b" onClick={() => setShowAllRecent(!showAllRecent)} data-flat>
                {showAllRecent ? 'Less' : 'See All'}
              </button>
            </div>
            {discoveryLoading ? <p className="muted2">Loading matches...</p>
              : recentError ? (
                <p className="muted2">
                  Match history is unavailable.{' '}
                  <button type="button" className="link" onClick={() => setRetry(value => value + 1)} data-flat>Retry</button>
                </p>
              )
              : recent.length === 0 ? (
                <p className="muted2">Your recent multiplayer opponents will appear here.</p>
              )
              : recent.slice(0, showAllRecent ? 15 : 3).map(person => (
                <SuggestionRow
                  key={person.uid}
                  person={person}
                  meta={(
                    <span className="muted2">
                      {person.gameType === 'mindi' ? 'Mindi' : 'Gin Rummy'} · {new Date(person.playedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  action={addControl(person)}
                />
              ))}
          </div>
        </aside>
      </div>

    </div>
    </div>
    {/* Both dialogs live outside the two view wrappers. A <dialog> inside a
        `display: none` subtree will not open, and one of the two wrappers is
        always hidden - so a copy in each would be a dialog that silently did
        nothing on one of them. `arena-friends` travels with them for the
        board's own `.dlg` rules. */}
    <div className="arena-friends">
      <dialog ref={dialog} className="dlg social-dlg"
        onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}
        onClose={() => { searchVersion.current++; setSearching(false); }}>
        <div className="ph" style={{ marginBottom: '14px' }}>
          <div>
            <h2 className="disp" style={{ margin: 0, fontSize: '26px' }}>Add Friend</h2>
            <p className="muted2" style={{ margin: '6px 0 0' }}>Search for a username or player ID</p>
          </div>
          <button type="button" className="ibtn" aria-label="Close add friend" onClick={() => dialog.current?.close()}>
            <X aria-hidden="true" />
          </button>
        </div>
        <form style={{ display: 'flex', gap: '10px' }} onSubmit={event => { event.preventDefault(); search(); }}>
          <label className="field" style={{ flexGrow: 1 }}>
            <Search aria-hidden="true" />
            <input ref={searchInput} value={searchText} maxLength={50}
              onChange={event => { searchVersion.current++; setSearching(false); setSearchText(event.target.value); setResults([]); setSearched(false); }}
              aria-label="Username or player ID" placeholder="Username or player ID" />
          </label>
          <button type="submit" className="ibtn" disabled={searching || !searchText.trim()} aria-label="Search players">
            <Search aria-hidden="true" />
          </button>
        </form>
        <div aria-live="polite" className="roster-list" style={{ marginTop: '14px' }}>
          {searching && <p className="muted2">Searching...</p>}
          {searchError && <p style={{ color: '#FF6B80', fontWeight: 600 }}>{searchError}</p>}
          {searched && results.length === 0 && (
            <p className="muted2">No players found. Check the spelling or use their player ID.</p>
          )}
          {results.map(person => (
            <SuggestionRow key={person.uid} person={person} action={addControl(person)} />
          ))}
        </div>
      </dialog>

      <dialog ref={removeDialog} className="dlg social-dlg">
        <h2 className="disp" style={{ margin: '0 0 8px', fontSize: '26px' }}>Remove friend?</h2>
        <p className="muted" style={{ margin: '0 0 22px' }}>
          {removing?.name} will be removed from your friends list.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button type="button" className="ar-btn ghost sm" onClick={() => removeDialog.current?.close()}>Cancel</button>
          <button type="button" className="ar-btn danger sm"
            disabled={!removing || busy.includes(removing.requestId)}
            onClick={() => removing && act(removing.requestId, async () => {
              await cancelOrRemove(removing.requestId);
              setFriends(rows => rows.filter(row => row.requestId !== removing.requestId));
              removeDialog.current?.close();
            }, 'Friend removed')}>
            Remove
          </button>
        </div>
      </dialog>
    </div>
    </>
  );
}
