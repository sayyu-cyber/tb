"use client";
import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Ticket } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon, Suit } from "./ArenaSprite";
import type { RoomCard } from "@/types/economy";

// Match the phone shell both upright and sideways, with one live composition.
const PHONE = "(max-width: 767px), (orientation: landscape) and (max-height: 500px) and (pointer: coarse)";
const subscribe = (notify: () => void) => {
  const media = window.matchMedia(PHONE);
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
};
export function useRoomPhone() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(PHONE).matches, () => false);
}
export function RoomDeck({ gin = false, small = false }: { gin?: boolean; small?: boolean }) {
  return <span className={`gdeck ${small ? "sm " : ""}${gin ? "gin" : "mindi"}`} aria-hidden="true"><b><i>{gin ? <Suit suit="D" /> : <Icon name="i-crown" />}</i></b></span>;
}
export function SeatGlyph({ four }: { four: boolean }) {
  return <svg className="seatg" viewBox="0 0 26 20" aria-hidden="true"><ellipse cx="13" cy="10" rx="7.5" ry="5" fill="none" stroke="currentColor" strokeWidth="1.6" /><circle cx="13" cy="1.8" r="1.8" fill="currentColor" /><circle cx="13" cy="18.2" r="1.8" fill="currentColor" />{four && <><circle cx="2" cy="10" r="1.8" fill="currentColor" /><circle cx="24" cy="10" r="1.8" fill="currentColor" /></>}</svg>;
}
export function RoomCardBadge({ card, phone }: { card?: RoomCard; phone: boolean }) {
  const t = useTranslation();
  const remaining = Math.max(0, card?.remainingTime ?? 0);
  const meter = card ? Math.min(100, remaining / (card.duration * 3600000) * 100) : 0;
  return <div className={`rcs ${card ? "" : "none"}`} aria-label={t("room_card")} style={phone ? undefined : { width: 390 }}>
    <span className="tk"><Ticket aria-hidden="true" /></span>
    <div className="tx" style={{ flex: "1 1 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><b style={{ whiteSpace: "nowrap" }}>{t(card ? "room_cardActive" : phone ? "room_noCardShort" : "room_noCard")}</b>{card && !phone && <span className="pill lime" style={{ height: 20, padding: "0 7px", fontSize: 9.5 }}>{t("room_host")}</span>}</div>
      <span>{card ? t("room_cardTime").replace("{hours}", String(card.duration)).replace("{minutes}", String(Math.ceil(remaining / 60000))) : t(phone ? "room_needsCardShort" : "room_needsCard")}</span>
      {card && <div className="rmeter"><i style={{ width: `${meter}%` }} /></div>}
    </div>
    <Link className={card ? "link" : "minib blue"} href="/room-cards" style={card ? { alignSelf: "flex-start" } : undefined}>{t(card ? "room_manage" : phone ? "room_getOne" : "room_getCard")}</Link>
  </div>;
}
