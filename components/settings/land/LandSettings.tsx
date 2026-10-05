"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Activity, BadgeCheck, Ban, Bell, ChevronDown, ChevronRight, Flag, Gamepad2, HelpCircle, Languages,
  LayoutDashboard, Lock, Moon, Music, Palette, Pencil, Settings as SettingsIcon, Shield, Smartphone, User, Volume2,
} from "lucide-react";
import { BlockedPlayers } from "@/components/moderation/BlockedPlayers";
import { LogoutBar } from "@/components/settings/LogoutBar";
import { RankLabel } from "@/components/arena";
import { LANGUAGE_NAMES } from "@/lib/i18n";
import type { LanguageCode } from "@/types";

/**
 * Settings on a phone - design/arena/boards/LSettings.dc.html,
 * design/arena/screens/landscape/landscape-14-settings.jpg.
 *
 * A fixed screen with two panes. Left: Preferences, Account, Privacy &
 * Security and Help & Support, over the brand and the version. Right: the
 * chosen group's controls - the board swaps the pane rather than scrolling
 * a long page. Log Out lives in Account.
 *
 * Every control is the wide screen's own: the same saved settings, the same
 * blocked list (a live subscription, mounted once), the same log-out
 * confirm. Notifications and Sound Effects have nothing behind them yet, so
 * the board draws them switched off and says so; nothing pretends.
 */

type Group = "preferences" | "account" | "privacy" | "help";

const GROUPS: { id: Group; label: string; Icon: typeof SettingsIcon }[] = [
  { id: "preferences", label: "Preferences", Icon: SettingsIcon },
  { id: "account", label: "Account", Icon: User },
  { id: "privacy", label: "Privacy & Security", Icon: Shield },
  { id: "help", label: "Help & Support", Icon: HelpCircle },
];

const LANGUAGES: LanguageCode[] = ["en", "dv", "hi", "bn"];

export interface LandSettingsProps {
  t: (key: string) => string;
  music: boolean;
  onMusic: () => void;
  language: LanguageCode;
  onLanguage: (code: LanguageCode) => void;
  isGuest: boolean;
  isAdmin: boolean;
  account: string;
  tier: string;
  faqs: { q: string; a: ReactNode }[];
}

export function LandSettings(p: LandSettingsProps) {
  const [group, setGroup] = useState<Group>("preferences");

  return (
    <div className="arena-land is-m is-land arena-lsettings">
      <div className="mpage sp">
        <div className="sgrid">
          <aside className="panel tick snavp" aria-label="Settings groups">
            <span className="muted2" style={{ padding: "2px 4px 9px", fontSize: 11.5 }}>Customize your experience</span>
            <div role="group" aria-label="Settings groups" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {GROUPS.map(({ id, label, Icon }) => (
                <button key={id} type="button" className="snav" aria-pressed={group === id} onClick={() => setGroup(id)} data-flat>
                  <Icon aria-hidden="true" />{label}
                </button>
              ))}
            </div>
            <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 5, padding: "10px 4px 2px", borderTop: "1px solid rgba(255,255,255,.08)" }}>
              <b className="disp chrome" style={{ fontSize: 14.5, lineHeight: 1 }}>Good Cards. Greater Friends.</b>
              <span className="muted2" style={{ fontSize: 11.5 }}>{p.t("settings_footerTagline")}</span>
              <span className="pill line" style={{ alignSelf: "flex-start", height: 22, marginTop: 3 }}>Version 1.0.0</span>
            </div>
          </aside>

          {group === "preferences" && (
            <div className="spane scrl fade" key="preferences">
              <section className="panel tick sec2" aria-label="Game Preferences">
                <div className="sh"><span className="shi l" aria-hidden="true"><Gamepad2 /></span><h2>Game Preferences</h2></div>
                <Toggle Icon={Bell} label={p.t("settings_notifications")} note="Push delivery is not connected yet." checked={false} disabled />
                <Toggle Icon={Volume2} label={p.t("settings_sound")} note="Game sound effects are not connected yet." checked={false} disabled />
                <Toggle Icon={Music} label={p.t("settings_music")} note="Ambient game music" checked={p.music} onChange={p.onMusic} lit />
                <div className="srow">
                  <span className="ri" aria-hidden="true"><Languages /></span>
                  <div className="tx">
                    <b>{p.t("settings_language")}</b>
                    <span>{p.language === "dv" ? "Dhivehi switches the app to right-to-left." : "App language"}</span>
                  </div>
                  <div className="langs" role="group" aria-label={p.t("settings_language")}>
                    {LANGUAGES.map((code) => (
                      <button key={code} type="button" className={code === "dv" ? "dv" : undefined} lang={code}
                        aria-pressed={p.language === code} onClick={() => p.onLanguage(code)} data-flat>
                        {LANGUAGE_NAMES[code]}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
              <section className="panel sec2" aria-label="Appearance">
                <div className="sh"><span className="shi" aria-hidden="true"><Palette /></span><h2>Appearance</h2></div>
                <div className="srow"><span className="ri" aria-hidden="true"><Moon /></span><div className="tx"><b>Theme</b><span>Thaasbai Dark</span></div><span className="stat2">Dark</span></div>
                <div className="srow"><span className="ri" aria-hidden="true"><Activity /></span><div className="tx"><b>Reduced Motion</b><span>Follows your device accessibility preference.</span></div><span className="stat2">System</span></div>
              </section>
            </div>
          )}

          {group === "account" && (
            <div className="spane scrl" key="account">
              <section className="panel tick sec2" aria-label="Account" style={{ flex: "1 1 0", minHeight: 0, paddingBottom: 12 }}>
                <div className="sh"><span className="shi" aria-hidden="true"><User /></span><h2>{p.t("settings_account")}</h2></div>
                <div className="cols c2 stretch" style={{ flex: "1 1 0", minHeight: 0, gap: 10, marginTop: 4 }}>
                  <Link className="atile" href="/profile">
                    <span className="at"><span className="ri big" aria-hidden="true"><Pencil /></span><span className="chv" aria-hidden="true"><ChevronRight /></span></span>
                    <div className="tx"><b>Username &amp; Profile</b><span>Display name and avatar</span></div>
                  </Link>
                  <div className="atile">
                    <span className="at"><span className="ri big" aria-hidden="true"><BadgeCheck /></span>{!p.isGuest && <RankLabel tier={p.tier} />}</span>
                    <div className="tx"><b>{p.isGuest ? "Guest Session" : "Signed-in Account"}</b><span>{p.isGuest ? "Sign in to keep your progress." : p.account}</span></div>
                  </div>
                  {/* Admins only: the board's tile pair, one more. */}
                  {p.isAdmin && (
                    <Link className="atile" href="/admin">
                      <span className="at"><span className="ri big" aria-hidden="true"><LayoutDashboard /></span><span className="chv" aria-hidden="true"><ChevronRight /></span></span>
                      <div className="tx"><b>Admin Panel</b><span>{p.t("settings_adminDesc")}</span></div>
                    </Link>
                  )}
                </div>
              </section>
              <LogoutBar land />
            </div>
          )}

          {group === "privacy" && (
            <div className="spane scrl fade" key="privacy">
              <section className="panel tick sec2" aria-label="Privacy and Security">
                <div className="sh"><span className="shi" aria-hidden="true"><Shield /></span><h2>Privacy &amp; Security</h2></div>
                <div className="srow"><span className="ri" aria-hidden="true"><Smartphone /></span><div className="tx"><b>Device Preferences</b><span>Music and language preferences are stored in this browser.</span></div></div>
                <div className="srow" style={{ alignItems: "flex-start", paddingTop: 12 }}>
                  <span className="ri" aria-hidden="true"><Ban /></span>
                  <div className="tx">
                    <b>Blocked Players</b>
                    <span>Blocked players cannot message you, and you will not see their messages.</span>
                    <BlockedPlayers boxed />
                  </div>
                </div>
                <div className="cols c2" style={{ gap: 8, padding: "10px 0 12px", borderTop: "1px solid rgba(255,255,255,.07)" }}>
                  <Link className="ptile" href="/privacy">
                    <span className="ri" aria-hidden="true"><Lock /></span>
                    <div className="tx"><b>Privacy Policy</b><span>What we collect, why, and how to have it removed.</span></div>
                    <ChevronRight className="chev" aria-hidden="true" />
                  </Link>
                  <Link className="ptile" href="/terms">
                    <span className="ri" aria-hidden="true"><Flag /></span>
                    <div className="tx"><b>Terms of Service</b><span>Account rules, coins, and fair play.</span></div>
                    <ChevronRight className="chev" aria-hidden="true" />
                  </Link>
                </div>
                <p className="muted2" style={{ margin: "0 2px 12px", fontSize: 12, lineHeight: 1.5 }}>
                  Account deletion and data export are handled by request — see the Privacy Policy for how to ask.
                  Two-factor authentication is not available in the app yet.
                </p>
              </section>
            </div>
          )}

          {group === "help" && (
            <div className="spane scrl" key="help">
              <section className="panel tick sec2" aria-label="Help and Support" style={{ flex: "1 1 0", minHeight: 0, paddingBottom: 8 }}>
                <div className="sh"><span className="shi" aria-hidden="true"><HelpCircle /></span><h2>Help &amp; Support</h2></div>
                {p.faqs.map(({ q, a }) => (
                  <details key={q} style={{ flex: "1 1 0", minHeight: 54 }}>
                    <summary className="faq">{q}<ChevronDown aria-hidden="true" /></summary>
                    <p className="muted" style={{ margin: "0 2px 12px", fontSize: 13, lineHeight: 1.45 }}>{a}</p>
                  </details>
                ))}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ Icon, label, note, checked, disabled, onChange, lit }: {
  Icon: typeof Bell; label: string; note: string; checked: boolean; disabled?: boolean; onChange?: () => void; lit?: boolean;
}) {
  return (
    <div className={`srow ${disabled ? "off" : ""}`.trim()}>
      <span className="ri" aria-hidden="true" style={lit ? { color: "#C6FF33" } : undefined}><Icon /></span>
      <div className="tx"><b>{label}</b><span>{note}</span></div>
      <button type="button" className="toggle" role="switch" aria-checked={checked} aria-label={label} disabled={disabled} onClick={onChange} data-flat>
        <i />
      </button>
    </div>
  );
}
