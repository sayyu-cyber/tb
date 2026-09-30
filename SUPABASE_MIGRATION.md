# Thaasbai Firebase to Supabase Migration

Status: Supabase Auth import and runtime cutover are complete. Firebase runtime code, packages, config, and Functions have been removed from the app workspace.

## Current Architecture

- Framework: Next.js 14 with App Router.
- Rendering/deployment: static export via `next.config.js` (`output: "export"`) and Netlify (`netlify.toml` uses `npm run build`, `publish = "out"`, `@netlify/plugin-nextjs`).
- Runtime pin: Node 22 in `.nvmrc` and `netlify.toml`, updated because the current Supabase JS dependency stack declares Node 22+ engines.
- Routes: App Router pages under `app/`; no `app/**/route.ts` API routes were found.
- Middleware: no root `middleware.ts`/`middleware.js` was found.
- Server components: route/layout files are server components by default unless their child client components opt in. Firebase access is concentrated in client contexts/hooks/libs and Firebase Functions.
- Client components: auth, economy, game, social, and realtime UI use client-side Firebase SDK.
- Netlify Functions: none found.
- Firebase Functions: `functions/src/*` contains scheduled and callable backend logic.
- Firebase project id discovered from `.firebaserc`: `thaasbai-95533`.

## Firebase Files

Core Firebase configuration:

- `lib/firebase.ts`
- `.firebaserc`
- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`

Client Firebase consumers:

- `contexts/AuthContext.tsx`
- `contexts/EconomyContext.tsx`
- `lib/admin.ts`
- `lib/clubs.ts`
- `lib/coinTopups.ts`
- `lib/friends.ts`
- `lib/hallOfFame.ts`
- `lib/matchmaking.ts`
- `lib/messages.ts`
- `lib/moderation.ts`
- `lib/presence.ts`
- `lib/profileHistory.ts`
- `lib/publicProfile.ts`
- `lib/rooms.ts`
- `lib/trophyUpdates.ts`
- `lib/weekendLeague.ts`
- `hooks/useLeaderboard.ts`
- `app/(main)/profile/page.tsx`
- test/build mocks under `scripts/*auth*`, `scripts/*services*`, and UI check scripts

Firebase Admin / Functions:

- `functions/src/admin.ts`
- `functions/src/economy.ts`
- `functions/src/index.ts`
- `functions/package.json`
- `functions/package-lock.json`

Dependency manifests:

- `package.json`
- `package-lock.json`

Supabase foundation:

- `lib/supabase/client.ts`
- `lib/supabase/auth.ts`
- `lib/supabase/database.types.ts`
- `@supabase/supabase-js`

## Firebase Services Currently Used

- Firebase Authentication: Google popup, email/password sign-in, email/password sign-up, anonymous guest sign-in, logout, auth profile update, auth state listener.
- Firestore: primary application database.
- Firestore realtime listeners: auth profile, economy, matchmaking, rooms, friends, DMs, clubs, moderation, admin config, top-ups, manual Hall of Fame, presence reads.
- Firebase Cloud Messaging: `lib/firebase.ts` initializes messaging and can request an FCM token, but the privacy page notes this is not currently called.
- Firebase Cloud Functions: scheduled mission/rank jobs and callable economy functions.
- Firebase Admin SDK: Firestore Admin client in functions.
- Firebase Storage: no active `firebase/storage` upload/download code found. `storageBucket` is configured, `firebasestorage.googleapis.com` is allowed as an image domain, and static assets are mostly in `public/`.
- Firebase Realtime Database: no active usage found.

## Environment Variables

Values were not copied. These variable names exist in `.env.local` and `.env.local.example`:

- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_VAPID_KEY`

Additional non-Firebase environment usage:

- `NEXT_PUBLIC_SITE_URL`
- `THAASBAI_BUILD_DIR`

Supabase environment variables added locally:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

`.gitignore` ignores `.env`, `.env.local`, `.env.*.local`, `.netlify/`, `node_modules/`, Next build folders, Firebase Functions build output, and TypeScript build info.

## Existing Firestore Collections and Shapes

### `players/{uid}`

Used for public profile, stats, leaderboard, ranks, presence heartbeat, equipped cosmetics, player code lookup, and profile customization.

Observed fields include:

- `displayName`
- `photoURL`
- `playerCode`
- `totalMatches`
- `wins`
- `losses`
- `winPercentage`
- `favoriteGame`
- `trophies`
- `weeklyTrophies`
- `weekStart`
- `currentRank`
- `highestRank`
- `peakTrophies`
- `avatarPreset`
- `bannerPreset`
- `equippedCardBack`
- `equippedTableTheme`
- `lastSeen`
- `createdAt`
- `updatedAt`

### `playerEconomy/{uid}`

Large per-user economy/state document managed by `EconomyContext`.

Observed nested areas:

- `profile`: display name, avatar/title, VIP, equipped cosmetics, collection arrays, achievements, room cards, login streak.
- `economy`: canonical `coins`, transaction history, `totalEarned`, `totalSpent`, `schemaVersion`.
- `missions`: daily/weekly missions and reset timestamps.
- `achievements`
- `dailyLogin`
- `weeklyRankReward`
- migration-era legacy `profile.coins`

### `matchmakingQueue/{uid}`

Temporary queue entries:

- `uid`
- `gameType`
- `pool`
- `partyId`
- `queuedAt`

### `matches/{matchId}`

Live and completed match documents:

- `gameType`
- `pool`
- `players`
- `status`
- `createdAt`
- `state`

Important risk: source comments explicitly say the whole match state is readable by signed-in users, so hidden card data can be inspected through raw payloads. Supabase migration should split shared match state from per-player private state.

### `rooms/{code}`

Private room lobby:

- `code`
- `gameType`
- `ownerUid`
- `password`
- `maxPlayers`
- `players`
- `playerNames`
- `status`
- `matchId`
- `createdAt`
- `mode`
- `bannedUids`
- `mindiMode`
- `seatOrder`

### `friendRequests/{requestId}`

Friendship and request state:

- `from`
- `fromName`
- `to`
- `toName`
- `status`
- `createdAt`

### `roomInvites/{inviteId}`

Lightweight room invite notifications:

- `from`
- `fromName`
- `to`
- `code`
- `gameType`
- `createdAt`

### `dmConversations/{conversationId}`

Direct message conversation:

- `participants`
- `participantNames`
- `lastMessage`
- `lastMessageAt`
- `lastSenderUid`
- `lastReadAt`

Subcollection:

- `dmConversations/{conversationId}/messages/{messageId}`
- fields: `senderUid`, `text`, `createdAt`

### `clubs/{clubId}`

Club/guild data:

- `name`
- `tag`
- `description`
- `ownerUid`
- `members`
- `memberNames`
- `memberTrophies`
- `createdAt`

Subcollection:

- `clubs/{clubId}/messages/{messageId}`
- fields: `senderUid`, `senderName`, `text`, `createdAt`

### `userBlocks/{uid}`

Moderation block list:

- `blocked`
- `updatedAt`

### `reports/{reportId}`

Abuse reports:

- `reporterUid`
- `reporterName`
- `targetUid`
- `targetName`
- `reason`
- `context`
- `evidence`
- `details`
- `status`
- `createdAt`
- `resolvedAt`
- `resolvedBy`

### `coinTopupRequests/{requestId}`

Coin purchase/top-up approval queue:

- `uid`
- `playerName`
- `coins`
- `priceMVR`
- `packName`
- `status`
- `createdAt`
- `decidedAt`
- `creditedAt`

### `appConfig/{docId}`

Admin-configured documents:

- `season`
- `shopOverrides`
- `missionRewards`
- `rankRewards`

### `hallOfFameManual/{entryId}`

Manual Hall of Fame entries:

- `displayName`
- `peakTrophies`
- `note`
- `addedAt`

## Existing Firebase Authentication Methods

- Google sign-in through `GoogleAuthProvider` + `signInWithPopup`.
- Email/password sign-in through `signInWithEmailAndPassword`.
- Email/password sign-up through `createUserWithEmailAndPassword`, then `updateProfile`.
- Anonymous auth through `signInAnonymously`.
- Session watching through `onAuthStateChanged`.
- Logout through `signOut`.

## Existing Realtime Features

Firestore listeners currently power:

- Signed-in user profile document (`players/{uid}`).
- Economy sync (`playerEconomy/{uid}`).
- Match discovery and match state (`matchmakingQueue`, `matches`).
- Private room lobbies (`rooms`).
- Incoming/outgoing friend requests and friend list (`friendRequests`).
- Room invites (`roomInvites`).
- DM conversations and message logs (`dmConversations`, nested `messages`).
- Club list, membership, and club chat (`clubs`, nested `messages`).
- Manual Hall of Fame entries.
- Admin config (`appConfig`).
- Coin top-up requests.
- User block lists and open abuse reports.

Presence is not Firebase Realtime Database Presence. It is an approximate Firestore heartbeat that updates `players/{uid}.lastSeen` every 45 seconds while visible; online means `lastSeen` is newer than 90 seconds.

## Existing Storage Usage

- No active Firebase Storage SDK usage was found.
- Static assets live under `public/`.
- `next.config.js` allows `firebasestorage.googleapis.com`, suggesting existing profile/image URLs might point at Firebase Storage or Google-hosted images.
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` is configured but not actively used in source.

Migration decision:

- Keep static game/UI assets in `public/` and Netlify CDN.
- Use Supabase Storage later only for true user-generated assets such as uploaded avatars or club logos if/when the app implements uploads.

## Existing Cloud Functions and Backend Logic

Firebase scheduled functions:

- `dailyMissionReset`: resets daily missions on `playerEconomy`.
- `weeklyMissionReset`: resets weekly missions on `playerEconomy`.
- `weeklyRankRewards`: scheduled weekly rank payout. Source warns not to deploy until the client-side weekly-rank reward path is removed, or players can be paid twice.

Firebase callable functions:

- `purchaseCosmetic`: validates catalogue price and spends coins in a Firestore transaction.
- `purchaseRoomCard`: validates room-card price and spends coins in a Firestore transaction.
- `creditTopup`: validates approved top-up and credits coins atomically.

Firebase Admin:

- `functions/src/admin.ts` initializes Admin SDK and exports Firestore admin `db`.

## Current Security Rules

`firestore.rules` controls:

- hardcoded admin email allowlist: `sayyu9898@gmail.com`
- owner-only profile/economy writes
- signed-in public reads for player/leaderboard-style data
- direct-message participant access
- database-level DM block enforcement
- admin-only report reads/resolution
- top-up approval flow
- room, friend, invite, club, and club-chat access

Important migration note: several current rules intentionally allow broad signed-in reads. Supabase RLS should narrow private/competitive data where possible, especially match hands and economy writes.

## Features That Depend on Firebase

- Login, logout, profile creation, profile editing, guest sessions.
- Public profiles, leaderboard, Hall of Fame, Weekend League standings.
- Ranked/casual matchmaking and private rooms.
- Mindi and Gin Rummy online match state.
- Spectator mode.
- Friends, player search, recent players, invites.
- Direct messages and unread indicators.
- Clubs and club chat.
- Moderation: blocks and abuse reports.
- Economy: wallets, transactions, cosmetics, missions, achievements, daily login, VIP, room cards, coin top-ups.
- Admin panel: season/shop/mission/rank overrides, top-up approvals, reports, manual Hall of Fame.
- Presence/online friend indicators.
- FCM token helper, although it appears unused.

## Migration Risks

- Hidden-information games currently store full match state in a shared readable document. Supabase design must enforce hand privacy at the database/server level.
- Many important writes still happen from the browser: trophies, match completion, daily rewards, mission rewards, and some economy state. These should move to trusted RPC/functions.
- `playerEconomy/{uid}` is a large Firestore-style document. Copying it as a JSON blob would be fastest but would keep weak relational boundaries. A normalized wallet/inventory/mission schema is safer.
- Firestore array fields (`players`, `members`, `participants`, owned cosmetics) need relational join tables or carefully indexed Postgres arrays.
- Firestore listeners need deliberate Supabase replacements: database changes for durable state, Realtime Broadcast for ephemeral table events, Presence for online status.
- Current Next app is static export, so server-side Supabase client usage inside Next routes is limited unless Netlify Functions or Supabase Edge Functions are added.
- Firebase Functions currently contain important transactional logic. Migration should choose between Postgres RPC and Supabase Edge Functions, not move trusted logic back to the browser.
- Anonymous users in Firebase may not map cleanly to Supabase anonymous users and may need a policy decision.
- Existing Firebase users may be real users. Auth migration strategy depends on whether they are production accounts.
- Current Firebase users are real users; do not start Supabase Auth clean or force password resets unless explicitly chosen later.
- Firebase Auth currently has about 12 users.
- Firebase Auth providers present: Google and email/password.
- Firebase password hash algorithm is `SCRYPT`, which is compatible with the documented migration path.
- Current Netlify `publish = "out"` and static export must be preserved unless we intentionally introduce Netlify Functions for server-only operations.

## Firebase to Supabase Replacement Map

| Firebase component | Current use | Supabase target |
| --- | --- | --- |
| Firebase Auth | Google, email/password, anonymous sessions | Supabase Auth with Google, email/password, and optional anonymous sign-ins |
| `players` | public profile, stats, ranking, presence timestamps | `profiles`, `player_stats`, `ranked_progress`, plus Realtime Presence for online state |
| `playerEconomy` | wallet, missions, cosmetics, VIP, room cards | `wallets`, `coin_transactions`, `inventories`, `inventory_items`, `user_missions`, `user_achievements`, `daily_rewards`, `vip_entitlements`, `room_cards` |
| `matchmakingQueue` | queue docs | `matchmaking_queue` table plus RPC `join_queue` / `try_form_match` |
| `matches` | live and historical match state | `matches`, `match_players`, `match_events`, `match_results`, and `player_private_match_state` |
| `rooms` | private lobbies | `game_rooms`, `room_players`, optional `room_bans` |
| `friendRequests` | pending and accepted friendships | `friend_requests` plus `friendships` view/table |
| `roomInvites` | room invite notifications | `notifications` or `room_invites` |
| `dmConversations/messages` | direct messages | `chat_rooms`, `chat_participants`, `messages`, RLS participant policies |
| `clubs/messages` | clubs and club chat | `clubs`, `club_members`, `club_messages` |
| `userBlocks` | block lists | `blocks` |
| `reports` | abuse reports | `reports`, admin-only RLS |
| `coinTopupRequests` | top-up approval and crediting | `coin_topup_requests` plus RPC `credit_topup` |
| `appConfig` | admin overrides | `app_config` or typed config tables |
| `hallOfFameManual` | manual records | `hall_of_fame_manual` |
| Firestore rules | database security | Supabase RLS policies and trusted RPC |
| Firebase callable economy functions | purchases/top-up crediting | Postgres RPC for atomic balance changes, possibly Supabase Edge Functions for complex validation |
| Firebase scheduled functions | mission reset/rank payout | Supabase scheduled Edge Functions, Postgres cron if enabled, or Netlify scheduled functions |
| Firestore heartbeat presence | approximate online status | Supabase Realtime Presence |
| FCM helper | unused token request | defer; evaluate Supabase/FCM push strategy separately |
| Firebase Storage | no active SDK usage | defer; Supabase Storage only for user-generated uploads |

## Proposed Supabase Schema Direction

Start with only what the repository actually uses:

- `profiles`: public display name, avatar/banner presets, player code, photo URL.
- `player_stats`: wins, losses, total matches, favorite game, win percentage, peak trophies.
- `ranked_progress`: trophies, current rank, highest rank, weekly trophies, week key.
- `wallets`: one row per user with current coin balance.
- `coin_transactions`: immutable ledger.
- `inventories`: owned cosmetics and room cards, likely normalized into item rows.
- `user_missions`, `user_achievements`, `daily_rewards`: per-user progression and claim state.
- `game_rooms`, `room_players`, `room_bans`.
- `matches`, `match_players`, `match_results`, `match_events`, `player_private_match_state`.
- `matchmaking_queue`.
- `friend_requests`.
- `room_invites` or `notifications`.
- `chat_rooms`, `chat_participants`, `messages`.
- `clubs`, `club_members`, `club_messages`.
- `blocks`.
- `reports`.
- `app_config`.
- `hall_of_fame_manual`.

Do not create tournament tables yet unless the existing tournament page proves it stores durable Firebase data; current audit found Weekend League standings but no Firebase tournament bracket collections.

## RLS Design Notes

- Use `auth.users.id` as canonical user id and foreign key `public.profiles.id`.
- Enable RLS on all user-facing tables.
- Public profile fields can be readable by authenticated users; email remains in Supabase Auth, not public tables.
- Wallet balances are readable only by the owner and admins. Updates should be blocked from normal clients and performed by RPC/security-definer functions.
- Trophy/rank/stat updates should be trusted server logic only.
- Match data must separate public table state from per-player private cards/hands.
- Chat messages should be readable only by participants/members.
- Blocks must be enforced by database policies or trusted send-message RPC, not only UI filtering.
- Admin status should move away from hardcoded frontend email checks toward a server-side role/claim/table checked by RLS.

## Migration Checklist

- [x] Phase 1: Audit Firebase usage.
- [x] Phase 2: Create Supabase project.
- [x] Phase 3: Configure Supabase Auth providers and URLs.
- [x] Phase 4: Add Supabase environment variables locally and in Netlify.
- [x] Phase 5: Add Supabase client package and dual-backend client architecture.
- [x] Phase 6: Design PostgreSQL schema from actual Firestore collections.
- [x] Phase 7: Create schema migrations and generated TypeScript types.
- [~] Phase 8: Create RLS policies.
- [x] Phase 9: Migrate authentication adapter to Supabase Auth.
- [ ] Phase 10: Migrate profiles and public player data.
- [ ] Phase 11: Migrate presence to Supabase Realtime Presence.
- [ ] Phase 12: Migrate friends, invites, blocks, and reports.
- [ ] Phase 13: Migrate direct messages and club chat.
- [ ] Phase 14: Migrate clubs.
- [ ] Phase 15: Migrate game rooms and room players.
- [ ] Phase 16: Migrate matchmaking.
- [ ] Phase 17: Redesign match storage for server-authoritative Mindi and Gin Rummy.
- [ ] Phase 18: Migrate match history, results, and leaderboards.
- [ ] Phase 19: Migrate economy wallet, transactions, shop, inventory, VIP, and room cards.
- [ ] Phase 20: Migrate missions, achievements, daily rewards, and weekly rank rewards.
- [ ] Phase 21: Decide whether any Storage migration is needed.
- [ ] Phase 22: Replace Firebase Functions with Supabase RPC/Edge Functions or Netlify Functions.
- [ ] Phase 23: Configure Netlify production variables.
- [ ] Phase 24: Test local auth, data, realtime, multiplayer, economy, and production build.
- [ ] Phase 25: Deploy to Netlify and test production OAuth/realtime.
- [ ] Phase 26: Remove Firebase code and packages only after Supabase is verified and rollback is no longer required.

## Test Checklist Draft

- [ ] Google login.
- [ ] Email/password login.
- [ ] Email/password signup.
- [ ] Guest/anonymous session decision verified.
- [ ] Logout.
- [ ] Session persists after refresh.
- [ ] New profile is created.
- [ ] Existing profile loads.
- [ ] Profile edits save.
- [ ] Presence/online indicator works.
- [ ] Friend search by name and player code.
- [ ] Send, accept, decline, cancel, and remove friend.
- [ ] Block user prevents DMs.
- [ ] Report user creates admin-visible report.
- [ ] Direct message send/read/unread states.
- [ ] Club create/join/leave/kick and club chat.
- [ ] Private room create/join/password/full/kick/ban/start/leave/reconnect.
- [ ] Ranked queue creates valid matches.
- [ ] Casual queue creates valid matches.
- [ ] Mindi legal moves, trick scoring, result save, hidden-hand privacy.
- [ ] Gin Rummy draw/discard/gin/knock/scoring, hidden-hand privacy.
- [ ] Spectator mode respects allowed visibility.
- [ ] Trophy changes are server-authoritative.
- [ ] Leaderboard weekly/all-time/friends views.
- [ ] Weekend League standings.
- [ ] Wallet reads and cannot be client-edited.
- [ ] Cosmetic purchase is atomic and idempotent.
- [ ] Room-card purchase is atomic.
- [ ] Daily reward cannot be double-claimed.
- [ ] Mission reward cannot be forged.
- [ ] Top-up approval and crediting cannot double-credit.
- [ ] Admin config reads/writes are admin-only.
- [ ] Netlify build succeeds.
- [ ] Netlify environment variables work.
- [ ] Production OAuth callback works.
- [ ] Firebase rollback path remains available until final removal.

## Manual Configuration Log

- Supabase project created.
- Public frontend Supabase values received.
- Local `.env.local` now includes `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `.nvmrc` and `netlify.toml` now pin Node 22 for current Supabase SDK compatibility.
- Supabase Auth URL Configuration completed with production URL `https://tsbai.netlify.app/`.
- Supabase Auth redirect URLs added for localhost and `https://tsbai.netlify.app/**`.
- No custom production domain exists yet.
- Google provider enabled in Supabase.
- Supabase OAuth callback URL added in Google Cloud.
- Netlify environment variables added for all scopes:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Initial local SQL migration created at `supabase/migrations/202609300001_initial_core_schema.sql`.
- Initial SQL migration applied successfully in Supabase SQL Editor.
- Initial non-invasive Supabase auth adapter added at `lib/supabase/auth.ts`; live UI remains on Firebase Auth until a deliberate feature switch.
- Supabase Email provider enabled.
- Supabase anonymous sign-ins enabled for the existing guest flow.
- Local Supabase database types added at `lib/supabase/database.types.ts` and wired into the Supabase client.
- Auth migration mapping migration added at `supabase/migrations/202609300002_auth_migration_mapping.sql`.
- Auth migration mapping migration applied successfully in Supabase SQL Editor.
- Auth migration workspace notes added at `supabase/auth-migration/README.md`.
- Safe placeholder templates added:
  - `supabase/auth-migration/supabase-service.example.json`
  - `supabase/auth-migration/hash-parameters.example.txt`
- Local secret files created and structurally validated:
  - `supabase/auth-migration/secrets/firebase-service.json`
  - `supabase/auth-migration/secrets/hash-parameters.txt`
  - `supabase/auth-migration/secrets/supabase-service.json`
- Firebase Auth users confirmed to be real users; auth migration must preserve accounts and avoid invalidating Firebase sessions prematurely.
- Firebase Auth export completed into ignored local file `supabase/auth-migration/exports/users.json`.
- Export validation completed:
  - 12 users total.
  - 6 Google users.
  - 6 email/password users.
  - 6 email/password users with Firebase SCRYPT password hashes.
- Supabase Auth import dry-run passed with `auth.users` empty.
- Supabase Auth import completed successfully using the local importer:
  - 12 rows in `auth.users`.
  - 12 rows in `auth.identities`.
  - 12 rows in `public.auth_migration_map`.
  - 12 generated profiles updated with `legacy_firebase_uid`.
  - 6 Firebase SCRYPT passwords stored in Supabase Auth.
- Importer was adjusted for generated Supabase Auth columns:
  - `auth.users.confirmed_at` is derived by Supabase and is not inserted directly.
  - `auth.identities.email` is derived by Supabase and is not inserted directly.
- Runtime cutover completed:
  - Firebase frontend packages removed from `package.json` and `package-lock.json`.
  - `lib/firebase.ts`, Firebase hosting config, Firestore rules/indexes, `.firebaserc`, and Firebase Functions folder removed.
  - Auth, profile, presence, friends, DMs, clubs, rooms, matchmaking, moderation, top-ups, leaderboards, Hall of Fame, profile history, trophies, and admin config now use Supabase modules/tables.
  - `.env.local.example` and local `.env.local` no longer carry `NEXT_PUBLIC_FIREBASE_*` variables.
  - `supabase/migrations/202609300003_presence_last_seen.sql` applied successfully to add `profiles.last_seen`.

## First Manual Action Required

MANUAL STEP REQUIRED

Where:
Firebase Console and Supabase Dashboard

What to do:

1. In this repo, create this local folder if it does not already exist:
   - `supabase/auth-migration/secrets/`
2. In Firebase Console, open `Project Settings` -> `Service accounts` -> `Firebase Admin SDK`.
3. Click `Generate new private key`.
4. Save the downloaded JSON locally as:
   - `supabase/auth-migration/secrets/firebase-service.json`
5. In Firebase Console, open `Authentication` -> `Users` -> three-dot menu -> `Password hash parameters`.
6. Copy the hash parameter block and save it locally as:
   - `supabase/auth-migration/secrets/hash-parameters.txt`
7. In Supabase, open the project dashboard and click `Connect`.
8. Find the Session Pooler connection parameters.
9. Create this local file from `supabase/auth-migration/supabase-service.example.json`:
   - `supabase/auth-migration/secrets/supabase-service.json`
10. Fill it with the Session Pooler `host`, `user`, `database`, `port`, and your Supabase database password.

What this is used for:

- These local-only files are required by Supabase's Firebase Auth migration tooling.
- They contain secrets and must not be committed or pasted into chat.
- `.gitignore` excludes these paths.

What I need afterward:

- Confirm the three local files exist:
  - `supabase/auth-migration/secrets/firebase-service.json`
  - `supabase/auth-migration/secrets/hash-parameters.txt`
  - `supabase/auth-migration/secrets/supabase-service.json`
- Do not send their contents.

Do not send:

- Database password.
- service_role key.
- JWT secret.
- OAuth client secret.

SAFE PUBLIC VARIABLES we will add later:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

SERVER-ONLY SECRET VARIABLES for later, if needed:

- Supabase secret key, or legacy service-role key if the project only exposes legacy keys. This must stay only in Netlify/Supabase/Edge/Function server environments and must never be prefixed with `NEXT_PUBLIC_`.

## Rollback Notes

- Firebase implementation has not been removed.
- Firebase packages and environment variables remain in place.
- During migration, the target architecture is dual-backend: Firebase and Supabase side by side.
- Do not delete Firebase data, disable Firebase Auth, or remove Firebase project resources until every Supabase path has been implemented, tested locally, tested on Netlify, and explicitly approved for Firebase removal.
