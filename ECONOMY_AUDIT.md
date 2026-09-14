# Economy write-path audit

Working document for the server-authoritative economy migration
(MOBILE_APP_PLAN.md §3 P0). This is the complete inventory of client code
that grants or spends value. Nothing moves server-side until every row here
has a decision against it.

Audited September 2026 against `contexts/EconomyContext.tsx`,
`lib/trophyUpdates.ts`, `lib/coinTopups.ts` and `functions/src/index.ts`.

---

## How value is written today

Every economy mutation is a **client-side reducer action**. The reducer
computes the new balance in memory, and a debounced effect then writes the
*entire* state object to Firestore:

```ts
// contexts/EconomyContext.tsx:856
await setDoc(doc(db, 'playerEconomy', user.uid), state, { merge: true });
```

There is no server validation anywhere in this path. The reducer is not a
security boundary — it is a convenience for the UI, and a modified client
can skip it entirely and write the document directly.

A second write immediately follows (lines 861–868), mirroring equipped
cosmetics onto the public `players/{uid}` document so opponents can render
your skins. **This one is legitimate and must survive the lockdown** — it is
the reason `players/{uid}` needs a field-level split rather than a blanket
`write: false`.

---

## Inventory

### Grants coins — must become server-only

| Action | Line | Trigger | Server rule needed |
|---|---|---|---|
| `ADD_COINS` | 275 | Match rewards, top-up credit, admin grants | Caller must prove entitlement; no client-supplied amount |
| `COMPLETE_MISSION` | 320 | Claiming a mission reward | Server checks the mission exists, is complete, and is unclaimed |
| `CLAIM_DAILY_REWARD` | 368 | Daily login streak | Server owns the streak counter and the clock |
| `UNLOCK_ACHIEVEMENT` | 505 | Achievement threshold hit | Server verifies the underlying stat, not the claim |
| `ADD_ROOM_CARD` | 539 | Granted with VIP / rewards | Server-issued only |
| `GRANT_COSMETIC` | 586 | Free grants | Admin/server only |

### Spends coins — must become server-validated

| Action | Line | Server rule needed |
|---|---|---|
| `SPEND_COINS` | 297 | Balance check server-side; client cannot name the amount |
| `PURCHASE_COSMETIC` | 461 | Price from the **server's** catalogue copy, not the request |
| `PURCHASE_ROOM_CARD` | 553 | Same — note this action currently accepts `price` **from the caller** |

`PURCHASE_ROOM_CARD` taking a `price` in its payload is the clearest
illustration of the problem: today a client can buy a room card for zero.

### Time-based state — client currently decides when things expire

| Action | Line | Risk |
|---|---|---|
| `ACTIVATE_VIP` | 427 | Grants VIP plus a 24h room card without any purchase proof |
| `ACTIVATE_ROOM_CARD` | 447 | Consumes a card; client decides whether it was consumed |
| `CHECK_VIP_EXPIRY` | 629 | A modified client simply never expires VIP |
| `CHECK_ROOM_CARDS` | 653 | Same for room cards |

Expiry must be evaluated server-side (or at least never trusted from the
client) — omitting the check is a silent, permanent entitlement.

### Mission re-rolls — conflicts with the scheduled functions

`RESET_DAILY_MISSIONS` (607) and `RESET_WEEKLY_MISSIONS` (618) regenerate
missions **on the client**, while `functions/src/index.ts` also regenerates
them on a schedule. Two writers, no coordination. Beyond the drift, a client
that can re-roll its own missions can re-roll until it draws the highest
reward, then claim repeatedly. Client-side reset must be deleted outright,
not migrated.

### Safe to leave client-side

- `EQUIP_COSMETIC` (485) — changes appearance only, and ownership is
  enforced elsewhere. Still worth a server check that the item is owned.
- `UPDATE_PROGRESS` (528) — no direct value, but it **feeds achievement
  unlocks**, so once achievements are server-verified the server must derive
  progress from real events rather than accept this.
- `SHOW_REWARD` / `CLEAR_REWARD` — pure UI.
- `SET_*_OVERRIDES` — read from admin-controlled `appConfig`, already
  admin-gated in rules.

---

## Outside EconomyContext

**`lib/trophyUpdates.ts:94`** — `updateDoc(playerRef, { trophies:
increment(...), currentRank })` direct from the browser. Leaderboard and
Hall of Fame are forgeable. Task #134.

**`lib/coinTopups.ts` + `CoinTopupWatcher`** — the approval gate is sound in
design (a player cannot approve their own request), but it is decorative
while `playerEconomy` is directly writable. Once the lockdown lands, the
`approved → credited` transition must move into the function; the client
rule permitting that transition should then be removed.

**`functions/src/index.ts`** — already server-side. Note it increments
`profile.coins` only, which is the drift described in task #132.

**Guest mode** (line 844) — guests persist to `localStorage` with no server
document. Their balance is trivially editable, but it is also purely local
and cannot be spent against server-held inventory once the lockdown is in.
Worth confirming guests cannot convert a local balance into a real purchase
at account-upgrade time.

---

## Migration shape

1. One callable function per *entitlement*, not per reducer action. The
   client asks "claim mission X" / "buy item Y"; it never says how many
   coins that is worth.
2. The server keeps its own copy of the shop catalogue and mission table.
   Prices and rewards are looked up there, never accepted from the caller.
3. The reducer stays, but becomes a projection of server state plus
   optimistic UI. On a function error it rolls back.
4. Delete line 856. Keep the `players/{uid}` equipped-cosmetics mirror, but
   narrow it to exactly those two fields.
