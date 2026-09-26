import { Globe, Bot, Smartphone, Trophy, Users, KeyRound } from "lucide-react";

/**
 * The two decks on the podium and every mode behind them —
 * design/arena/boards/Lobby.dc.html (its GAMES object), with each mode
 * pointed at the route the app actually has.
 *
 * The board's list and the app's routes already agree, which is the point
 * of checking: Mindi's ranked mode is 2v2 only (there is no Mindi 1v1
 * queue - RankedQueueClient sends you to Ranked Duo), and Gin Rummy has
 * both a 1v1 and a 2v2 pool. That is exactly what the board draws.
 *
 * `href: null` means the lobby queues in place rather than navigating: the
 * board's CTA turns into "Finding a table" instead of leaving the screen.
 * Only Casual Online does that, because it is the only mode whose whole
 * screen is a queue. Ranked and Private Room have real screens of their
 * own (a party, a rank lock, a room code), so they are links.
 */

export type LobbyGameId = "mindi" | "gin-rummy";

export interface LobbyMode {
  id: string;
  Icon: typeof Globe;
  name: string;
  detail: string;
  /** Doubles trophies while the Weekend League runs. */
  x2?: boolean;
  /** Where PLAY goes, or null to queue in place. */
  href: string | null;
  /** Needs a signed-in account; guests are sent to /login instead. */
  account?: boolean;
}

export interface LobbyGame {
  id: LobbyGameId;
  /** The kicker above the name, e.g. "Four players, two teams". */
  cap: string;
  name: string;
  /** The deck box's name, one line per entry. */
  deckLines: string[];
  thaana: string;
  /** The deck box's footer, e.g. "2 to 4 players". */
  meta: string;
  /** One sentence of rules. */
  line: string;
  modes: LobbyMode[];
}

export const LOBBY_GAMES: LobbyGame[] = [
  {
    id: "mindi",
    cap: "Four players, two teams",
    name: "Mindi",
    deckLines: ["Mindi"],
    thaana: "މިންޑި",
    meta: "2 to 4 players",
    line: "Follow suit, find trump, and capture the Tens. Most Tens wins the hand.",
    modes: [
      { id: "online", Icon: Globe, name: "Casual online", detail: "Auto-teamed, no partner needed", href: null, account: true },
      { id: "ai", Icon: Bot, name: "Vs AI", detail: "Practice against bots", href: "/play/mindi/casual/ai" },
      { id: "pass", Icon: Smartphone, name: "Pass & Play", detail: "One device, passed round the table", href: "/play/mindi/casual/passplay" },
      { id: "ranked", Icon: Trophy, name: "Ranked duo", detail: "2v2 with a fixed partner", x2: true, href: "/play/mindi/ranked-duo", account: true },
      { id: "room", Icon: KeyRound, name: "Private room", detail: "Invite friends with a code", href: "/play/mindi/room", account: true },
    ],
  },
  {
    id: "gin-rummy",
    cap: "Two players",
    name: "Gin Rummy",
    deckLines: ["Gin", "Rummy"],
    thaana: "ޖިން ރަމީ",
    meta: "2 players",
    line: "Draw, discard, and meld all ten cards as 4, 3 and 3. There is no knocking.",
    modes: [
      { id: "online", Icon: Globe, name: "Casual online", detail: "Quick and fun", href: null, account: true },
      { id: "ai", Icon: Bot, name: "Vs AI", detail: "Practice against a bot", href: "/play/gin-rummy/casual/ai" },
      { id: "pass", Icon: Smartphone, name: "Pass & Play", detail: "One device, two players", href: "/play/gin-rummy/casual/passplay" },
      { id: "ranked", Icon: Trophy, name: "Ranked 1v1", detail: "Climb on your own", x2: true, href: "/play/gin-rummy/ranked", account: true },
      { id: "duo", Icon: Users, name: "Ranked 2v2", detail: "With a partner", x2: true, href: "/play/gin-rummy/ranked-duo", account: true },
      { id: "room", Icon: KeyRound, name: "Private room", detail: "Invite a friend with a code", href: "/play/gin-rummy/room", account: true },
    ],
  },
];

export function lobbyGame(id: LobbyGameId): LobbyGame {
  return LOBBY_GAMES.find((game) => game.id === id) ?? LOBBY_GAMES[0];
}
