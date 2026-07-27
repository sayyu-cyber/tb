# Thaasbai — Build Status
*Generated 2026-07-25 from the actual codebase at github.com/sayyu-cyber/tb (branch `main`, HEAD `d6a7256`) plus uncommitted local changes.*

## What broke, and why

Login on https://thasbai.netlify.app stopped working after "workflow 3." The site's code was never actually broken — commit `d6a7256` is the same working app from workflow 2. What changed was the **live Firestore security rules**, deployed directly from your machine via `firebase deploy` (this bypasses GitHub/Netlify entirely, which is why the deploy history looked clean).

Workflow 3 added a new `firestore.rules` file scoped only to the new economy feature:

```
match /playerEconomy/{uid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

and ran `firebase deploy` (visible in workflow 3.docx around the `firebase.json`/`firestore.rules` setup steps). That overwrote whatever rules existed before. But your login flow (`contexts/AuthContext.tsx`) reads and writes a **different** collection — `players/{uid}` — on every sign-in to fetch/init player stats. Since the new rules never mention `players`, every login now gets a Firestore "permission denied" the instant it tries to load stats, which is what you're seeing as "can't log in."

**Fix applied:** `firestore.rules` in your project folder now allow both collections:

```
match /players/{uid}      { allow read, write: if request.auth != null && request.auth.uid == uid; }
match /playerEconomy/{uid} { allow read, write: if request.auth != null && request.auth.uid == uid; }
```

**This still needs to be deployed** — I can't do this step for you since it requires your own Firebase CLI login. From the `thaasbai` project folder on your machine:

```
firebase deploy --only firestore:rules
```

That's the only step needed to restore login. No GitHub push or Netlify rebuild is required for this specific fix.

## Other things found while investigating

- `contexts/EconomyContext.tsx`, `package.json`/`package-lock.json` (adds `firebase-admin`, `firebase-functions`), `firebase.json`, `.firebaserc`, `firestore.indexes.json`, and `functions/` all exist locally but were **never committed** — they're sitting as uncommitted/untracked changes in your project folder. This is real, correct progress (the Economy context is properly wired to Firestore, game-economy shaped — not the unrelated "budget/transactions" version workflow 3's chat first hallucinated before you course-corrected). Worth committing once you've verified it builds cleanly, so future work isn't at risk of being lost again.
- `functions/` (Cloud Functions for awarding coins server-side) had TypeScript build errors in the workflow 3 transcript (`admin.firestore` typing issues from a `firebase-admin`/`firebase-functions` version mismatch) that don't look fully resolved — check `functions/src/index.ts` before deploying functions.
- Leaderboard (`hooks/useLeaderboard.ts`) is still mock data, not live Firestore — flagged below too.

## Status vs. the GDD roadmap

### Alpha
- Authentication (Google, email, guest) — **Done**, fixed and confirmed working live (2026-07-26).
- Profiles — **Done** (profile page, stats).
- Mindi — **Done** (2026-07-26). Real rules implemented in `lib/mindiEngine.ts` + `components/game/MindiGameClient.tsx`, based on the documented Maldivian "Dihaeh" ruleset (pagat.com/national/maldives.html, research by Alex de Voogt): 4 players in 2 fixed partnerships, 13 cards each, last card dealt sets trump, follow-suit trick-taking, first team to capture 3 of the 4 Tens wins (4 Tens = "baga", all 13 tricks = "hukunbunye"). AI mode = you + 3 bots; Pass & Play = you + a local partner (seats 0 & 2) vs 2 bots, with a "pass the device" screen between turns.
- Gin Rummy — **Done** (2026-07-26). Real rules in `lib/ginRummyEngine.ts` + `components/game/GinRummyGameClient.tsx`: standard 2-player Gin Rummy — 10-card hands, draw/discard, meld detection (sets + runs) via a deadwood-minimizing solver, knock/gin/undercut scoring, lay-off on knock. AI mode = you vs a bot; Pass & Play = 2 local players with a pass-the-device screen. Verified with a 500-hand bot-vs-bot simulation (deck integrity, legal moves, no negative scores, no infinite loops) before shipping.
- Casual mode — **Done** for both games now (real Mindi + real Gin Rummy, AI and Pass & Play). The old placeholder mini-game and its components have been removed.

### Beta
- Ranked mode — **Done** (2026-07-26), with one accepted trade-off. Real matchmaking (`lib/matchmaking.ts`) pairs real waiting players via a Firestore queue + transaction (2 for Gin Rummy, 4 for Mindi), then plays out live on a shared match document synced via `MindiOnlineClient`/`GinRummyOnlineClient`. **Trade-off:** there's no game server — match state lives in a Firestore doc both players can read, so a technically savvy opponent could inspect raw network data to see your hand even though the UI never shows it. Hardening this needs Cloud Functions to hold hands server-side (bigger project, deliberately deferred). There's also a small accepted race: if two matches try to form from overlapping queued players at the same instant, one player can end up briefly double-booked. Both are documented at the top of `lib/matchmaking.ts`. **Not yet tested with real multiple accounts** - I verified the code compiles and lints clean, but this needs an actual two/four-account live test, which I can't do from here.
- Trophies — **Done**.
- Leaderboards — **Done** (2026-07-26). Real Firestore query, ordered by trophies, confirmed working live.

### Version 1.0
- Weekend League — **Done** (2026-07-27), core flow. Friday-Saturday lock window (`hooks/useRankLock.ts`, fixed a bug where the "is Weekend League" flag was never true) now routes Silver+ players into a separate "weekend" matchmaking pool (`lib/matchmaking.ts`) instead of closing Ranked outright; sub-Silver players see a clear "keep climbing" message instead of a dead end. Wins/losses during Weekend League matches count double toward each player's `weeklyTrophies` (`lib/trophyUpdates.ts`), which resets lazily per-player at the start of their first match each week — no scheduled job needed. Live standings for the week are available via `lib/weekendLeague.ts` (`getWeeklyStandings`), but **not yet surfaced on any screen** — that's the one piece left before this is fully done end-to-end; worth a small leaderboard-style page next. **Known gap**, documented in the file: no scheduled job snapshots the bracket or crowns a permanent "Weekend Champion" at the exact end of the window; standings are a live proxy instead. No new Firestore rules needed (reuses the existing `matches`/`matchmakingQueue` collections). Not yet tested live with real qualified accounts.
- Friends — **Done** (2026-07-26), core flow. `lib/friends.ts` + `app/friends`: search players by username, send/accept/decline/cancel requests, friends list, and a "room invite" notification that lets a friend jump straight into a private room together. Not yet done: a dedicated public profile page for viewing another player's stats/rank (tapping a friend doesn't open anything yet), and match history. Home screen's "Friends"/"Private Rooms"/"Cosmetic Shop" placeholder cards now link to the real features; Weekend Tournament and VIP Pass are still genuinely not built, so left as "Coming Soon".
- Rooms — **Done** (2026-07-26). Real private rooms in `lib/rooms.ts` + `components/game/RoomLobbyClient.tsx`: create a room (optional password), share the 6-character code, friends join by code, owner can kick, and starting the match hands off to the exact same live match system Ranked mode uses. Reachable from the game select card's new "Private Room" button. Same no-server-authority trust model as matchmaking (documented in the file). Not yet tested with real multiple accounts. Note: `app/room-cards` / `components/roomcards/RoomCardManager.tsx` is a *different, unrelated* feature despite the similar name - it's a consumable economy entitlement ("Room Card" item that unlocks unlimited private rooms for a time window), not the room system itself. The two aren't currently wired together (room creation isn't gated by owning a Room Card yet) - worth deciding whether that gating should exist.
- VIP — **Partial**. VIP UI components exist and are wired into the Economy context; real payment/subscription flow not present.
- Shop — **Done** UI + coin-spending logic wired to Economy context; real-money purchases not implemented (coins only).

### Version 1.5
- Collections — **Done** UI (`app/collection`).
- Achievements — **Done** UI (`app/achievements`), tied to Economy context.
- Hall of Fame — **Done** (2026-07-27). New `/hall-of-fame` page (linked from Home) shows an all-time "best ever" list. Ranked by a new `peakTrophies` field (`lib/trophyUpdates.ts`) that only ever increases, rather than current trophies (which drop after a loss) - so a player's Hall of Fame placement can't be lost by a bad week, only improved. Reuses the same no-scheduled-job pattern as Weekend League: no Cloud Function needed, just a live Firestore query ordered by `peakTrophies`. Note: players who haven't played a match since this field was added will show with 0 peak trophies until their next match recalculates it - a one-time backfill gap that resolves itself as people keep playing.
- Seasonal cosmetics — **Partial**. Cosmetic data model supports it (`data/cosmetics.ts`); no season-rotation logic found.

### Version 2.0
- Clubs — **Pending**.
- Spectator mode — **Pending**.
- New card games — **Pending** (only Mindi + Gin Rummy exist).

## Suggested next steps
1. Run `firebase deploy --only firestore:rules` to restore login.
2. Verify the app builds cleanly (`npm run build`) with the uncommitted Economy/Firebase changes, then commit and push so this progress is safe.
3. Decide priority for the next chunk of work — likely candidates: real Firestore-backed leaderboard, real player-vs-player matchmaking, or Friends/Rooms backend.
