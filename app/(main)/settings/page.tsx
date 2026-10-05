"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Settings as SettingsIcon, Bell, Music, Shield, HelpCircle, LayoutDashboard,
  Languages, User, Palette, Moon, Activity, ChevronRight, ChevronDown, Gamepad2, Ban,
  Smartphone, Lock, Flag, BadgeCheck, Pencil,
} from "lucide-react";
import { BlockedPlayers } from "@/components/moderation/BlockedPlayers";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/contexts/ToastContext";
import { LogoutBar } from "@/components/settings/LogoutBar";
import { isAdminEmail } from "@/lib/admin";
import { useTranslation } from "@/hooks/useTranslation";
import { usePhoneLayout } from "@/hooks/usePhoneLayout";
import { LandSettings } from "@/components/settings/land/LandSettings";
import { LANGUAGE_NAMES } from "@/lib/i18n";
import { LanguageCode, AppSettings } from "@/types";
import { RankLabel } from "@/components/arena";
import { getRankFromTrophies } from "@/constants/ranks";

/**
 * Settings — design/arena/screens/app/app-14-settings.jpg, from the
 * Settings board; on a phone, design/arena/boards/LSettings.dc.html
 * (components/settings/land/LandSettings).
 *
 * A category rail and an About card on the left, the sections themselves on
 * the right. The rail scrolls to a section rather than swapping panels,
 * which is what the board's layout implies: every section is on the page at
 * once.
 *
 * Push notifications and game sound effects have no implementation yet,
 * so their controls are omitted until a preference can actually take effect.
 *
 * One composition mounts at a time, because the blocked list inside Privacy
 * holds a live subscription that must exist once.
 */

const CATEGORIES = [
  { id: "preferences", label: "Preferences", Icon: SettingsIcon },
  { id: "account", label: "Account", Icon: User },
  { id: "privacy", label: "Privacy & Security", Icon: Shield },
  { id: "help", label: "Help & Support", Icon: HelpCircle },
];

const LANGUAGES: LanguageCode[] = ["en", "dv", "hi", "bn"];

const FAQS = [
  {
    q: "Where can I change my cards and table?",
    a: <>Equip owned cosmetics from your <Link href="/inventory">Inventory</Link>.</>,
  },
  {
    q: "How do I play with friends?",
    a: <>Create or join a <Link href="/play/mindi/room">Private Room</Link> using a room code.</>,
  },
  {
    q: "Why is music silent?",
    a: <>Enable Background Music, then interact with the page. Your browser may block audio until you click or tap.</>,
  },
];

/** A switch row: icon, label, description, toggle. */
function ToggleRow({
  Icon, label, description, checked, disabled, onChange,
}: {
  Icon: typeof Bell;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange?: () => void;
}) {
  return (
    <div className={`srow ${disabled ? "off" : ""}`.trim()}>
      <span className="ri" aria-hidden="true"><Icon /></span>
      <span className="tx"><b>{label}</b><span>{description}</span></span>
      <button
        type="button"
        className="toggle"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={onChange}
        data-flat
      >
        <i />
      </button>
    </div>
  );
}

/** A row that goes somewhere. */
function LinkRow({ Icon, title, description, href }: { Icon: typeof Bell; title: string; description: string; href: string }) {
  return (
    <Link className="srow" href={href}>
      <span className="ri" aria-hidden="true"><Icon /></span>
      <span className="tx"><b>{title}</b><span>{description}</span></span>
      <ChevronRight className="chev" aria-hidden="true" />
    </Link>
  );
}

function Section({
  id, title, Icon, tone, children,
}: {
  id: string;
  title: string;
  Icon: typeof Bell;
  tone?: "l";
  children: React.ReactNode;
}) {
  return (
    <section className="panel sec" id={`settings-${id}`} tabIndex={-1} aria-labelledby={`settings-${id}-title`}>
      <div className="sh">
        <span className={`shi ${tone ?? ""}`.trim()} aria-hidden="true"><Icon /></span>
        <h2 id={`settings-${id}-title`}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { user, isGuest, playerStats } = useAuth();
  const { showToast } = useToast();
  const t = useTranslation();
  const phone = usePhoneLayout();
  const [active, setActive] = useState("preferences");

  function save(change: Partial<AppSettings>) {
    try { updateSettings(change); }
    catch { showToast("Couldn't save your changes on this device.", "error"); }
  }

  function focusSection(id: string) {
    setActive(id);
    const section = document.getElementById("settings-" + id);
    section?.scrollIntoView({ block: "start", behavior: "auto" });
    section?.focus({ preventScroll: true });
  }

  const tier = playerStats?.currentRank || getRankFromTrophies(playerStats?.trophies ?? 0);
  // The board masks the address to its first letter, as Profile does.
  const maskedEmail = user?.email ? `${user.email[0]}••••@${user.email.split("@")[1] ?? ""}` : null;

  // A phone gets LSettings: two panes, the chosen group's controls on the
  // right, from the same saved settings and handlers.
  if (phone) {
    return (
      <LandSettings
        t={t}
        music={settings.music}
        onMusic={() => save({ music: !settings.music })}
        language={settings.language}
        onLanguage={(code) => save({ language: code })}
        isGuest={isGuest}
        isAdmin={isAdminEmail(user?.email)}
        account={maskedEmail || user?.displayName || "Player"}
        tier={tier}
        faqs={FAQS}
      />
    );
  }

  // The five section bodies the wide screen frames in `.sec` panels beside the rail.
  const sections = [
    {
      id: "preferences", title: "Game Preferences", Icon: Gamepad2, tone: "l" as const, mtone: "l" as const,
      body: (
        <>
          <ToggleRow
            Icon={Music}
            label={t("settings_music")}
            description="Ambient game music"
            checked={settings.music}
            onChange={() => save({ music: !settings.music })}
          />
          <div className="srow">
            <span className="ri" aria-hidden="true"><Languages /></span>
            <span className="tx">
              <b>{t("settings_language")}</b>
              <span>App language</span>
            </span>
            <div className="langs" role="group" aria-label={t("settings_language")}>
              {LANGUAGES.map((code) => (
                <button
                  key={code}
                  type="button"
                  className={code === "dv" ? "dv" : undefined}
                  lang={code}
                  aria-pressed={settings.language === code}
                  onClick={() => save({ language: code })}
                  data-flat
                >
                  {LANGUAGE_NAMES[code]}
                </button>
              ))}
            </div>
          </div>
          {settings.language === "dv" && (
            <p className="muted2 set-note">Dhivehi lays the app out right to left.</p>
          )}
        </>
      ),
    },
    {
      id: "appearance", title: "Appearance", Icon: Palette,
      body: (
        <>
          <div className="srow">
            <span className="ri" aria-hidden="true"><Moon /></span>
            <span className="tx"><b>Theme</b><span>Thaasbai Dark</span></span>
            <span className="stat2">Dark</span>
          </div>
          <div className="srow">
            <span className="ri" aria-hidden="true"><Activity /></span>
            <span className="tx"><b>Reduced Motion</b><span>Follows your device accessibility preference.</span></span>
            <span className="stat2">System</span>
          </div>
        </>
      ),
    },
    {
      id: "account", title: "Account", Icon: User,
      body: (
        <>
          {isAdminEmail(user?.email) && (
            <LinkRow Icon={LayoutDashboard} title="Admin Panel" description="Manage the app" href="/admin" />
          )}
          <LinkRow Icon={Pencil} title="Username & Profile" description="Display name and avatar" href="/profile" />
          <div className="srow">
            <span className="ri" aria-hidden="true"><BadgeCheck /></span>
            <span className="tx">
              <b>{isGuest ? "Guest Session" : "Signed-in Account"}</b>
              <span>{isGuest ? "Sign in to keep your progress." : maskedEmail || user?.displayName || "Player"}</span>
            </span>
            {!isGuest && <RankLabel tier={tier} />}
          </div>
        </>
      ),
    },
    {
      id: "privacy", title: "Privacy & Security", Icon: Shield, tone: "l" as const,
      body: (
        <>
          <div className="srow">
            <span className="ri" aria-hidden="true"><Smartphone /></span>
            <span className="tx">
              <b>Device Preferences</b>
              <span>Music and language preferences are stored in this browser.</span>
            </span>
          </div>
          <div className="srow set-blocked">
            <span className="ri" aria-hidden="true"><Ban /></span>
            <span className="tx">
              <b>Blocked Players</b>
              <span>Blocked players cannot message you, and you will not see their messages.</span>
              <BlockedPlayers />
            </span>
          </div>
          <LinkRow
            Icon={Lock}
            title="Privacy Policy"
            description="What we collect, why, and how to have it removed."
            href="/privacy"
          />
          <LinkRow
            Icon={Flag}
            title="Terms of Service"
            description="Account rules, coins, and fair play."
            href="/terms"
          />
          <p className="muted2 set-note">
            Account deletion and data export are handled by request — see the Privacy Policy for how
            to ask. Two-factor authentication is not available in the app yet.
          </p>
        </>
      ),
    },
    {
      id: "help", title: "Help & Support", Icon: HelpCircle,
      body: FAQS.map(({ q, a }) => (
        <details className="set-faq" key={q}>
          <summary className="faq">{q}<ChevronDown aria-hidden="true" /></summary>
          <p className="muted">{a}</p>
        </details>
      )),
    },
  ];

  return (
    <div className="arena-settings ar-page set-page">
      <aside className="set-side">
        <div>
          <span className="lbl dash" style={{ color: "#C6FF33" }}>Thaasbai</span>
          <h1 className="disp chrome ar-h1 set-title">{t("settings_title")}</h1>
          <p className="sub">Customize your experience</p>
        </div>

        <nav className="panel set-nav" aria-label="Settings categories">
          {CATEGORIES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className="snav"
              aria-pressed={active === id}
              onClick={() => focusSection(id)}
              data-flat
            >
              <Icon aria-hidden="true" />{label}
            </button>
          ))}
        </nav>

        <div className="panel tick set-about">
          <b className="disp set-about-title">Good Cards.<br />Greater Friends.</b>
          <p className="muted2">The Home of Maldivian Card Games</p>
          <span className="pill line">Version 1.0.0</span>
        </div>
      </aside>

      <div className="set-main">
        {sections.map(({ id, title: heading, Icon, tone, body }) => (
          <Section key={id} id={id} title={heading} Icon={Icon} tone={tone}>{body}</Section>
        ))}

        <LogoutBar />
      </div>
    </div>
  );
}
