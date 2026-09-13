"use client";
import Link from "next/link";
import { Users, KeyRound, Award, Package, Shield, Crown, ShoppingBag, Settings, Target } from "lucide-react";
import { HomeLobbyHero } from "@/components/home/HomeLobbyHero";
import { PlayerHUD } from "@/components/home/PlayerHUD";
import { QuickPlayButtons } from "@/components/home/QuickPlayButtons";
import { NewsSection } from "@/components/home/NewsSection";
import { WeekendLeague } from "@/components/home/WeekendLeague";
import { RankProgress } from "@/components/home/RankProgress";
import { RankLockBanner } from "@/components/game/RankLockBanner";

const shortcuts = [
  { href: "/friends", label: "Friends", Icon: Users, accent: "var(--deep)" },
  { href: "/play/mindi/room", label: "Private Rooms", Icon: KeyRound, accent: "var(--orchid)" },
  { href: "/inventory", label: "Inventory", Icon: Package, accent: "var(--lagoon)" },
  { href: "/clubs", label: "Clubs", Icon: Shield, accent: "var(--deep)" },
  { href: "/shop", label: "VIP Pass", Icon: Crown, accent: "var(--gold)" },
  { href: "/hall-of-fame", label: "Hall of Fame", Icon: Award, accent: "var(--gold)" },
  { href: "/missions", label: "Missions", Icon: Target, accent: "var(--lagoon)" },
  { href: "/shop", label: "Cosmetic Shop", Icon: ShoppingBag, accent: "var(--coral)" },
  { href: "/settings", label: "Settings", Icon: Settings, accent: "var(--c5)" },
];

export default function HomePage() {
  return <div className="home-game-hub home-premium">
    <HomeLobbyHero />
    <PlayerHUD />
    <QuickPlayButtons />
    <RankLockBanner />
    <div className="home-lower-grid">
      <RankProgress />
      <WeekendLeague />
      <nav className="home-shortcut-grid" aria-label="Quick access">
        {shortcuts.map(({ href, label, Icon, accent }) => <Link href={href} key={label} style={{ "--accent": accent } as React.CSSProperties}><Icon size={22} /><span>{label}</span></Link>)}
      </nav>
    </div>
    <div className="home-news"><NewsSection /></div>
    <footer className="home-footer"><strong>Thaasbai</strong><span>&copy; {new Date().getFullYear()} Play Fair. Good Games. Greater Friends.</span><Link href="/settings">Settings</Link><Link href="/friends">Community</Link></footer>
  </div>;
}
