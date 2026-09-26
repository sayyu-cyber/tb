"use client";

import { useEffect, useState } from "react";
import { LobbyBoard } from "@/components/game/lobby/LobbyBoard";
import { lobbyGame, type LobbyGameId } from "@/components/game/lobby/lobbyGames";
import { useCasualQueue } from "@/hooks/useCasualQueue";
import { getLeagueWindow } from "@/lib/weekendLeague";

/**
 * Play — design/arena/screens/lobby-01-mindi.jpg and
 * lobby-02-gin-finding.jpg, from design/arena/boards/Lobby.dc.html.
 *
 * Two decks on a lit podium, the Weekend League and your rank down the
 * left, and the chosen game's modes down the right. Picking a deck swaps
 * the whole right-hand panel; picking a mode changes where PLAY goes.
 *
 * The screen IS the artboard: LobbyBoard renders the board's 1440x900
 * canvas at its own coordinates and scales it to the space the shell
 * leaves, the same way the Mindi and Gin tables do. Only the board's
 * header row is left out - the shell already carries the logo, the nav,
 * the coin chip and the avatar.
 *
 * The busy state (lobby-02) is a real queue, not a mock. Casual Online is
 * the one mode whose destination screen is nothing but a queue, so the
 * board's "Finding a table" runs it here through hooks/useCasualQueue -
 * the same queue /play/<game>/casual/online uses - and pressing the button
 * again leaves it, which is what "Tap again to stop looking" promises.
 * Ranked and Private Room keep their own screens, because a party, a rank
 * lock and a room code cannot live in a button.
 */
export default function PlayPage() {
  const [game, setGame] = useState<LobbyGameId>("mindi");
  const [modeId, setModeId] = useState("online");
  const [finding, setFinding] = useState(false);
  const [leagueWindow, setLeagueWindow] = useState(() => getLeagueWindow());

  const entry = lobbyGame(game);
  const mode = entry.modes.find((item) => item.id === modeId) ?? entry.modes[0];

  // Queues only while the CTA is in its busy state, and only for the mode
  // that has no screen of its own.
  const { matchFound, error } = useCasualQueue(game, finding && mode.href === null);

  // The countdown copy ages, and the window itself flips at the boundary.
  useEffect(() => {
    const timer = setInterval(() => setLeagueWindow(getLeagueWindow()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Both pickers stop the search, exactly as the board's logic does -
  // looking for a Mindi table while the Gin panel is open would be a lie.
  function pickGame(id: LobbyGameId) {
    setGame(id);
    setModeId("online");
    setFinding(false);
  }
  function pickMode(id: string) {
    setModeId(id);
    setFinding(false);
  }

  return (
    <LobbyBoard
      game={game}
      onPickGame={pickGame}
      entry={entry}
      mode={mode}
      onMode={pickMode}
      finding={finding}
      matchFound={matchFound}
      onGo={() => setFinding((on) => !on)}
      leagueWindow={leagueWindow}
      error={error}
    />
  );
}
