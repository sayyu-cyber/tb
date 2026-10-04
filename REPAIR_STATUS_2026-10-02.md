# Thaasbai repair checkpoint

This records the repair of the findings in `AUDIT_2026-10-01.md`. It is not a claim
that every audit finding is resolved or that the changes are deployed.

Last continued: October 3, 2026.

## Implemented locally

- Match commands run the existing Mindi/Gin engines in a trusted Edge Function.
  Browsers submit moves and expected revisions, not replacement states/results.
  Opponent hands and Gin stock remain private during play. Either participant can
  request an expired turn; server time and a revision lock decide the transition.
- Verified match settlement updates history, stats, trophies, wallet and play/win
  missions in one transaction. Replayed results and direct browser reward grants
  are rejected. Legacy post-match URL parameters cannot award trophies.
- Social commands enforce friendship consent, membership, blocks, room invites,
  club capacity and ownership transfer. Latest-message queries have older-page
  service support. Guest restrictions are enforced at command boundaries, not
  solely by hiding controls.
- DM and club chat expose older pages with scroll anchoring and duplicate
  suppression. Account/thread changes discard pending history/send results;
  lost access clears loaded history and subscriptions. Phone Back returns to
  conversations and restores phone chrome, which is hidden during full chat.
- Room passwords move out of readable room rows into private salted hashes.
  Join/start/seat/leave operations validate the caller and run transactionally.
  Consumed room cards cannot be reactivated after expiry.
- Economy snapshots restore server-owned inventory, equipment, missions, room
  cards, achievements and VIP state. Unsupported paid VIP activation is disabled;
  verified purchase/restore/refund integration is not implemented by this repair.
- Achievement and rank-mission progress is derived from verified results,
  protected rank data and usable inventory. Snapshot reads avoid redundant
  progression writes. Weekly payouts/champion awards still require a finalizer.
- Phone Mindi and Gin now display rejected-command errors without advancing the
  hand or losing selection. Desktop and phone online command checks pass.
- Account-switch races, confirmation/recovery states, guest account upgrades,
  blocked browser storage, and sheet keyboard focus handling have focused fixes.
- Leaderboards filter/order before limiting; period logic uses UTC counters and
  the existing Maldives league schedule. Public cosmetic reads use a narrow RPC.
- Static-export preview and source-usage inspection scripts work again.
- Friends profile reads are deduplicated and batched in groups of 100. A list of
  250 incoming requests makes three profile reads instead of 250. Empty lists
  skip subscriptions; unrelated profile/rank events skip snapshot reloads.
- Removed two reviewed, unreferenced legacy components: `WeeklyRankReward`
  (obsolete client-issued rewards) and `DailyMatchCounter` (hardcoded limits).
  Other source-usage candidates remain for individual review.
- Added a Node 22 core integrity runner and read-only GitHub Actions workflow.
  The workflow runs static checks/builds and a separate guarded disposable SQL
  job. Coverage and setup are documented in `docs/INTEGRITY_CHECKS.md`; no
  workflow has been pushed or executed on GitHub by this repair.

## Deployment is a separate, coordinated operation

No production migration, Edge Function deployment, push, or store submission has
been performed. Do not deploy only the frontend: it now depends on the new RPCs
and the `match-command` function. A missing/incompatible backend fails closed.

1. Review all SQL migrations after `202609300006`, including any subsequent
   verified-progression migration, against a staging copy of the current schema.
   Back up and verify recovery before any production rollout.
2. Preflight historical data. Migration 007 intentionally fails on duplicate DM
   keys; reconcile those records without discarding messages. Previously
   client-created rewards/inventory are not automatically certified as earned.
3. Plan a maintenance window and drain active matches. Migration 009 abandons
   legacy active matches and removes hidden hands/stock from public historical
   state. This is intentional: already-exposed hands cannot be made fair again.
4. Build the trusted bundle with `npm run build:match-server`. Source lives in
   `server/`; `supabase/functions/match-command/index.js` is generated output.
5. Configure staging function secrets: `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, and comma-separated `GAME_ALLOWED_ORIGINS`
   containing exact allowed origins. Never put the service key in a
   `NEXT_PUBLIC_*` variable or the web bundle. Empty origins reject browser calls.
   The function config disables the gateway JWT check because the handler
   validates every bearer token against Auth's `/user` endpoint itself; removing
   that validation would be a security regression.
6. Apply the migrations and deploy the function to staging using the project's
   normal reviewed release process. Confirm auth email redirect allowlists and
   templates for `/confirm-email` and `/reset-password`, including guest upgrades.
7. Run real multi-account staging sessions: casual, ranked/duo, private rooms,
   reconnect/timeouts, rewards after reload, purchases with earned currency,
   friendship/DM/blocking and account recovery. SQL and mocked browser tests do
   not replace this gate. Check functions logs and request latency.
8. Build the static frontend, then deploy backend and frontend as one controlled
   release during maintenance. Old clients must refresh. Do not roll back to the
   old permissive policies to restore compatibility; keep maintenance active and
   fix forward or restore a coordinated, reviewed backup.

## Remaining release work

- A trusted period finalizer for weekly rank rewards and Weekend Champion awards.
- All-participants-offline match cleanup: one connected participant can advance
  timeouts, but there is no scheduled background expiry worker yet.
- Real billing and entitlement verification, restore/refund support, account
  deletion, native projects/signing, store accounts and real-device checks.
- Dependency vulnerability remediation, portable browser-test dependencies, generated
  Supabase schema types and the full authenticated staging integration matrix.
- Full localization/screen-reader coverage,
  route CSS/performance budgets and reviewed dead-code removal.
- Historical entitlement reconciliation and rollout monitoring. Existing data
  must not be deleted or marked verified merely to make a test pass.

## Verification record

Completed before this checkpoint: `npm run verify`, `npm run build` (50 static
pages), `npm run test:rules`, `npm run build:match-server`, and focused auth,
economy, social, query/calendar, tooling, matchmaking and post-match tests.
Chromium's exported-app guest test passes on the isolated port-3018 preview.
Four existing image optimization lint warnings and nonfatal webpack cache
snapshot warnings remain.

All 11 migrations passed the full disposable PostgreSQL chain, including social,
economy, room access, verified progression, match authority, concurrent revision
conflicts and exactly-once settlement tests. The scratch database was removed.
No production records are used by the database harness.

The exported-app online authority check passed all 30 assertions at 1440x900 and
844x390 for both Mindi and Gin: private hands, opponent counts, rejected moves,
card play/draw/discard, refresh recovery, forfeit and result reload. Backend HTTP
requests were intercepted by fixtures; this is not a staging deployment test.
Latest phone error screenshots are in `artifacts/online-authority-test/`.

`check-friends-loading.cjs` and `check-social-integrity.cjs` pass after the Friends
batching/event-filter changes. They exercise request budgets, deduplication,
empty lists, error propagation, realtime filtering, stale-request protection and
500-message pagination at the service layer.

The new `check-integrity-core.cjs` runner passed all 11 suites locally, including
its own child-process/failure/environment guards. The workflow's YAML, fixture
configuration and container ownership checks passed local inspection. Its hosted
Linux jobs are not yet run; browser checks remain outside that gate. The earlier
full SQL-chain result above is distinct from a hosted CI database-job result.

`check-message-pagination.cjs` and the existing Messages/Clubs interaction checks
pass against isolated fixtures. Coverage includes 501 messages, exact timestamp
cursors, duplicate/stale responses, watcher cleanup, desktop/390/320 layouts,
keyboard paging, preserved scroll position, phone Back and account changes.
The new pagination control/loading/error strings remain English and need keys
in the existing translation system. No chat schema or backend APIs were changed
by this continuation.

Final October 3 build passed after all chat/style edits, generating 50 static
pages with the same four existing image lint warnings. The latest pagination
run also verifies phone chrome hides during a thread and returns on Back.
The local static preview at `http://127.0.0.1:3018/home/` responds with HTTP 200.
It does not supply the pending backend deployment described above.
