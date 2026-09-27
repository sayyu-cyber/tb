"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { PHONE_TABS, activeTab, type PhoneTab } from "./phoneTabs";

/**
 * The phone's five-slot navigation, in both of its shapes —
 * design/arena/boards/MHome.dc.html (`.mtab`) and PHome.dc.html (`.mrail`).
 *
 * Both are rendered and CSS decides which is on screen: the bar below the
 * page in portrait, the 76px rail down the left when the phone is held
 * sideways. No JavaScript reads the orientation, so there is no frame
 * where the wrong one shows and nothing to re-run on a turn - the same
 * trick the desktop sidebar uses for its spacer.
 *
 * The middle slot is the board's raised diamond: a darker lip, a lime face
 * on the 2.6s `playglow` loop, and the gamepad over both.
 *
 * One departure from the board's markup, and only one: it writes More as
 * `<a href="#more">` with a click handler. More opens a sheet rather than
 * going anywhere, so here it is a real <button> with aria-expanded, and
 * styles/arena-phone-shell.css adds `button` beside `a` in the two rules
 * that style a slot. Same pixels, honest semantics.
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

function Slots({ current, onMore, requests }: { current: string | null; onMore: () => void; requests: number }) {
  const t = useTranslation();
  return (
    <>
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
              aria-expanded={false}
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
    </>
  );
}

export function PhoneNav({ onMore, requests = 0 }: { onMore: () => void; requests?: number }) {
  const pathname = usePathname();
  const t = useTranslation();
  const current = activeTab(pathname);

  return (
    <>
      <nav className="mtab" aria-label={t("nav_moreTitle")}>
        <Slots current={current} onMore={onMore} requests={requests} />
      </nav>
      <nav className="mrail" aria-label={t("nav_moreTitle")}>
        <span className="logo" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
              d="M3 7l4.5 4L12 4l4.5 7L21 7l-2 11H5L3 7ZM5 21h14" />
          </svg>
        </span>
        <Slots current={current} onMore={onMore} requests={requests} />
      </nav>
    </>
  );
}
