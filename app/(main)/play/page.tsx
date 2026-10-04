"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LobbyBoard } from "@/components/game/lobby/LobbyBoard";
import { PhoneLobbyBoard } from "@/components/game/lobby/PhoneLobbyBoard";
import { lobbyGame, type LobbyGameId } from "@/components/game/lobby/lobbyGames";
import { useCasualQueue } from "@/hooks/useCasualQueue";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { getLeagueWindow } from "@/lib/weekendLeague";

/**
 * Play - design/arena/screens/lobby-01-mindi.jpg and
 * lobby-02-gin-finding.jpg from design/arena/boards/Lobby.dc.html, and
 * design/arena/screens/phone/phone-land-01-lobby.jpg and
 * phone-land-01b-lobby-gin-finding.jpg from PLobby.dc.html.
 *
 * Two decks on a lit podium, the Weekend League and your rank, and the
 * chosen game's modes. Picking a deck swaps the whole mode panel; picking a
 * mode changes where PLAY goes.
 *
 * ONE STATE, TWO COMPOSITIONS, ONE MOUNTED. The lobby is not a responsive
 * layout, it is two artboards: Lobby at 1440x900 for a desktop, and PLobby
 * at 844x390 for a phone (design/arena/LANDSCAPE.md: the phone is landscape
 * only, and Play on the rail goes straight here - immersive, no rail, its
 * own back arrow). Each is a lit 3D podium - a rotateX table over seven
 * translateZ aprons, blurred LED rings, motes on infinite loops - so only the
 * one on screen is mounted. Held upright, the turn gate covers PLobby and it
 * stays mounted under it, so turning back finds the queue still running.
 *
 * Everything that can be chosen or searched for lives here instead of in the
 * compositions, so the picture can change and nothing else does.
 *
 * The busy state (lobby-02) is a real queue, not a mock. Casual Online is
 * the one mode whose destination screen is nothing but a queue, so the
 * board's "Finding a table" runs it here through hooks/useCasualQueue - the
 * same queue /play/<game>/casual/online uses - and pressing the button again
 * leaves it, which is what "Tap again to stop looking" promises. Ranked and
 * Private Room keep their own screens, because a party, a rank lock and a
 * room code cannot live in a button. Vs AI and Pass & Play have nothing to
 * wait for, so they start at once.
 */
export default function PlayPage() {
  const router = useRouter();
  /* A phone gets PLobby, the 844x390 composition, rather than the 1440x900
     board scaled to a third of its height. */
  const phone = usePhoneLayout();
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

  const stop = useCallback(() => setFinding(false), []);

  // Both pickers stop the search, exactly as the board's logic does -
  // looking for a Mindi table while the Gin panel is open would be a lie.
  function pickGame(id: LobbyGameId) {
    setGame(id);
    setModeId("online");
    stop();
  }
  function pickMode(id: string) {
    setModeId(id);
    stop();
  }

  function go() {
    if (finding) { stop(); return; }
    // Every mode but Casual Online has a screen of its own to go to.
    if (mode.href) { router.push(mode.href); return; }
    setFinding(true);
  }

  const shared = {
    entry,
    mode,
    onMode: pickMode,
    finding,
    matchFound,
    onGo: go,
    leagueWindow,
    error,
  };

  return phone
    ? <PhoneLobbyBoard game={game} onPickGame={pickGame} {...shared} />
    : <LobbyBoard game={game} onPickGame={pickGame} {...shared} />;
}
