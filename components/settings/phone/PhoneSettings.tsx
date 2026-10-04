"use client";

import type { LucideIcon } from "lucide-react";
import { LogoutBar } from "@/components/settings/LogoutBar";

/**
 * Settings on a phone held upright — design/arena/boards/MSettings.dc.html,
 * design/arena/screens/phone/phone-14-settings.jpg.
 *
 * The wide screen runs a category rail and an About card down the left with
 * the sections beside them. The board turns the rail into the phone's
 * scrolling `.chips` row - same four categories, same scroll-to behaviour -
 * puts the sections in one column at the board's `.sec2` size, and moves
 * the About card to the foot of the page with Log Out in it.
 *
 * Every row inside a section is the wide screen's own: the board draws
 * `.srow`, `.ri`, `.tx`, `.toggle`, `.langs` and `.chev` the same way at
 * both sizes, so a toggle is wired once.
 */
export function PhoneSettings({ title, categories, active, onCategory, sections }: {
  title: string;
  categories: { id: string; label: string; Icon: LucideIcon }[];
  active: string;
  onCategory: (id: string) => void;
  sections: { id: string; title: string; Icon: LucideIcon; mtone?: "l"; body: React.ReactNode }[];
}) {
  return (
    <div className="arena-phone arena-msettings mpage">
      <div className="mh">
        <span className="lbl dash" style={{ color: "#C6FF33" }}>Thaasbai</span>
        <h1 className="disp chrome">{title}</h1>
        <p className="sub">Customize your experience</p>
      </div>

      <div className="chips" role="group" aria-label="Settings categories">
        {categories.map(({ id, label, Icon }) => (
          <button key={id} type="button" aria-pressed={active === id} onClick={() => onCategory(id)} data-flat>
            <Icon aria-hidden="true" />{label}
          </button>
        ))}
      </div>

      {sections.map(({ id, title: heading, Icon, mtone, body }, index) => (
        <section
          key={id}
          /* The board ticks the first panel only - it is the one the page
             opens on. */
          className={`panel ${index === 0 ? "tick " : ""}sec2`}
          id={`settings-${id}`}
          tabIndex={-1}
          aria-labelledby={`settings-${id}-title`}
        >
          <div className="sh">
            <span className={`shi ${mtone ?? ""}`.trim()} aria-hidden="true"><Icon /></span>
            <h2 id={`settings-${id}-title`}>{heading}</h2>
          </div>
          {body}
        </section>
      ))}

      <section className="panel tick" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
        <b className="disp chrome" style={{ fontSize: 24 }}>Good Cards.<br />Greater Friends.</b>
        <span className="muted2">The Home of Maldivian Card Games</span>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <span className="pill line">Version 1.0.0</span>
          <LogoutBar phone />
        </div>
      </section>
    </div>
  );
}
