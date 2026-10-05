import React from "react";
import { createRoot } from "react-dom/client";
import { AppShell } from "../components/layout/AppShell";
import { TurnGate } from "../components/layout/TurnGate";
import { ToastProvider } from "../contexts/ToastContext";
import HomePage from "../app/(main)/home/page";
import FriendsPage from "../app/(main)/friends/page";
import ClubsPage from "../app/(main)/clubs/page";
import LeaderboardPage from "../app/(main)/leaderboard/page";
import MessagesPage from "../app/(main)/messages/page";
import PlayPage from "../app/(main)/play/page";
import ProfilePage from "../app/(main)/profile/page";
import SettingsPage from "../app/(main)/settings/page";
import AchievementsPage from "../app/achievements/page";
import CollectionPage from "../app/collection/page";
import HallOfFamePage from "../app/hall-of-fame/page";
import InventoryPage from "../app/inventory/page";
import MissionsPage from "../app/missions/page";
import RewardsPage from "../app/rewards/page";
import RoomCardsPage from "../app/room-cards/page";
import ShopPage from "../app/shop/page";
import TournamentPage from "../app/tournament/page";
import RoomPage from "../app/(main)/play/[game]/room/page";
import RankedPage from "../app/(main)/play/[game]/ranked/page";
import RankedDuoPage from "../app/(main)/play/[game]/ranked-duo/page";
import CasualOnlinePage from "../app/(main)/play/[game]/casual/online/page";
import PostMatchPage from "../app/(main)/play/post-match/page";
import SpectatePage from "../app/(main)/spectate/page";
import PlayerPage from "../app/player/page";
import AdminPage from "../app/(main)/admin/page";
import NotFound from "../app/not-found";
import ErrorPage from "../app/error";
import Loading from "../app/loading";
import { ROUTE } from "./landscape-routes-services";

/**
 * Every signed-in route, each in the real app shell (AppShell, with the
 * phone chrome and the turn gate), fed scripts/landscape-routes-services.
 * The live matches (casual/ai, casual/passplay, casual/online/live,
 * ranked/live) are scripts/check-landscape-tables.cjs's.
 */
const PAGES: Record<string, () => React.ReactElement> = {
  "/home": () => <HomePage />,
  "/friends": () => <FriendsPage />,
  "/clubs": () => <ClubsPage />,
  "/leaderboard": () => <LeaderboardPage />,
  "/messages": () => <MessagesPage />,
  "/play": () => <PlayPage />,
  "/profile": () => <ProfilePage />,
  "/settings": () => <SettingsPage />,
  "/achievements": () => <AchievementsPage />,
  "/collection": () => <CollectionPage />,
  "/hall-of-fame": () => <HallOfFamePage />,
  "/inventory": () => <InventoryPage />,
  "/missions": () => <MissionsPage />,
  "/rewards": () => <RewardsPage />,
  "/room-cards": () => <RoomCardsPage />,
  "/shop": () => <ShopPage />,
  "/tournament": () => <TournamentPage />,
  "/play/post-match": () => <PostMatchPage />,
  "/spectate": () => <SpectatePage />,
  "/player": () => <PlayerPage />,
  "/admin": () => <AdminPage />,
  "/error": () => <ErrorPage error={Object.assign(new Error("Test"), { digest: "test" })} reset={() => {}} />,
  "/loading": () => <Loading />,
};

function Page() {
  const path = ROUTE().split("?")[0];
  const [, game, flow] = path.match(/^\/play\/([^/]+)\/(.+)$/) ?? [];
  if (flow === "room") return <RoomPage params={{ game }} />;
  if (flow === "ranked") return <RankedPage params={{ game }} />;
  if (flow === "ranked-duo") return <RankedDuoPage params={{ game }} />;
  if (flow === "casual/online") return <CasualOnlinePage params={{ game }} />;
  return (PAGES[path] ?? (() => <NotFound />))();
}

createRoot(document.getElementById("test-root")!).render(
  <ToastProvider>
    <AppShell><Page /></AppShell>
    <TurnGate />
  </ToastProvider>
);
