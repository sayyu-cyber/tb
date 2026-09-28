"use client";

import { Crown, Check } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Pill, CardBackArt } from "@/components/arena";

/**
 * The VIP hero — design/arena/screens/app/app-12-vip-and-coin-packs.jpg,
 * from the ShopVip board.
 *
 * Left: the foil crown, the six perks in two columns, and a taste of the
 * VIP-only cosmetics. Right: the two plans as a radio pair, then the
 * activate button.
 *
 * The six perk lines are i18n keys vip_benefit1..6, which already read
 * exactly as the board draws them - so this shows translated strings, not
 * the board's copy transcribed.
 *
 * NOTE: how VIP is paid for is code issue 1 and is deliberately untouched
 * here. `onActivate` does whatever the Shop already did; this component
 * only draws the screen.
 *
 * Held upright - design/arena/boards/MShopVip.dc.html,
 * design/arena/screens/phone/phone-12-vip-and-coin-packs.jpg - the hero
 * turns into a column and the two plans leave it, so the perks and the
 * cosmetics taste sit in the box and the plans and the button sit on the
 * page under it. Everything else is the board's own smaller numbers.
 */
export function VipPanel({
  plans,
  selected,
  onSelect,
  onActivate,
  active,
  remainingDays,
  phone = false,
}: {
  plans: readonly { id: "weekly" | "monthly"; days: number; priceMVR: number; savingsNote?: string }[];
  selected: "weekly" | "monthly";
  onSelect: (id: "weekly" | "monthly") => void;
  onActivate: () => void;
  active: boolean;
  remainingDays: number;
  phone?: boolean;
}) {
  const t = useTranslation();
  const plan = plans.find((option) => option.id === selected) ?? plans[0];
  const planLabel = selected === "weekly" ? t("vip_weeklyLabel") : t("vip_monthlyLabel");
  const perks = [
    t("vip_benefit1"), t("vip_benefit2"), t("vip_benefit3"),
    t("vip_benefit4"), t("vip_benefit5"), t("vip_benefit6"),
  ];

  const plansColumn = (
    <div style={{ display: "flex", flexDirection: "column", gap: phone ? "12px" : "14px" }}>
        {plans.map((option) => (
          <button
            key={option.id}
            type="button"
            className="plan"
            aria-pressed={selected === option.id}
            onClick={() => onSelect(option.id)}
            data-flat
          >
            <span className="radio" aria-hidden="true" />
            <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="lbl">{option.id === "weekly" ? t("vip_weeklyLabel") : t("vip_monthlyLabel")}</span>
              {option.savingsNote && <Pill tone="lime">Save</Pill>}
            </span>
            <span className="price"><small>MVR</small><b>{option.priceMVR}</b></span>
            <span className="muted">
              {option.savingsNote
                ? `${option.days} days · ${option.savingsNote}`
                : `${option.days} days of premium benefits`}
            </span>
          </button>
        ))}

        <button
          type="button"
          className={phone ? "ar-btn full" : "ar-btn vip-activate"}
          disabled={active}
          onClick={onActivate}
          style={phone ? { height: "58px", fontSize: "16px" } : { height: "60px", fontSize: "17px" }}
        >
          <Crown aria-hidden="true" />
          {active ? "VIP Active" : t("vip_activateBtn").replace("{plan}", planLabel)}
        </button>
    </div>
  );

  return (
    <>
    <section className="viphero" aria-label={t("vip_pass")}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: phone ? "16px" : "18px" }}>
          <span className="foilcrown" aria-hidden="true"><Crown /></span>
          <div>
            <h2 className={phone ? "disp" : "disp vip-title"} style={phone ? { margin: 0, fontSize: "34px" } : { margin: 0 }}>{t("vip_pass")}</h2>
            <p className="body" style={{ margin: phone ? "7px 0 0" : "8px 0 0", fontSize: phone ? "13.5px" : undefined }}>
              {active
                ? t("vip_activeStatus").replace("{n}", String(remainingDays))
                : `${plan.days} Days of Premium Benefits`}
            </p>
          </div>
        </div>

        <div className="vip-perks" style={phone ? { display: "flex", flexDirection: "column" } : undefined}>
          {perks.map((perk) => (
            <div className="perk" key={perk}>
              <span className="pk" aria-hidden="true"><Check /></span>
              {perk}
            </div>
          ))}
        </div>

        <div
          className="vip-taste"
          style={phone
            ? { display: "flex", alignItems: "center", gap: "12px", paddingTop: "14px", borderTop: "1px solid rgba(255,255,255,.08)" }
            : undefined}
        >
          <CardBackArt id="cb_vip_gold" width={phone ? 50 : 65} />
          {/* VIP Lounge borrows Golden Palace's felt (see TableSwatch); the
              board overrides its rail to gold here, so that is kept. */}
          <span
            className="tt palace"
            aria-hidden="true"
            style={phone
              ? {
                fontSize: "9px", flex: "none", width: "84px", height: "62px", background: "#0B0B0F",
                boxShadow: "inset 0 0 0 .5em #0B0B0F, inset 0 0 0 .7em #FFC940, 0 0 18px rgba(255,201,64,.3)",
              }
              : {
                fontSize: "11px", width: "120px", height: "90px", background: "#0B0B0F",
                boxShadow: "inset 0 0 0 .5em #0B0B0F, inset 0 0 0 .7em #FFC940, 0 0 20px rgba(255,201,64,.3)",
              }}
          />
          <span style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "6px" }}>
            <span className="rar legendary" style={phone ? { fontSize: "10px" } : undefined}>Legendary · VIP only</span>
            <span className="muted2">VIP Royal Gold, VIP Lounge, VIP Elite and more</span>
          </span>
        </div>
      </div>
      {!phone && plansColumn}
    </section>
    {phone && plansColumn}
    </>
  );
}
