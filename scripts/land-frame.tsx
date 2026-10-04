import React, { useState } from "react";
import { PhoneTopBar } from "../components/layout/phone/PhoneTopBar";
import { PhoneNav } from "../components/layout/phone/PhoneNav";
import { MoreSheet } from "../components/layout/phone/MoreSheet";

/**
 * The phone shell around a screen, for scripts/check-landscape-screens.cjs:
 * the app shell's root classes, the page in its main column, and the real
 * 52px top bar, 76px rail and More panel - what every screens/landscape
 * reference draws.
 *
 * Only the chrome's pieces, not PhoneChrome itself, so a screen's fixture
 * needs nothing beyond what its page already reads (the route, the player,
 * the coins). The counts are the boards' own: 3 notifications, 2 friend
 * requests, 2 unread messages.
 */
export function LandFrame({ children, notifications = 3, requests = 2, unread = 2 }: { children: React.ReactNode; notifications?: number; requests?: number; unread?: number }) {
  const [more, setMore] = useState(false);
  return (
    <div className="arena-app arena-phone app-shell ar-stage">
      <main className="app-shell-main" id="app-content">{children}</main>
      <div className="phone-chrome arena-land is-m is-land">
        <div className="mstage" aria-hidden="true" />
        <PhoneTopBar notifications={notifications} />
        <PhoneNav onMore={() => setMore(true)} moreOpen={more} requests={requests} />
        <MoreSheet open={more} onClose={() => setMore(false)} unread={unread} />
      </div>
    </div>
  );
}
