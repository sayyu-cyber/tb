"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Users, UserPlus, Gamepad2, Ban, Clock, Search, ChevronDown, RefreshCw, X } from "lucide-react";
import type { Friend, FriendRequestDoc, PlayerSearchResult, RecentPlayer, RoomInviteDoc } from "@/lib/friends";
import { Avatar } from "@/components/arena";
import { StatButton, OnlineToggle, RequestRow, SuggestionRow } from "../FriendsPieces";
import { PhoneFriendRow } from "./PhoneFriendRow";

/**
 * Friends on a phone held upright — design/arena/boards/MFriends.dc.html,
 * design/arena/screens/phone/phone-04-friends.jpg, phone-04b-friends-requests.jpg
 * and phone-04c-friend-actions.jpg.
 *
 * The wide screen's two columns become one: Add moves up beside the title as
 * a small button, the three stat buttons become a 3x1 grid, the roster
 * toolbar stacks the search over the sort and the online-only switch, and
 * Friend Suggestions and Recently Played follow the roster instead of
 * sitting beside it. Blocked stays a disabled tab, because the app still has
 * no blocking from this screen.
 *
 * The one behavioural difference is the row's third button: a dropdown
 * anchored to a 390px row would cover the row it belongs to, so it opens the
 * shared bottom sheet instead (PhoneFriendRow). Every other control is the
 * wide screen's own piece, so search, sort, presence, accept, decline,
 * cancel, join and dismiss are one implementation.
 */

export interface PhoneFriendsProps {
  title: string;
  isGuest: boolean;
  signInPrompt: string;
  signInLabel: string;

  tab: "friends" | "requests";
  onTab: (next: "friends" | "requests") => void;

  friends: Friend[];
  visibleFriends: Friend[];
  incoming: FriendRequestDoc[];
  outgoing: FriendRequestDoc[];
  invites: RoomInviteDoc[];
  profiles: Record<string, PlayerSearchResult>;
  suggestions: PlayerSearchResult[];
  recent: RecentPlayer[];

  loading: boolean;
  discoveryLoading: boolean;
  error: string;
  suggestionError: boolean;
  recentError: boolean;
  onRetry: () => void;

  query: string;
  onQuery: (next: string) => void;
  sort: string;
  onSort: (next: string) => void;
  onlineOnly: boolean;
  onOnlineOnly: (next: boolean) => void;
  onlineCount: number;
  onClearFilters: () => void;

  busy: string[];
  onOpenAdd: () => void;
  onInvite: (friend: Friend, game: "mindi" | "gin_rummy") => void;
  onRemove: (friend: Friend) => void;
  onAccept: (request: FriendRequestDoc) => void;
  onDecline: (request: FriendRequestDoc) => void;
  onCancel: (request: FriendRequestDoc) => void;
  onDismissInvite: (invite: RoomInviteDoc) => void;
  onScrollToInvites: () => void;
  /** The board's four right-hand pill states: Add, Requested, Respond, Friends. */
  addControl: (person: { uid: string; displayName: string }) => ReactNode;
}

export function PhoneFriends(p: PhoneFriendsProps) {
  return (
    <div className="arena-phone arena-mfriends mpage">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12 }}>
        <div className="mh">
          <span className="lbl dash" style={{ color: "#C6FF33" }}>Connect and play</span>
          <h1 className="disp chrome">{p.title}</h1>
        </div>
        <button type="button" className="ar-btn sm" style={{ marginBottom: 2 }} onClick={p.onOpenAdd} data-flat>
          <UserPlus aria-hidden="true" />Add
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
        <StatButton icon={<Users />} value={p.friends.length} label="Friends"
          onClick={() => { p.onTab("friends"); p.onClearFilters(); }} />
        <StatButton icon={<UserPlus />} value={p.incoming.length} label="Requests" tone="b"
          onClick={() => p.onTab("requests")} />
        <StatButton icon={<Gamepad2 />} value={p.invites.length} label="Room Invites" tone="b"
          onClick={() => { p.onTab("requests"); p.onScrollToInvites(); }} />
      </div>

      <section className="panel tick" aria-label="Roster" style={{ padding: 14, display: "flex", flexDirection: "column", gap: 12 }}>
        <div className="tabs" role="group" aria-label="Friends views">
          <button type="button" aria-pressed={p.tab === "friends"} onClick={() => p.onTab("friends")} data-flat>Friends</button>
          <button type="button" aria-pressed={p.tab === "requests"} onClick={() => p.onTab("requests")} data-flat>
            Requests{p.incoming.length > 0 && <span className="n">{p.incoming.length}</span>}
          </button>
          <button type="button" disabled title="Blocking is managed in Settings > Privacy" data-flat>
            <Ban aria-hidden="true" />Blocked
          </button>
        </div>

        {p.error && (
          <div className="lockbar" role="alert">
            <span className="muted">{p.error}</span>
            <button type="button" className="link" onClick={p.onRetry} data-flat>
              <RefreshCw aria-hidden="true" />Retry
            </button>
          </div>
        )}

        {p.tab === "friends" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <label className="field">
              <Search aria-hidden="true" />
              <input value={p.query} onChange={(event) => p.onQuery(event.target.value)}
                placeholder="Search by username..." aria-label="Search friends by username" />
            </label>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <span className="select" style={{ height: 38 }}>
                <select value={p.sort} onChange={(event) => p.onSort(event.target.value)} aria-label="Sort friends">
                  <option value="online">Online First</option>
                  <option value="name">Alphabetical</option>
                  <option value="recent">Last Seen</option>
                </select>
                <ChevronDown aria-hidden="true" />
              </span>
              <OnlineToggle checked={p.onlineOnly} onChange={p.onOnlineOnly} onlineCount={p.onlineCount} />
            </div>

            {p.loading ? (
              <p className="muted">Loading your friends...</p>
            ) : p.isGuest || p.friends.length === 0 ? (
              <div className="roster-empty">
                <Users aria-hidden="true" />
                <h2 className="disp">{p.isGuest ? "Your squad starts here" : "No friends yet"}</h2>
                <p className="muted">
                  {p.isGuest ? p.signInPrompt : "Find your friends, share a table, and make your next match a team effort."}
                </p>
                <button type="button" className="ar-btn sm" onClick={p.onOpenAdd} data-flat>
                  <UserPlus aria-hidden="true" />{p.isGuest ? p.signInLabel : "Add Friend"}
                </button>
              </div>
            ) : p.visibleFriends.length === 0 ? (
              <div className="roster-empty">
                <Search aria-hidden="true" />
                <h2 className="disp">No matching friends</h2>
                <button type="button" className="minibtn lime" onClick={p.onClearFilters} data-flat>Clear filters</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {p.visibleFriends.map((friend) => (
                  <PhoneFriendRow
                    key={friend.requestId}
                    friend={friend}
                    profile={p.profiles[friend.uid]}
                    busy={p.busy.includes("invite")}
                    onInvite={(game) => p.onInvite(friend, game)}
                    onRemove={() => p.onRemove(friend)}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span className="lbl dash">Incoming requests</span>
            {p.incoming.length === 0 && <p className="muted2">No pending requests.</p>}
            {p.incoming.map((request) => (
              <RequestRow
                key={request.id}
                name={request.fromName}
                uid={request.from}
                line="Wants to be friends"
                busy={p.busy.includes(request.id)}
                onAccept={() => p.onAccept(request)}
                onDecline={() => p.onDecline(request)}
              />
            ))}

            <span className="lbl dash" style={{ marginTop: 8 }}>Sent requests</span>
            {p.outgoing.length === 0 && <p className="muted2">No outgoing requests.</p>}
            {p.outgoing.map((request) => (
              <div className="fr" key={request.id}>
                <Avatar name={request.toName} seed={request.to} size={42} radius={11} />
                <div className="nm2"><b>{request.toName}</b><span className="st">Pending</span></div>
                <button type="button" className="minibtn dim cancel" disabled={p.busy.includes(request.id)}
                  onClick={() => p.onCancel(request)} data-flat>
                  Cancel<span className="sr-only"> request to {request.toName}</span>
                </button>
              </div>
            ))}

            <span className="lbl dash" id="room-invites-phone" style={{ marginTop: 8 }}>Room invites</span>
            {p.invites.length === 0 && <p className="muted2">No room invites.</p>}
            {p.invites.map((item) => (
              <div className="fr invite" key={item.id}>
                <Avatar name={item.fromName} seed={item.from} size={42} radius={11} />
                <div className="nm2">
                  <b>{item.fromName}</b>
                  <span className="st">Invited you to {item.gameType === "mindi" ? "Mindi" : "Gin Rummy"}</span>
                </div>
                <div className="acts">
                  <Link className="minibtn lime" href={`/play/${item.gameType === "mindi" ? "mindi" : "gin-rummy"}/room?code=${encodeURIComponent(item.code)}`}>
                    Join<span className="sr-only"> {item.fromName}&apos;s room</span>
                  </Link>
                  <button type="button" className="ibtn" aria-label="Dismiss invitation"
                    disabled={p.busy.includes(item.id)} onClick={() => p.onDismissInvite(item)}>
                    <X aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="panel tick b" aria-label="Friend Suggestions" style={{ padding: 16 }}>
        <div className="ph" style={{ marginBottom: 4 }}><h2>Friend Suggestions</h2></div>
        {p.discoveryLoading ? <p className="muted2">Loading players...</p>
          : p.suggestionError ? (
            <p className="muted2">
              Couldn&apos;t load suggestions.{" "}
              <button type="button" className="link" onClick={p.onRetry} data-flat>Retry</button>
            </p>
          ) : p.suggestions.length === 0 ? (
            <p className="muted2">{p.isGuest ? "Sign in to discover players." : "No new suggestions right now."}</p>
          ) : p.suggestions.slice(0, 5).map((person) => (
            <SuggestionRow key={person.uid} person={person} action={p.addControl(person)} />
          ))}
      </section>

      <section className="panel" aria-label="Recently Played" style={{ padding: 16 }}>
        <div className="ph" style={{ marginBottom: 4 }}>
          <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock aria-hidden="true" style={{ width: 18, height: 18, color: "#00BCC8" }} />
            Recently Played
          </h2>
        </div>
        {p.discoveryLoading ? <p className="muted2">Loading matches...</p>
          : p.recentError ? (
            <p className="muted2">
              Couldn&apos;t load recent players.{" "}
              <button type="button" className="link" onClick={p.onRetry} data-flat>Retry</button>
            </p>
          ) : p.recent.length === 0 ? (
            <p className="muted2">Your recent multiplayer opponents will appear here.</p>
          ) : p.recent.slice(0, 3).map((person) => (
            <SuggestionRow
              key={person.uid}
              person={person}
              meta={<span className="muted2">
                {person.gameType === "mindi" ? "Mindi" : "Gin Rummy"} · {new Date(person.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>}
              action={p.addControl(person)}
            />
          ))}
      </section>
    </div>
  );
}
