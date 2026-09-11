"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import {
  isAdminEmail,
  ShopOverrides,
  MissionRewardOverrides,
  RankRewardOverrides,
  getSeasonOverride,
  setSeasonOverride,
  watchShopOverrides,
  setShopOverrides,
  watchMissionRewardOverrides,
  setMissionRewardOverrides,
  watchRankRewardOverrides,
  setRankRewardOverrides,
} from "@/lib/admin";
import { CoinTopupRequest, watchAllTopups, decideTopup, findPlayerByCode, adminTopUp, AdminPlayerLookup } from "@/lib/coinTopups";
import { ManualHallOfFameEntry, watchManualHallOfFameEntries, addManualHallOfFameEntry, removeManualHallOfFameEntry, resetManualHallOfFame } from "@/lib/hallOfFame";
import { ALL_COSMETICS, DAILY_MISSION_TEMPLATES, WEEKLY_MISSION_TEMPLATES, RANK_CONFIGS } from "@/data/cosmetics";
import { useTranslation } from "@/hooks/useTranslation";
import { ShieldCheck, Wallet, CalendarDays, Trophy, ShoppingBag, Target, Swords } from "lucide-react";

type Tab = "topups" | "season" | "hof" | "shop" | "missions" | "ranked";

export function AdminPanelClient() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("topups");
  const t = useTranslation();

  if (!isAdminEmail(user?.email)) {
    return (
      <div className="pt-4 pb-32 px-4">
        <PageHeader title={t("page_admin")} />
        <div className="glass-card rounded-2xl p-6 text-center">
          <p className="text-[rgb(var(--c4))] text-sm">You don&apos;t have access to this page.</p>
        </div>
      </div>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "topups", label: "Top-ups" },
    { id: "season", label: "Season" },
    { id: "hof", label: "Hall of Fame" },
    { id: "shop", label: "Shop" },
    { id: "missions", label: "Missions" },
    { id: "ranked", label: "Ranked" },
  ];

  return (
    <div className="hub-page admin-page">
      <PageHeader title={t("page_adminPanel")} icon={ShieldCheck} />
      <div className="admin-workspace">
      <nav className="admin-navigation" aria-label="Administration">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
              tab === t.id ? "bg-[rgb(var(--gold)/20%)] text-[rgb(var(--gold-ink))] border border-[rgb(var(--gold)/30%)]" : "bg-[rgb(var(--c2))] text-[rgb(var(--c4))] border border-[rgb(var(--c3))]"
            }`}
          >
            {t.id === 'topups' ? <Wallet size={17} /> : t.id === 'season' ? <CalendarDays size={17} /> : t.id === 'hof' ? <Trophy size={17} /> : t.id === 'shop' ? <ShoppingBag size={17} /> : t.id === 'missions' ? <Target size={17} /> : <Swords size={17} />}
            {t.label}
          </button>
        ))}
      </nav>
      <section className="admin-content" aria-label={tabs.find(item=>item.id === tab)?.label}>
      <h2 className="text-lg font-bold mb-5">{tabs.find(item=>item.id === tab)?.label}</h2>
      {tab === "topups" && <TopupsTab />}
      {tab === "season" && <SeasonTab />}
      {tab === "hof" && <HallOfFameTab />}
      {tab === "shop" && <ShopTab />}
      {tab === "missions" && <MissionsTab />}
      {tab === "ranked" && <RankedTab />}
      </section></div>
    </div>
  );
}

function DirectTopupPanel() {
  const [code, setCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [found, setFound] = useState<AdminPlayerLookup | null>(null);
  const [amount, setAmount] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  async function handleSearch() {
    const trimmed = code.trim();
    if (!trimmed) return;
    setSearching(true);
    setSearchError(null);
    setFound(null);
    setDone(null);
    try {
      const result = await findPlayerByCode(trimmed);
      if (!result) {
        setSearchError("No player found with that ID.");
      } else {
        setFound(result);
      }
    } catch (err) {
      setSearchError(`Search failed: ${err instanceof Error ? err.message : "unknown error"}`);
    } finally {
      setSearching(false);
    }
  }

  const parsedAmount = parseInt(amount, 10);
  const validAmount = Number.isFinite(parsedAmount) && parsedAmount > 0;

  async function handleConfirmDeposit() {
    if (!found || !validAmount) return;
    setDepositing(true);
    try {
      await adminTopUp(found.uid, found.displayName, parsedAmount);
      setDone(`Deposited ${parsedAmount.toLocaleString()} coins to ${found.displayName}.`);
      setConfirming(false);
      setAmount("");
      setFound(null);
      setCode("");
    } catch (err) {
      setSearchError(`Deposit failed: ${err instanceof Error ? err.message : "unknown error"}`);
      setConfirming(false);
    } finally {
      setDepositing(false);
    }
  }

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider">Direct Top-Up</p>
      <p className="text-[rgb(var(--c4))] text-xs">
        Look a player up by the unique ID shown on their profile, then deposit coins directly - no purchase request needed.
      </p>

      <div className="flex gap-2">
        <input
          aria-label="Player ID"
          value={code}
          onChange={(e) => {
            setCode(e.target.value);
            setFound(null);
            setSearchError(null);
            setDone(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Player ID (e.g. X7K9PQ2)"
          maxLength={10}
          className="flex-1 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-2.5 text-[rgb(var(--text-primary))] text-sm outline-none font-mono uppercase tracking-widest"
        />
        <button
          onClick={handleSearch}
          disabled={searching || !code.trim()}
          className="px-4 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--text-primary))] text-sm font-semibold disabled:opacity-50"
        >
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {searchError && <p className="text-[rgb(var(--coral-ink))] text-xs">{searchError}</p>}
      {done && <p className="text-[rgb(var(--lagoon-ink))] text-xs">{done}</p>}

      {found && (
        <div className="rounded-xl bg-[rgb(var(--c2)/70%)] border border-[rgb(var(--c3))] p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[rgb(var(--text-primary))] text-sm font-semibold">{found.displayName}</p>
              <p className="text-[rgb(var(--c4))] text-xs">Current balance: {found.coins.toLocaleString()} coins</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              aria-label="Amount to deposit"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              type="number"
              min={1}
              placeholder="Amount"
              className="flex-1 bg-[rgb(var(--c1))] border border-[rgb(var(--c3))] rounded-xl px-4 py-2.5 text-[rgb(var(--text-primary))] text-sm outline-none"
            />
            <button
              onClick={() => setConfirming(true)}
              disabled={!validAmount}
              className="px-4 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold disabled:opacity-50"
            >
              Deposit
            </button>
          </div>
        </div>
      )}

      {confirming && found && validAmount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="glass-card rounded-2xl p-5 w-full max-w-sm space-y-4">
            <div>
              <p className="text-[rgb(var(--text-primary))] font-semibold text-sm mb-1">Confirm deposit</p>
              <p className="text-[rgb(var(--c4))] text-xs">
                Deposit <span className="text-[rgb(var(--gold-ink))] font-bold">{parsedAmount.toLocaleString()} coins</span> to{" "}
                <span className="text-[rgb(var(--text-primary))] font-semibold">{found.displayName}</span>? This cannot be undone.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={depositing}
                className="flex-1 py-2.5 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))] text-sm font-medium disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDeposit}
                disabled={depositing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold disabled:opacity-50"
              >
                {depositing ? "Depositing…" : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TopupsTab() {
  const [requests, setRequests] = useState<CoinTopupRequest[]>([]);

  useEffect(() => watchAllTopups(setRequests), []);

  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending").slice(0, 20);

  return (
    <div className="space-y-4">
      <DirectTopupPanel />

      <div>
        <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-2">Pending ({pending.length})</p>
        {pending.length === 0 ? (
          <p className="text-[rgb(var(--c3))] text-xs">No pending top-ups.</p>
        ) : (
          <div className="space-y-2">
            {pending.map((r) => (
              <div key={r.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-[rgb(var(--text-primary))] text-sm font-medium">{r.playerName}</p>
                  <p className="text-[rgb(var(--c4))] text-xs">
                    {r.packName} — {r.coins.toLocaleString()} coins (MVR {r.priceMVR})
                  </p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => decideTopup(r.id, true)} className="px-3 py-1.5 rounded-lg bg-[rgb(var(--lagoon)/15%)] border border-[rgb(var(--lagoon)/35%)] text-[rgb(var(--lagoon-ink))] text-xs">
                    Approve
                  </button>
                  <button onClick={() => decideTopup(r.id, false)} className="px-3 py-1.5 rounded-lg bg-[rgb(var(--coral)/15%)] border border-[rgb(var(--coral)/35%)] text-[rgb(var(--coral-ink))] text-xs">
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider mb-2">Recent decisions</p>
        {decided.length === 0 ? (
          <p className="text-[rgb(var(--c3))] text-xs">None yet.</p>
        ) : (
          <div className="space-y-1">
            {decided.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-xs px-1">
                <span className="text-[rgb(var(--c4))]">{r.playerName} — {r.packName}</span>
                <span className={r.status === "rejected" ? "text-[rgb(var(--coral-ink))]" : "text-[rgb(var(--lagoon-ink))]"}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SeasonTab() {
  const [seasonNumber, setSeasonNumberInput] = useState("");
  const [current, setCurrent] = useState<{ seasonNumber: number; startedAt: number } | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSeasonOverride().then((o) => o && setCurrent(o));
  }, []);

  async function handleSet() {
    const n = parseInt(seasonNumber, 10);
    if (!n || n < 1) return;
    await setSeasonOverride({ seasonNumber: n, startedAt: Date.now() });
    setCurrent({ seasonNumber: n, startedAt: Date.now() });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  async function handleReset() {
    await setSeasonOverride({ seasonNumber: 0, startedAt: 0 });
    setCurrent(null);
  }

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <p className="text-[rgb(var(--c4))] text-sm">
        {current && current.seasonNumber > 0
          ? `Override active: Season ${current.seasonNumber}`
          : "No override - season is computed automatically from the calendar (one per month)."}
      </p>
      <div className="flex gap-2">
        <input
          aria-label="Season number"
          value={seasonNumber}
          onChange={(e) => setSeasonNumberInput(e.target.value)}
          placeholder="Season number"
              maxLength={4}
          type="number"
          className="flex-1 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-2.5 text-[rgb(var(--text-primary))] text-sm outline-none"
        />
        <button onClick={handleSet} className="px-4 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] text-sm font-semibold">
          {saved ? "Saved!" : "Set"}
        </button>
      </div>
      <button onClick={handleReset} className="w-full py-2 rounded-xl bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] text-[rgb(var(--c4))] text-sm">
        Reset to automatic
      </button>
      <p className="text-[rgb(var(--c3))] text-[11px]">
        Note: this changes the displayed season number/countdown only. Resetting the leaderboard or every player&apos;s trophies at scale needs a server-side job, not something this panel can safely do from the browser.
      </p>
    </div>
  );
}

function HallOfFameTab() {
  const [entries, setEntries] = useState<ManualHallOfFameEntry[]>([]);
  const [name, setName] = useState("");
  const [trophies, setTrophies] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => watchManualHallOfFameEntries(setEntries), []);

  async function handleAdd() {
    if (!name.trim() || !trophies) return;
    await addManualHallOfFameEntry(name, parseInt(trophies, 10) || 0, note);
    setName("");
    setTrophies("");
    setNote("");
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-2xl p-4 space-y-2">
        <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider">Add a player or team</p>
        <input
  aria-label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name"
              maxLength={24} className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-2.5 text-[rgb(var(--text-primary))] text-sm outline-none" />
        <input
  aria-label="Peak trophies" value={trophies} onChange={(e) => setTrophies(e.target.value)} type="number" placeholder="Peak trophies"
              maxLength={7} className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-2.5 text-[rgb(var(--text-primary))] text-sm outline-none" />
        <input
  aria-label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
              maxLength={120} className="w-full bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-xl px-4 py-2.5 text-[rgb(var(--text-primary))] text-sm outline-none" />
        <button onClick={handleAdd} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold text-sm">
          Add Entry
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider">Manual entries ({entries.length})</p>
          {entries.length > 0 && (
            <button onClick={() => resetManualHallOfFame()} className="text-[rgb(var(--coral-ink))] text-xs">
              Reset all
            </button>
          )}
        </div>
        <div className="space-y-2">
          {entries.map((e) => (
            <div key={e.id} className="glass-card rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-[rgb(var(--text-primary))] text-sm font-medium">{e.displayName}</p>
                <p className="text-[rgb(var(--c4))] text-xs">{e.peakTrophies.toLocaleString()} trophies {e.note && `— ${e.note}`}</p>
              </div>
              <button onClick={() => removeManualHallOfFameEntry(e.id)} className="text-[rgb(var(--coral-ink))] text-xs">
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShopTab() {
  const [overrides, setOverridesState] = useState<ShopOverrides>({ priceOverrides: {}, hiddenItemIds: [] });
  const [saved, setSaved] = useState(false);

  useEffect(() => watchShopOverrides((d) => d && setOverridesState(d)), []);

  function updatePrice(id: string, value: string) {
    const n = parseInt(value, 10);
    setOverridesState((prev) => ({ ...prev, priceOverrides: { ...prev.priceOverrides, ...(n >= 0 ? { [id]: n } : {}) } }));
  }
  function toggleHidden(id: string) {
    setOverridesState((prev) => ({
      ...prev,
      hiddenItemIds: prev.hiddenItemIds.includes(id) ? prev.hiddenItemIds.filter((h) => h !== id) : [...prev.hiddenItemIds, id],
    }));
  }
  async function handleSave() {
    await setShopOverrides(overrides);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-3">
      <button onClick={handleSave} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold text-sm sticky top-0 z-10">
        {saved ? "Saved!" : "Save Shop Changes"}
      </button>
      {ALL_COSMETICS.filter((c) => !c.isVipExclusive && c.price > 0).map((item) => {
        const hidden = overrides.hiddenItemIds.includes(item.id);
        return (
          <div key={item.id} className={`glass-card rounded-xl p-3 flex items-center justify-between gap-2 ${hidden ? "opacity-50" : ""}`}>
            <p className="text-[rgb(var(--text-primary))] text-sm truncate flex-1">{item.name}</p>
            <input
              type="number"
              defaultValue={overrides.priceOverrides[item.id] ?? item.price}
              onChange={(e) => updatePrice(item.id, e.target.value)}
              className="w-20 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-lg px-2 py-1.5 text-[rgb(var(--text-primary))] text-xs outline-none"
            />
            <button onClick={() => toggleHidden(item.id)} className={`text-xs px-2 py-1.5 rounded-lg ${hidden ? "bg-[rgb(var(--coral)/15%)] text-[rgb(var(--coral-ink))]" : "bg-[rgb(var(--c2))] text-[rgb(var(--c4))]"}`}>
              {hidden ? "Hidden" : "Visible"}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function MissionsTab() {
  const [overrides, setOverridesState] = useState<MissionRewardOverrides>({ dailyRewards: {}, weeklyRewards: {} });
  const [saved, setSaved] = useState(false);

  useEffect(() => watchMissionRewardOverrides((d) => d && setOverridesState(d)), []);

  async function handleSave() {
    await setMissionRewardOverrides(overrides);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-3">
      <button onClick={handleSave} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold text-sm">
        {saved ? "Saved!" : "Save Mission Rewards"}
      </button>
      <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider">Daily</p>
      {DAILY_MISSION_TEMPLATES.map((m) => (
        <div key={m.id} className="glass-card rounded-xl p-3 flex items-center justify-between gap-2">
          <p className="text-[rgb(var(--text-primary))] text-sm truncate flex-1">{m.title}</p>
          <input
            type="number"
            defaultValue={overrides.dailyRewards[m.id] ?? m.reward}
            onChange={(e) => setOverridesState((prev) => ({ ...prev, dailyRewards: { ...prev.dailyRewards, [m.id]: parseInt(e.target.value, 10) || 0 } }))}
            className="w-20 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-lg px-2 py-1.5 text-[rgb(var(--text-primary))] text-xs outline-none"
          />
        </div>
      ))}
      <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider pt-2">Weekly</p>
      {WEEKLY_MISSION_TEMPLATES.map((m) => (
        <div key={m.id} className="glass-card rounded-xl p-3 flex items-center justify-between gap-2">
          <p className="text-[rgb(var(--text-primary))] text-sm truncate flex-1">{m.title}</p>
          <input
            type="number"
            defaultValue={overrides.weeklyRewards[m.id] ?? m.reward}
            onChange={(e) => setOverridesState((prev) => ({ ...prev, weeklyRewards: { ...prev.weeklyRewards, [m.id]: parseInt(e.target.value, 10) || 0 } }))}
            className="w-20 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-lg px-2 py-1.5 text-[rgb(var(--text-primary))] text-xs outline-none"
          />
        </div>
      ))}
    </div>
  );
}

function RankedTab() {
  const [overrides, setOverridesState] = useState<RankRewardOverrides>({ weeklyRewards: {} });
  const [saved, setSaved] = useState(false);

  useEffect(() => watchRankRewardOverrides((d) => d && setOverridesState(d)), []);

  async function handleSave() {
    await setRankRewardOverrides(overrides);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="space-y-3">
      <button onClick={handleSave} className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[rgb(var(--gold-deep))] to-[rgb(var(--gold))] text-[#0F0F0F] font-semibold text-sm">
        {saved ? "Saved!" : "Save Ranked Rewards"}
      </button>
      <p className="text-[rgb(var(--c4))] text-xs uppercase tracking-wider">Weekly reward per rank tier</p>
      {RANK_CONFIGS.map((r) => (
        <div key={r.tier} className="glass-card rounded-xl p-3 flex items-center justify-between gap-2">
          <p className="text-[rgb(var(--text-primary))] text-sm" style={{ color: r.color }}>{r.tier}</p>
          <input
            type="number"
            defaultValue={overrides.weeklyRewards[r.tier] ?? r.weeklyReward}
            onChange={(e) => setOverridesState((prev) => ({ ...prev, weeklyRewards: { ...prev.weeklyRewards, [r.tier]: parseInt(e.target.value, 10) || 0 } }))}
            className="w-24 bg-[rgb(var(--c2))] border border-[rgb(var(--c3))] rounded-lg px-2 py-1.5 text-[rgb(var(--text-primary))] text-xs outline-none"
          />
        </div>
      ))}
    </div>
  );
}
