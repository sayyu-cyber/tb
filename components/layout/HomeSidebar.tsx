"use client";
import Link from "next/link";
import Image from "next/image";
import { Home, Gamepad2, Users, Trophy, Package, ShoppingBag, Shield, Award, Settings, Crown, Spade, ChevronRight, MessageCircle } from "lucide-react";
import { useHomeSocial } from "@/contexts/HomeSocialContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEconomy } from "@/contexts/EconomyContext";

const items = [
  ["/home", "Home", Home], ["/play", "Play", Gamepad2], ["/friends", "Friends", Users],
  ["/leaderboard", "Leaderboard", Trophy], ["/inventory", "Inventory", Package],
  ["/shop", "Shop", ShoppingBag], ["/clubs", "Clubs", Shield],
  ["/tournament", "Tournaments", Trophy], ["/achievements", "Achievements", Award],
  ["/settings", "Settings", Settings],
] as const;

export function HomeSidebar({ activeHref = "/home" }: { activeHref?: string }) {
  const { user } = useAuth();
  const { state } = useEconomy();
  const vipActive = state.profile.vip.active;
  const { online, profiles, chats, loading, error, retry } = useHomeSocial();
  return <aside className="home-desktop-sidebar" aria-label="Home navigation">
    <Link href="/home" className="home-wordmark"><Spade size={35} fill="currentColor" /><strong>Thaasbai</strong></Link>
    <nav>{items.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={href === activeHref ? "page" : undefined}><Icon size={20} /><span>{label}</span></Link>)}</nav>
    <section className="home-vip-promo">
      <h2><Crown size={25} />{vipActive ? "VIP Active" : "Upgrade to VIP Pass"}</h2><p>{vipActive ? "Your premium benefits are unlocked." : "Get more matches, exclusive rewards and more!"}</p>
      <Link href="/shop" className="home-gold-button">{vipActive ? "Visit Shop" : "View Plans"}</Link>
    </section>
    {error ? <div className="home-social-error" role="alert"><p>Could not load social activity.</p><button onClick={retry}>Try again</button></div> : loading ? <div className="home-social-skeleton" role="status" aria-label="Loading social activity" /> : <>
      <Link href="/friends" className="home-social-widget"><header><Users size={16} /><strong>Friends Online</strong><span>{online.length}</span><ChevronRight size={14} /></header>
        {online.length ? <div className="home-avatar-stack">{online.slice(0,4).map(friend => <span key={friend.uid} title={friend.name + " - Online"}>{profiles[friend.uid]?.photoURL ? <Image src={profiles[friend.uid].photoURL!} width={32} height={32} alt={friend.name} unoptimized /> : friend.name.slice(0,1)}</span>)}{online.length > 4 && <span>+{online.length - 4}</span>}</div> : <p>No friends online</p>}
      </Link>
      <Link href="/messages" className="home-social-widget"><header><MessageCircle size={16} /><strong>Active Chats</strong><span>{chats.length}</span><ChevronRight size={14} /></header>
        {chats.length ? <div className="home-avatar-stack">{chats.slice(0,3).map(chat => {
          const other = chat.participants.find(id => id !== user?.uid) || "";
          const unread = chat.lastSenderUid !== user?.uid && chat.lastMessageAt > (chat.lastReadAt?.[user?.uid || ""] ?? 0);
          const name = chat.participantNames[other] || "Player";
          return <span key={chat.id} title={name + (unread ? " - Unread messages" : "")}>{name.slice(0,1)}{unread && <b aria-label="Unread">*</b>}</span>;
        })}{chats.length > 3 && <span>+{chats.length - 3}</span>}</div> : <p>No active chats</p>}
      </Link>
    </>}
  </aside>;
}
