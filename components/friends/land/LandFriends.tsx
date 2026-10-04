"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Ban, ChevronDown, Check, Clock, Gamepad2, MessageCircle, MoreHorizontal, RefreshCw, Search, User,
  UserPlus, UserX, Users, X,
} from "lucide-react";
import type { Friend, FriendRequestDoc, PlayerSearchResult, RecentPlayer, RoomInviteDoc } from "@/lib/friends";
import { getRankFromTrophies } from "@/constants/ranks";
import { Avatar } from "@/components/arena";
import { Sheet } from "@/components/layout/phone/Sheet";
import { presenceText } from "../FriendsPieces";

/**
 * Friends on a phone - design/arena/boards/LFriends.dc.html (+
 * LFriendsRequests, LFriendActions), design/arena/screens/landscape/
 * landscape-04, 04b and 04c.
 *
 * A fixed screen: one viewport tall, the panes scroll inside. Left, the list
 * panel - Friends / Requests / Blocked, Online only, search and sort, then a
 * row per friend with play, message and "..."; Requests labels each group
 * beside its rows. Right, the three count tiles (each opens its tab), Add
 * Friend, then Friend Suggestions and Recently Played. "..." opens the
 * actions panel from the right.
 *
 * The page owns every watcher and handler (app/(main)/friends/page.tsx) and
 * passes them in, the same ones the wide screen uses. Blocked stays the
 * board's disabled tab: blocking lives in Settings > Privacy.
 */

export interface LandFriendsProps {
  isGuest: boolean;
  signInPrompt: string;
  signInLabel: string;
  addFriendLabel: string;
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
  /** The board's four right-hand pill states: Add, Requested, Respond, Friends. */
  addControl: (person: { uid: string; displayName: string }) => ReactNode;
}

const RANK_CLASS: Record<string, string> = { Bronze: "bronze", Silver: "silver", Gold: "gold", Platinum: "plat" };
const gameName = (game: string) => (game === "mindi" ? "Mindi" : "Gin Rummy");

export function LandFriends(p: LandFriendsProps) {
  const [menu, setMenu] = useState<Friend | null>(null);
  const [allSuggestions, setAllSuggestions] = useState(false);
  const [allRecent, setAllRecent] = useState(false);
  const menuProfile = menu ? p.profiles[menu.uid] : undefined;
  const menuName = menu ? menuProfile?.displayName || menu.name : "";
  const menuPresence = presenceText(menuProfile?.lastSeen);

  const showInvites = () => {
    p.onTab("requests");
    // After the tab renders: bring the invites group into the pane.
    setTimeout(() => document.getElementById("room-invites-land")?.scrollIntoView({ block: "nearest" }), 0);
  };

  return (
    <div className="arena-land is-m is-land arena-lfriends">
      <div className="mpage fx">
        <div className="cols sideR fit stretch">
          <section className="panel tick fpane" aria-label="Friends">
            <div className="fhead">
              <div className="tabs" role="group" aria-label="Friends views">
                <button type="button" aria-pressed={p.tab === "friends"} onClick={() => p.onTab("friends")} data-flat>Friends</button>
                <button type="button" aria-pressed={p.tab === "requests"} onClick={() => p.onTab("requests")} data-flat>
                  Requests{p.incoming.length > 0 && <span className="n">{p.incoming.length}</span>}
                </button>
                <button type="button" disabled title="Blocking is managed in Settings > Privacy" data-flat>
                  <Ban aria-hidden="true" />Blocked
                </button>
              </div>
              {p.tab === "friends" && (
                <span className="otg">
                  <span>Online only · {p.onlineCount}</span>
                  <button type="button" className="toggle" role="switch" aria-checked={p.onlineOnly} aria-label="Online only"
                    onClick={() => p.onOnlineOnly(!p.onlineOnly)} data-flat><i /></button>
                </span>
              )}
            </div>

            {p.error && (
              <div role="alert" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px 0" }}>
                <span className="muted2" style={{ fontSize: 12 }}>{p.error}</span>
                <button type="button" className="link" onClick={p.onRetry} data-flat><RefreshCw aria-hidden="true" />Retry</button>
              </div>
            )}

            {p.tab === "friends" ? (
              <>
                <div className="ftools">
                  <label className="field">
                    <Search aria-hidden="true" />
                    <input value={p.query} onChange={(event) => p.onQuery(event.target.value)}
                      placeholder="Search by username..." aria-label="Search friends by username" />
                  </label>
                  <span className="select">
                    <select value={p.sort} onChange={(event) => p.onSort(event.target.value)} aria-label="Sort friends">
                      <option value="online">Online First</option>
                      <option value="name">Alphabetical</option>
                      <option value="recent">Last Seen</option>
                    </select>
                    <ChevronDown aria-hidden="true" />
                  </span>
                </div>
                <div className="scrl flist">
                  {p.loading ? (
                    <p className="muted2" style={{ margin: 0 }}>Loading your friends...</p>
                  ) : p.isGuest || p.friends.length === 0 ? (
                    <Empty icon={<Users aria-hidden="true" />} title={p.isGuest ? "Your squad starts here" : "No friends yet"}
                      text={p.isGuest ? p.signInPrompt : "Find your friends, share a table, and make your next match a team effort."}>
                      <button type="button" className="ar-btn sm" onClick={p.onOpenAdd}>
                        <UserPlus aria-hidden="true" />{p.isGuest ? p.signInLabel : p.addFriendLabel}
                      </button>
                    </Empty>
                  ) : p.visibleFriends.length === 0 ? (
                    <Empty icon={<Search aria-hidden="true" />} title="No matching friends">
                      <button type="button" className="minibtn lime" onClick={p.onClearFilters} data-flat>Clear filters</button>
                    </Empty>
                  ) : p.visibleFriends.map((friend) => {
                    const profile = p.profiles[friend.uid];
                    const name = profile?.displayName || friend.name;
                    const presence = presenceText(profile?.lastSeen);
                    return (
                      <div className={`fr ${presence.online ? "on" : ""}`.trim()} key={friend.requestId}>
                        <Avatar name={name} src={profile?.photoURL} seed={friend.uid} size={38} radius={10}
                          presence={presence.online ? "online" : "offline"} style={{ fontSize: 16 }} />
                        <div className="nm2">
                          <b>{name}</b>
                          <span className={`st ${presence.online ? "on" : ""}`.trim()}><i aria-hidden="true" />{presence.text}</span>
                        </div>
                        <div className="acts">
                          <button type="button" className="ibtn" aria-label={`Invite ${name} to a game`}
                            disabled={p.busy.includes("invite")} onClick={() => p.onInvite(friend, "mindi")}>
                            <Gamepad2 aria-hidden="true" />
                          </button>
                          <Link className="ibtn" aria-label={`Message ${name}`}
                            href={`/messages?with=${encodeURIComponent(friend.uid)}&name=${encodeURIComponent(name)}`}>
                            <MessageCircle aria-hidden="true" />
                          </Link>
                          <button type="button" className="ibtn" aria-label={`More for ${name}`} aria-haspopup="dialog"
                            aria-expanded={menu?.requestId === friend.requestId} onClick={() => setMenu(friend)}>
                            <MoreHorizontal aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="scrl flist rq">
                <div className="rg">
                  <span className="rgl" style={{ ["--c" as string]: "#C6FF33" }}>Incoming requests</span>
                  <div className="rgc">
                    {p.incoming.length === 0 && <p className="muted2" style={{ margin: "2px 0 0", fontSize: 12 }}>No pending requests.</p>}
                    {p.incoming.map((request) => (
                      <div className="fr" key={request.id}>
                        <Avatar name={request.fromName} seed={request.from} size={38} radius={10} style={{ fontSize: 16 }} />
                        <div className="nm2"><b>{request.fromName}</b><span className="st">Wants to be friends</span></div>
                        <div className="acts">
                          <button type="button" className="ibtn" aria-label={`Accept ${request.fromName}`} disabled={p.busy.includes(request.id)}
                            onClick={() => p.onAccept(request)} style={{ background: "#C6FF33", color: "#0A0A0A" }}>
                            <Check aria-hidden="true" />
                          </button>
                          <button type="button" className="ibtn" aria-label={`Decline ${request.fromName}`} disabled={p.busy.includes(request.id)}
                            onClick={() => p.onDecline(request)}>
                            <X aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rg">
                  <span className="rgl" style={{ ["--c" as string]: "#8E8E9C" }}>Sent requests</span>
                  <div className="rgc">
                    {p.outgoing.length === 0 && <p className="muted2" style={{ margin: "2px 0 0", fontSize: 12 }}>No outgoing requests.</p>}
                    {p.outgoing.map((request) => (
                      <div className="fr" key={request.id}>
                        <Avatar name={request.toName} seed={request.to} size={38} radius={10} style={{ fontSize: 16 }} />
                        <div className="nm2"><b>{request.toName}</b><span className="st">Pending</span></div>
                        <button type="button" className="minibtn dim" style={{ cursor: "pointer" }} disabled={p.busy.includes(request.id)}
                          onClick={() => p.onCancel(request)} data-flat>
                          Cancel<span className="sr-only"> request to {request.toName}</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rg" id="room-invites-land">
                  <span className="rgl" style={{ ["--c" as string]: "#00BCC8" }}>Room invites</span>
                  <div className="rgc">
                    {p.invites.length === 0 && <p className="muted2" style={{ margin: "2px 0 0", fontSize: 12 }}>No room invites.</p>}
                    {p.invites.map((item) => (
                      <div className="fr" key={item.id} style={{ boxShadow: "inset 0 0 0 1.5px rgba(0,188,200,.5)" }}>
                        <Avatar name={item.fromName} seed={item.from} size={38} radius={10} style={{ fontSize: 16 }} />
                        <div className="nm2"><b>{item.fromName}</b><span className="st">Invited you to {gameName(item.gameType)}</span></div>
                        <div className="acts">
                          <Link className="minibtn lime" style={{ height: 38 }}
                            href={`/play/${item.gameType === "mindi" ? "mindi" : "gin-rummy"}/room?code=${encodeURIComponent(item.code)}&invite=${encodeURIComponent(item.id)}`}>
                            Join<span className="sr-only"> {item.fromName}&apos;s room</span>
                          </Link>
                          <button type="button" className="ibtn" aria-label="Dismiss invitation" disabled={p.busy.includes(item.id)}
                            onClick={() => p.onDismissInvite(item)}>
                            <X aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          <div className="stk fill">
            <div className="cols c3 stretch" style={{ gap: 8 }}>
              <button type="button" className="sbtn" aria-pressed={p.tab === "friends"} onClick={() => { p.onTab("friends"); p.onClearFilters(); }} data-flat>
                <span className="sbt"><b>{p.friends.length}</b><Users aria-hidden="true" /></span><span className="lbl">Friends</span>
              </button>
              <button type="button" className="sbtn b" aria-pressed={p.tab === "requests"} onClick={() => p.onTab("requests")} data-flat>
                <span className="sbt"><b>{p.incoming.length}</b><UserPlus aria-hidden="true" /></span><span className="lbl">Requests</span>
              </button>
              <button type="button" className="sbtn b" onClick={showInvites} data-flat>
                <span className="sbt"><b>{p.invites.length}</b><Gamepad2 aria-hidden="true" /></span><span className="lbl">Room Invites</span>
              </button>
            </div>
            <button type="button" className="ar-btn sm" style={{ flex: "none" }} onClick={p.onOpenAdd}>
              <UserPlus aria-hidden="true" />{p.addFriendLabel}
            </button>
            <div className="grow scrl rcol">
              <section className="panel tick b" aria-label="Friend Suggestions">
                <div className="ph" style={{ marginBottom: 2 }}>
                  <h2 style={{ fontSize: 16 }}>Friend Suggestions</h2>
                  <button type="button" className="link b" onClick={() => setAllSuggestions(!allSuggestions)} data-flat>
                    {allSuggestions ? "Less" : "See All"}
                  </button>
                </div>
                {p.discoveryLoading ? <p className="muted2" style={{ fontSize: 12 }}>Loading players...</p>
                  : p.suggestionError ? (
                    <p className="muted2" style={{ fontSize: 12 }}>
                      Players could not be loaded.{" "}
                      <button type="button" className="link" onClick={p.onRetry} data-flat>Retry</button>
                    </p>
                  ) : p.suggestions.length === 0 ? (
                    <p className="muted2" style={{ fontSize: 12 }}>{p.isGuest ? "Sign in to discover players." : "No new suggestions right now."}</p>
                  ) : p.suggestions.slice(0, allSuggestions ? 20 : 5).map((person) => {
                    const trophies = person.trophies ?? 0;
                    const tier = getRankFromTrophies(trophies);
                    return (
                      <Suggestion key={person.uid} person={person}
                        meta={<span className={`rank ${RANK_CLASS[tier] ?? ""}`.trim()}><i aria-hidden="true" />{tier} · {trophies}</span>}
                        action={p.addControl(person)} />
                    );
                  })}
              </section>
              <section className="panel" aria-label="Recently Played">
                <div className="ph" style={{ marginBottom: 2 }}>
                  <h2 style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 16 }}>
                    <Clock aria-hidden="true" style={{ width: 17, height: 17, color: "#00BCC8" }} />Recently Played
                  </h2>
                  <button type="button" className="link b" onClick={() => setAllRecent(!allRecent)} data-flat>
                    {allRecent ? "Less" : "See All"}
                  </button>
                </div>
                {p.discoveryLoading ? <p className="muted2" style={{ fontSize: 12 }}>Loading matches...</p>
                  : p.recentError ? (
                    <p className="muted2" style={{ fontSize: 12 }}>
                      Match history is unavailable.{" "}
                      <button type="button" className="link" onClick={p.onRetry} data-flat>Retry</button>
                    </p>
                  ) : p.recent.length === 0 ? (
                    <p className="muted2" style={{ fontSize: 12 }}>Your recent multiplayer opponents will appear here.</p>
                  ) : p.recent.slice(0, allRecent ? 15 : 3).map((person) => (
                    <Suggestion key={person.uid} person={person}
                      meta={<span className="muted2" style={{ fontSize: 12 }}>
                        {gameName(person.gameType)} · {new Date(person.playedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>}
                      action={p.addControl(person)} />
                  ))}
              </section>
            </div>
          </div>
        </div>
      </div>

      {/* LFriendActions: the row's "..." as a 372px panel from the right,
          naming who it acts on. The same four destinations as the wide
          screen's dropdown, in the same order. */}
      <Sheet open={!!menu} onClose={() => setMenu(null)} label={menuName} namespace="arena-lfriends" className="right tick fa">
        {menu && (
          <>
            <div className="fa-head">
              <Avatar name={menuName} src={menuProfile?.photoURL} seed={menu.uid} size={52} radius={13}
                presence={menuPresence.online ? "online" : "offline"} style={{ fontSize: 22 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <b className="disp" style={{ fontSize: 20, letterSpacing: ".02em" }}>{menuName}</b>
                <span className={`st ${menuPresence.online ? "on" : ""}`.trim()}><i aria-hidden="true" />{menuPresence.text}</span>
              </div>
            </div>
            <div className="acts2">
              <Link href={`/player?uid=${encodeURIComponent(menu.uid)}`} onClick={() => setMenu(null)}>
                <span className="ic"><User aria-hidden="true" /></span>View Profile
              </Link>
              <button type="button" className="blu" disabled={p.busy.includes("invite")}
                onClick={() => { const friend = menu; setMenu(null); p.onInvite(friend, "mindi"); }} data-flat>
                <span className="ic"><Gamepad2 aria-hidden="true" /></span>Invite to Mindi
              </button>
              <button type="button" className="blu" disabled={p.busy.includes("invite")}
                onClick={() => { const friend = menu; setMenu(null); p.onInvite(friend, "gin_rummy"); }} data-flat>
                <span className="ic"><Gamepad2 aria-hidden="true" /></span>Invite to Gin Rummy
              </button>
              <button type="button" className="danger" onClick={() => { const friend = menu; setMenu(null); p.onRemove(friend); }} data-flat>
                <span className="ic"><UserX aria-hidden="true" /></span>Remove Friend
              </button>
            </div>
            <button type="button" className="ar-btn ghost sm full" style={{ marginTop: "auto", flex: "none" }} onClick={() => setMenu(null)}>
              Cancel
            </button>
          </>
        )}
      </Sheet>
    </div>
  );
}

function Suggestion({ person, meta, action }: {
  person: { uid: string; displayName: string; photoURL?: string | null };
  meta: ReactNode;
  action: ReactNode;
}) {
  return (
    <div className="sg">
      <Avatar name={person.displayName} src={person.photoURL} seed={person.uid} size={36} radius={10} style={{ fontSize: 15 }} />
      <div className="sn"><b>{person.displayName}</b>{meta}</div>
      {action}
    </div>
  );
}

function Empty({ icon, title, text, children }: { icon: ReactNode; title: string; text?: string; children?: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "20px 12px", textAlign: "center" }}>
      <span style={{ display: "flex", width: 36, height: 36, color: "#3A3A46" }}>{icon}</span>
      <b className="disp" style={{ fontSize: 17, textTransform: "uppercase" }}>{title}</b>
      {text && <p className="muted2" style={{ margin: 0, maxWidth: "42ch", fontSize: 12.5 }}>{text}</p>}
      {children}
    </div>
  );
}
