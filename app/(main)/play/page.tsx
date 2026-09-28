"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LobbyBoard } from "@/components/game/lobby/LobbyBoard";
import { PhoneLobby } from "@/components/game/lobby/PhoneLobby";
import { PhoneLobbyBoard } from "@/components/game/lobby/PhoneLobbyBoard";
import { RotateToPlaySheet } from "@/components/game/lobby/RotateToPlaySheet";
import { lobbyGame, type LobbyGameId } from "@/components/game/lobby/lobbyGames";
import { useCasualQueue } from "@/hooks/useCasualQueue";
import { usePhonePortrait } from "@/hooks/usePhonePortrait";
import { usePhoneTable } from "@/hooks/usePhoneTable";
import { lockLandscape, releaseLandscape } from "@/lib/orientationLock";
import { getLeagueWindow } from "@/lib/weekendLeague";

/**
 * Play — design/arena/screens/lobby-01-mindi.jpg and
 * lobby-02-gin-finding.jpg from design/arena/boards/Lobby.dc.html, and
 * design/arena/screens/phone/phone-09-play.jpg from MPlay.dc.html.
 *
 * Two decks on a lit podium, the Weekend League and your rank, and the
 * chosen game's modes. Picking a deck swaps the whole mode panel; picking a
 * mode changes where PLAY goes.
 *
 * ONE STATE, THREE COMPOSITIONS. The lobby is not a responsive layout, it is
 * three artboards: Lobby at 1440x900 for a desktop, PLobby at 844x390 for a
 * phone held sideways, and MPlay at 390 wide for one held upright. CSS picks
 * upright from sideways-or-wide (`.portrait-view` / `.landscape-view` in
 * styles/arena-phone-shell.css) and hooks/usePhoneTable picks which of the two
 * landscape boards, since mounting both 3D podiums to hide one would be waste.
 * Everything that can be chosen or searched for lives here instead, so
 * turning the phone mid-search changes the picture and nothing else: the
 * queue keeps running, as design/arena/MOBILE.md requires.
 *
 * The busy state (lobby-02) is a real queue, not a mock. Casual Online is
 * the one mode whose destination screen is nothing but a queue, so the
 * board's "Finding a table" runs it here through hooks/useCasualQueue - the
 * same queue /play/<game>/casual/online uses - and pressing the button again
 * leaves it, which is what "Tap again to stop looking" promises. Ranked and
 * Private Room keep their own screens, because a party, a rank lock and a
 * room code cannot live in a button.
 *
 * TURNING THE PHONE (MOBILE.md "The turn happens at the Play button").
 * /play itself works in both orientations - only the table needs landscape -
 * so the turn is asked for here, at the moment it starts to matter:
 *   - Casual Online starts looking at once and opens the rotate sheet over
 *     the lobby. Turning the phone closes the sheet and the landscape lobby
 *     carries on with "Finding a table"; the table then opens sideways.
 *   - Vs AI and Pass & Play have nothing to wait for, so the sheet says the
 *     table is ready and the game starts only once the phone IS sideways. No
 *     clock runs while the player turns it.
 *   - Where the platform allows it, the same tap turns the screen itself, so
 *     on Android the sheet only flashes. If that fails the sheet stays, with
 *     no error: being asked to turn the phone is not a failure state.
 */
export default function PlayPage() {
  const router = useRouter();
  const portrait = usePhonePortrait();
  /* A phone held sideways gets PLobby, the 844x390 composition, rather than
     the 1440x900 board scaled to a third of its height
     (design/arena/MOBILE.md "Tables fit what is visible"). */
  const sideways = usePhoneTable();
  const [game, setGame] = useState<LobbyGameId>("mindi");
  const [modeId, setModeId] = useState("online");
  const [finding, setFinding] = useState(false);
  const [leagueWindow, setLeagueWindow] = useState(() => getLeagueWindow());

  const entry = lobbyGame(game);
  const mode = entry.modes.find((item) => item.id === modeId) ?? entry.modes[0];
  /** Vs AI and Pass & Play: a table with nobody to wait for. */
  const local = mode.id === "ai" || mode.id === "pass";

  // Queues only while the CTA is in its busy state, and only for the mode
  // that has no screen of its own. A local mode never joins a queue.
  const { matchFound, error } = useCasualQueue(game, finding && mode.href === null);

  // The countdown copy ages, and the window itself flips at the boundary.
  useEffect(() => {
    const timer = setInterval(() => setLeagueWindow(getLeagueWindow()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // The phone turned while a local table was waiting: start it. This is the
  // one thing in the flow CSS cannot do, which is why hooks/usePhonePortrait
  // exists at all.
  useEffect(() => {
    if (!finding || !local || portrait) return;
    const href = mode.href;
    if (!href) return;
    setFinding(false);
    router.push(href);
  }, [finding, local, portrait, mode.href, router]);

  const stop = useCallback(() => {
    setFinding(false);
    // Hand the orientation back: the player is no longer on their way to a
    // table, so the screen should turn with them again.
    void releaseLandscape();
  }, []);

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
    // A sideways phone, a tablet or a desktop needs no ceremony: a local
    // mode can start immediately, and the effect above will not fire.
    if (local && !portrait) {
      if (mode.href) router.push(mode.href);
      return;
    }
    setFinding(true);
    // Synchronous inside the tap, which is the only place the two calls are
    // allowed. Failure is silent by design - the sheet is the fallback.
    if (portrait) void lockLandscape();
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

  return (
    <>
      <div className="landscape-view">
        {sideways
          ? <PhoneLobbyBoard game={game} onPickGame={pickGame} {...shared} />
          : <LobbyBoard game={game} onPickGame={pickGame} {...shared} />}
      </div>
      <div className="portrait-view">
        <PhoneLobby game={game} onPickGame={pickGame} {...shared} />
      </div>
      <RotateToPlaySheet
        open={portrait && finding}
        onStop={stop}
        gameName={entry.name}
        mode={mode}
        ready={local}
      />
    </>
  );
}
