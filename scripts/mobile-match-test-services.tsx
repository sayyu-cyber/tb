import React from "react";
export { useSettings } from "./gin-test-services";
export const useAuth = () => ({ user: { uid: "mobile-test", displayName: "You" }, isGuest: false, playerStats: { trophies: 58, currentRank: "Gold" } });
export const useEconomy = () => ({ balanceReady: true, state: { economy: { coins: 100 }, profile: { equipped: { tableTheme: "tt_default", cardBack: "cb_default" } } }, processMatchEnd: () => {} });
const router = { push: (href: string) => window.dispatchEvent(new CustomEvent("mobile-match-route", { detail: href })) };
export const useRouter = () => router;
export const useCasualQueue = () => ({ matchFound: false, error: null });
// PLobby's local modes are links; they route through the fixture like router.push.
export default function Link({ href, children, ...props }: any) { return <a href={href} {...props} onClick={(event: React.MouseEvent) => { event.preventDefault(); router.push(href); }}>{children}</a>; }
