"use client";
import { useState } from "react";
import Link from "next/link";
import { Settings, Bell, Volume2, Music, Shield, HelpCircle, Info, LayoutDashboard, Languages, User, Palette, Moon, Activity, ChevronRight, Gamepad2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { useToast } from "@/contexts/ToastContext";
import { SettingToggle } from "@/components/settings/SettingToggle";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { LogoutBar } from "@/components/settings/LogoutBar";
import { LobbyPhoto } from "@/components/home/LobbyPhoto";
import { isAdminEmail } from "@/lib/admin";
import { useTranslation } from "@/hooks/useTranslation";
import { LANGUAGE_NAMES } from "@/lib/i18n";
import { LanguageCode, AppSettings } from "@/types";

const categories = [
  {id:"preferences",label:"Preferences",icon:Settings},
  {id:"account",label:"Account",icon:User},
  {id:"privacy",label:"Privacy & Security",icon:Shield},
  {id:"help",label:"Help & Support",icon:HelpCircle},
];
const languages: LanguageCode[] = ["en","dv","hi","bn"];
export default function SettingsPage() {
  const { settings, updateSettings } = useSettings();
  const { user, isGuest } = useAuth();
  const { showToast } = useToast();
  const t = useTranslation();
  const [active, setActive] = useState("preferences");
  function save(change: Partial<AppSettings>) {
    try { updateSettings(change); }
    catch { showToast("Couldn't save your changes on this device.", "error"); }
  }
  function focusSection(id: string) {
    setActive(id);
    const section = document.getElementById("settings-" + id);
    section?.scrollIntoView({block:"start",behavior:"auto"});
    section?.focus({preventScroll:true});
  }
  return <div className="settings-hub">
    <header className="settings-hero"><LobbyPhoto className="absolute inset-0" />
      <div className="settings-hero-copy"><span>THAASBAI</span><h1><Settings aria-hidden="true" />{t("settings_title")}</h1>
      <p>Customize your experience</p></div>
    </header>
    <nav className="settings-categories" aria-label="Settings categories">
      {categories.map(({id,label,icon:Icon}) => <button key={id} aria-current={active === id ? "location" : undefined}
        onClick={() => focusSection(id)}><Icon size={18} />{label}</button>)}
    </nav>
    <div className="settings-dashboard">
      <SettingsSection id="preferences" title="Game Preferences" icon={Gamepad2} tone="teal">
        <SettingToggle icon={Bell} label={t("settings_notifications")} description="Push delivery is not connected yet." enabled={false} disabled onChange={() => {}} />
        <SettingToggle icon={Volume2} label={t("settings_sound")} description="Game sound effects are not connected yet." enabled={false} disabled onChange={() => {}} />
        <SettingToggle icon={Music} label={t("settings_music")} description="Ambient game music" enabled={settings.music} onChange={() => save({music:!settings.music})} />
        <div className="settings-row"><Languages size={20} aria-hidden="true" /><label htmlFor="settings-language">{t("settings_language")}</label>
          <select id="settings-language" value={settings.language} onChange={e => save({language:e.target.value as LanguageCode})}>
            {languages.map(code => <option value={code} key={code}>{LANGUAGE_NAMES[code]}</option>)}
          </select></div>
      </SettingsSection>
      <SettingsSection id="appearance" title="Appearance" icon={Palette} tone="gold">
        <div className="settings-row"><Moon size={20} /><div><h3>Theme</h3><p>Thaasbai Dark</p></div><span className="settings-status"><Moon size={16} /> Dark</span></div>
        <div className="settings-row"><Activity size={20} /><div><h3>Reduced Motion</h3><p>Follows your device accessibility preference.</p></div><span className="settings-status">System</span></div>
      </SettingsSection>
      <SettingsSection id="account" title="Account" icon={User} tone="blue">
        {isAdminEmail(user?.email) && <Link className="settings-row settings-link" href="/admin"><LayoutDashboard size={20} /><div><h3>Admin Panel</h3><p>Manage the app</p></div><ChevronRight size={18} /></Link>}
        <Link className="settings-row settings-link" href="/profile"><User size={20} /><div><h3>Username &amp; Profile</h3><p>Display name and avatar</p></div><ChevronRight size={18} /></Link>
        <div className="settings-row"><Shield size={20} /><div><h3>{isGuest ? "Guest Session" : "Signed-in Account"}</h3><p>{isGuest ? "Sign in to keep your progress." : user?.email || user?.displayName || "Player"}</p></div></div>
      </SettingsSection>
      <SettingsSection id="privacy" title="Privacy & Security" icon={Shield} tone="teal">
        <div className="settings-row"><Shield size={20} /><div><h3>Device Preferences</h3><p>Music and language preferences are stored in this browser.</p></div></div>
        <Link className="settings-row settings-link" href="/privacy"><Shield size={20} /><div><h3>Privacy Policy</h3><p>What we collect, why, and how to have it removed.</p></div></Link>
        <Link className="settings-row settings-link" href="/terms"><Shield size={20} /><div><h3>Terms of Service</h3><p>Account rules, coins, and fair play.</p></div></Link>
        <p className="settings-note">Account deletion and data export are handled by request — see the Privacy Policy for how to ask. Two-factor authentication is not available in the app yet.</p>
      </SettingsSection>
      <SettingsSection id="help" title="Help & Support" icon={HelpCircle} tone="blue">
        <details className="settings-faq"><summary>Where can I change my cards and table?</summary><p>Equip owned cosmetics from your <Link href="/inventory">Inventory</Link>.</p></details>
        <details className="settings-faq"><summary>How do I play with friends?</summary><p>Create or join a <Link href="/play/mindi/room">Private Room</Link> using a room code.</p></details>
        <details className="settings-faq"><summary>Why is music silent?</summary><p>Enable Background Music, then interact with the page. Your browser may block audio until you click or tap.</p></details>
      </SettingsSection>
      <SettingsSection id="about" title="About Thaasbai" icon={Info} tone="gold">
        <div className="settings-about"><strong>Good Cards. Greater Friends.</strong><p>The Home of Maldivian Card Games</p><span>Version 1.0.0</span></div>
      </SettingsSection>
    </div>
    <LogoutBar />
  </div>;
}
