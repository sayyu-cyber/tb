"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { PHONE_TABS, activeTab, type PhoneTab } from "./phoneTabs";

/**
 * The phone's rail - design/arena/LANDSCAPE.md "The shell", `.mrail` on
 * every L* board: 76px down the left, the logo, then Home, Friends (with its
 * blue badge), the raised Play diamond, Shop and More. The slot you are on
 * wears the lime pill, and a short lime line sits on the rail's right edge.
 *
 * The middle slot is the board's raised diamond: a darker lip, a lime face
 * on the 2.6s `playglow` loop, and the gamepad over both. Play goes straight
 * to the Play lobby (PLobby), which is immersive and has no rail.
 *
 * One departure from the board's markup: it writes More as `<a href="#more">`
 * with a click handler. More opens a side panel rather than going anywhere,
 * so here it is a real <button> carrying the panel's state on aria-expanded.
 * The board styles a slot by element - `a` - so styles/arena-phone-shell.css
 * gives the button the same recipe. Same pixels, honest semantics.
 */

function slotContent(tab: PhoneTab, label: string, badge: number) {
  const Icon = tab.icon;
  return (
    <>
      {tab.play ? (
        <span className="pw" aria-hidden="true">
          <i className="lip" />
          <i className="fc" data-ar-loop />
          <Icon />
        </span>
      ) : (
        <span className="ti"><Icon aria-hidden="true" /></span>
      )}
      {label}
      {badge > 0 && <span className="bdg">{badge > 9 ? "9+" : badge}</span>}
    </>
  );
}

export function PhoneNav({ onMore, moreOpen = false, requests = 0 }: { onMore: () => void; moreOpen?: boolean; requests?: number }) {
  const pathname = usePathname();
  const t = useTranslation();
  const current = activeTab(pathname);

  return (
    <nav className="mrail" aria-label={t("nav_moreTitle")}>
      <span className="logo" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
            d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7ZM5 21h14" />
        </svg>
      </span>
      {PHONE_TABS.map((tab) => {
        const label = t(tab.labelKey);
        const badge = tab.badge === "friendRequests" ? requests : 0;
        const active = current === tab.href;
        const announced = badge > 0 ? `${label}, ${badge} ${t("nav_friendRequests")}` : undefined;

        if (tab.href === "#more") {
          return (
            <button
              type="button"
              key={tab.href}
              onClick={onMore}
              aria-current={active ? "page" : undefined}
              aria-expanded={moreOpen}
              data-flat
            >
              {slotContent(tab, label, badge)}
            </button>
          );
        }
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={tab.play ? "play" : undefined}
            aria-current={active ? "page" : undefined}
            aria-label={announced}
          >
            {slotContent(tab, label, badge)}
          </Link>
        );
      })}
    </nav>
  );
}
