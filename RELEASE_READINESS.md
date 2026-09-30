# Thaasbai: Web, Android and iOS Release Checklist

Baseline: `66a0255`, reviewed 2026-09-29. This is the current working plan;
`MOBILE_APP_PLAN.md` and `ECONOMY_AUDIT.md` contain earlier research, not current completion status.

## Decisions and Deadline

- Keep the existing Next.js application and Claude's desktop/phone designs.
- Paid coins and VIP are required for the first public store release.
- Google Play Console, Apple Developer membership and Mac/build-service access are not ready.
- Target this week's work through Sunday, October 4, with a Friday, October 2 checkpoint.
- This is an engineering target, NOT a promise of public store approval this week.
- New personal Play accounts need at least 12 opted-in testers continuously for 14 days before applying for production access. Start account setup and tester recruitment now. [Google testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- APK is for device testing; the Play submission should be a signed Android App Bundle (AAB). [Google publishing format](https://support.google.com/googleplay/android-developer/answer/9844279?hl=en)

## Audit Coverage

This is an initial release audit, not a claim that every line or live backend has been verified.

| Area | Evidence / result |
| --- | --- |
| Latest changes | Reviewed history through the phone layout/device-fix commits; checkout was clean before this pass |
| Source inventory | `node scripts/audit-source-usage.cjs`: 317 files, 65 conservative entry files, 46 unreachable candidates; no unresolved local imports or computed imports found |
| Web checks | `npm run verify` passed; four existing image warnings in legacy UI |
| Production export | `npm run build` passed, 46 static pages; required network access for Next font downloads |
| Functions | `npm run build --prefix functions` passed; this proves compilation, NOT deployment |
| Game engine tests | `npm run test:rules` passed, including 120 Gin simulation hands; this does not validate adversarial multiplayer clients |
| Authentication | Regression test reproduced public email persistence before the fix and passed after it; Firebase mocked |
| Dependencies | `npm audit --omit=dev`: 26 findings (1 critical, 6 high, 19 moderate); applicability/upgrade work remains |
| Firebase rules | Static review found broad write/read permissions; emulator integration suite still needed |
| Devices / stores | No Android/iOS native project, signed build, store sandbox payment, or physical-device release test verified |

`npm run verify` does not include the game simulation, Functions build, browser UI scripts,
Firebase rule tests, dependency audit or device tests. Passing it is not a release certificate.

## Confirmed Issues, in Priority Order

| ID | Priority | Finding and evidence | Status / acceptance criteria |
| --- | --- | --- | --- |
| R01 | P0 | `firestore.rules:73-75` permits owner writes to all economy fields; `contexts/EconomyContext.tsx` still persists the reducer state | OPEN. Move ALL value-changing paths behind trusted functions, then deny client value writes. Test forged balances, prices, rewards and ownership |
| R02 | P0 | `CosmeticShop.tsx` activates VIP locally without payment; `CoinTopupWatcher.tsx` credits locally before marking the request credited | OPEN. Verified store transaction -> idempotent server ledger -> entitlement. Retries and two devices must never double-credit |
| R03 | P0 | `matches` exposes full shared state to signed-in users and permits participant updates; `players` permits client trophy/stat writes | OPEN. Server validates actions and results, private per-player hands, public spectator projection, server-derived rewards. Do not represent current ranked results as tamper-proof |
| R04 | P1 | Auth copied email into `players`, readable by every signed-in user | CLIENT MITIGATION DONE. New signup/Google writes no longer publish email; sign-in removes an existing email field. Owner email still comes from Auth. Bulk removal of inactive accounts' legacy fields, old-client write protection and deployed verification remain |
| R05 | P1 | Admin rules trust an email allowlist without a verified-email check; room/club updates permit changing arbitrary fields when the caller is included; DM participants are mutable | OPEN. Define field allowlists, immutable ownership/participants, membership transitions and authenticated admin claims. Add adversarial emulator tests before deployment |
| R06 | P1 | `lib/trophyUpdates.ts` computes a clamped trophy total but writes an unrestricted negative increment; read/modify/write fields can also race | OPEN. Replace with an authoritative transaction keyed by match ID. Test zero trophies, duplicate results and simultaneous completion |
| R07 | P1 | No end-to-end account deletion flow; privacy page currently directs users to email | OPEN. Reauthenticated in-app deletion plus public web request path, data cleanup/retention policy, subscription warning and identity-provider token handling |
| R08 | P1 | Google login uses browser popup only; there is no native auth bridge or Apple login flow | OPEN. Native provider flow into the same Firebase account/UID; test linking, cancellation, relaunch and account switching |
| R09 | P1 | Dependency audit reports critical/high advisories, including Next 14.2.35 | OPEN. Review each against static export vs build/dev/Functions execution; controlled supported-version upgrade, not `npm audit fix --force`. Do not expose the dev server publicly |
| R10 | P2 | 46 files are not reachable from the scanned app/function entry graph | INVENTORIED ONLY. Review scripts, tests, CSS, assets and dynamic usage before deletion; remove one legacy family at a time and rerun relevant checks |
| R11 | P2 | Test tooling uses machine-specific Playwright paths; `test:rules` downloads an unpinned tsx runner; no CI workflow found | OPEN. Pin runners, portable environment config, repeatable CI matrix and deploy gates |

Important: `functions/src/economy.ts` exists, but the client does not call these purchase
functions. Their comments describe a completed migration that the rules/client do not yet implement.
Simply switching the rules to `allow write: false` today would break the working client.
Likewise, switching only the shop to functions would let the old reducer autosave overwrite server balances.
Migrate initialization, purchases, grants, missions, achievements, daily/weekly rewards, VIP,
room cards, equipping and public cosmetic projections together behind a versioned rollout.

## Step-by-Step Work Queue

### 1. Establish the Baseline and Contain Privacy Bugs

- [x] Inspect latest commits, routes, dependencies, shared layouts and native configuration.
- [x] Run web verification, production export, Functions compilation and engine tests.
- [x] Inventory dead-code candidates without deleting potentially used functionality.
- [x] Fix new public email writes and add regression coverage for legacy sign-in cleanup.
- [ ] Create a staging Firebase project/configuration; confirm existing deployed rules/functions and billing plan with the owner.
- [ ] Run controlled server cleanup of historical public email fields, with backup/dry-run and approval.
- [ ] Add CI and Firestore emulator tests; include attacker, guest, owner, peer and admin identities.

### 2. Secure Value and Multiplayer Before Monetization

- [ ] Map every economy mutation to a server command; preserve existing balances and owned items.
- [ ] Decide which offline/AI rewards are allowed. A client-reported win is not proof for a paid economy.
- [ ] Initialize/migrate accounts server-side; handle guest upgrades without importing arbitrary local balances.
- [ ] Make purchases transactional, enforce server catalog AND admin price/availability overrides, and deduplicate every grant.
- [ ] Replace whole-document client saves with server subscriptions plus separately validated cosmetic/profile changes.
- [ ] Make top-up approval/credit atomic, retries idempotent, and refunds auditable.
- [ ] Define VIP as fixed-duration passes or renewing subscriptions before creating products; existing weekly/monthly durations do not decide the billing type.
- [ ] Protect room/club/DM field transitions and administrator privileges with emulator coverage.
- [ ] Move online deal, turn validation, hidden hands and result settlement to trusted code. Test replayed/out-of-turn moves and disconnect/reconnect.
- [ ] Roll out App Check in monitoring first; enable enforcement only after supported web/native clients issue valid tokens.
- [ ] Test migration in staging. Deployment requires explicit owner approval; no deploy is part of this audit.

**Exit gate:** a modified client cannot mint coins, activate VIP, invent purchases/results,
change another player's records, or read an opponent's private hand. Two devices and request
retries produce one settlement. This is larger than a cosmetic cleanup and may exceed this week.

### 3. Keep One Web App, Add Native Packaging

Recommendation: Capacitor around the existing static `out/` export, not a React Native rewrite.
There is currently no Capacitor dependency/config or Android/iOS project in this repository.

- [ ] Confirm the legal publisher, permanent application ID, intended countries and minimum supported devices.
- [ ] Install a pinned compatible Capacitor toolchain; use `webDir: 'out'` and bundled local assets for release, not a development `server.url`.
- [ ] Create Android and iOS targets. Keep signing keys, service credentials and certificates outside Git.
- [ ] Build/export, sync, then test actual WebViews: direct/deep routes, back gesture, leave-match confirmation, keyboard resize, safe areas, audio and resume.
- [ ] Preserve portrait app screens and landscape tables; add native orientation handling without globally forcing every page sideways.
- [ ] Integrate native Google/Apple authentication and secure Firebase credential linking; do not assume popup login works in a WebView.
- [ ] Add native push/deep-link handling only with actual token registration, logout cleanup, permission denial handling and backend delivery.
- [ ] Test offline cold start honestly: show a usable local screen or clear retry state; do not pretend online matches work offline.
- [ ] Produce an Android test APK first, then signed release AAB. Produce an iOS archive/TestFlight build on macOS.

Capacitor's current v8 environment documentation specifies Node 22+, macOS/Xcode for iOS,
and Android Studio/SDK for Android. Confirm compatible plugin versions before installation.
[Capacitor environment setup](https://capacitorjs.com/docs/getting-started/environment-setup)

### 4. Paid Coins and VIP

- [ ] Owner completes store identity, banking/tax agreements and merchant setup.
- [ ] Define coin pack and VIP product IDs, prices, supported countries and entitlement rules.
- [ ] Implement Play Billing and StoreKit through a maintained compatible integration. Prices shown in native apps come from store products, not web MVR tables.
- [ ] Validate purchases on the backend; bind them to the correct account and app/environment.
- [ ] Deduplicate by store transaction/purchase token; handle pending, cancelled, declined, deferred, restored and refunded purchases.
- [ ] Acknowledge/consume Google purchases correctly; finish Apple transactions after reliable fulfillment.
- [ ] Handle renewals, expiration, billing retry, revocation and server notifications if VIP renews.
- [ ] Provide Restore Purchases for supported entitlements; do not restore spent consumable coins as fresh credit.
- [ ] Remove manual-transfer purchase prompts from native builds unless a verified regional program expressly permits that flow.
- [ ] Run real store sandbox tests on both platforms before enabling real-money purchases.

Plan on store billing for digital coins/VIP. Regional exceptions require eligibility and enrollment;
they are not a blanket permission to reuse manual web top-ups.
[Google payments policy](https://support.google.com/googleplay/android-developer/answer/9858738?hl=en)
and [Apple review guidelines, section 3.1](https://developer.apple.com/app-store/review/guidelines/).

### 5. Privacy, Moderation and Store Submission

- [ ] Implement in-app account deletion and a public web deletion request page. Preserve legally required transaction records only under a documented retention policy.
- [ ] Complete Google Data safety and Apple's privacy disclosures from actual SDK/data behavior, including chat, presence and purchase records.
- [ ] Test report/block enforcement, club moderation, abuse handling and support contact response.
- [ ] Review age ratings, target audience, content rules and target-country legal suitability. No cash-out/wagering assumptions; obtain local advice before monetizing if the game mechanics raise legal questions.
- [ ] Complete the Apple login-services requirement for the app's Google-login offering.
- [ ] Prepare icons, screenshots from real devices, descriptions, privacy/support URLs and reviewer credentials.
- [ ] Verify current target SDK, signing, privacy manifests and third-party SDK requirements at upload time.
- [ ] Run Play pre-launch checks, closed testing, TestFlight and physical-device tests; fix blockers before submission.

[Apple deletion guidance](https://developer.apple.com/support/offering-account-deletion-in-your-app/),
[Google deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111?hl=en),
[Apple review guidelines](https://developer.apple.com/app-store/review/guidelines/),
[Google target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-gb).
Google currently lists API 36 for new phone apps. Recheck before uploading.

## This Week: Gated Targets, Not Promised Approval

| Date | Engineering focus | Owner action / exit evidence |
| --- | --- | --- |
| Tue Sep 29 | Baseline audit, privacy mitigation, ordered issue list | Start legitimate developer enrollment; choose publisher/account type, reserve Mac access, recruit testers |
| Wed Sep 30 | Emulator coverage and authoritative economy contract/migration design | Confirm Firebase staging/Blaze access, coin/VIP product model and app ID |
| Thu Oct 1 | First tested server economy slice; dependency risk triage | Confirm banking/tax setup and access to Android/iPhone test devices |
| Fri Oct 2 | Checkpoint: staging privacy/security tests; remove proven dead-code family | Decide go/no-go for an internal native build; unresolved P0s block monetized release |
| Sat Oct 3 | If earlier gates pass: Capacitor Android prototype and WebView smoke tests; otherwise continue security fixes | Install Android test APK and report device results; arrange macOS build environment |
| Sun Oct 4 | Record passed gates, remaining defects and next week's scope; prepare iOS handoff | Internal/closed testing only when accounts/builds are ready; public launch remains gated |

Paid cross-platform launch with missing accounts, billing integration and authoritative game/economy
work is not a credible guaranteed one-week delivery. The useful outcome this week is a measured,
tested release path and completed security slices, with no rushed production payment switch.

Google's location table currently supports both developer and merchant registration for Maldives;
actual identity, bank and account eligibility must still be verified by the owner.
[Supported locations](https://support.google.com/googleplay/android-developer/answer/9306917?hl=en)

## Dead Code: Safe Cleanup Procedure

Run `node scripts/audit-source-usage.cjs` for the current full list. Initial candidates include
old Home components (`PlayerHUD`, `ProfileCard`, `HomeLobbyHero`), old navigation (`SideNav`,
`HomeSidebar`, `BottomNav`), old game selectors and some shared UI wrappers.

1. Check each candidate's basename, exports and asset/style references across scripts and runtime registries.
2. Remove one confirmed-unused family, not all 46 at once. A missing import path is evidence, not proof of safe deletion.
3. Run verify/build and the affected desktop/phone UI tests. Check screenshots before removing associated CSS/assets.
4. Measure exported bundle size before claiming a performance gain; unused source is often already tree-shaken.
5. Audit root `firebase-admin`/`firebase-functions` dependencies separately from the Functions workspace before removing duplicates.

## Next Concrete Task

**R01/R02: write emulator tests and the complete server-authoritative economy migration contract.**
Start with account initialization, authoritative balance, cosmetic purchase and idempotent credit.
Do not deploy a partial rules lockdown or leave local autosave capable of overwriting server results.

Changes in this pass are local only. No Firebase deployment, store submission, account creation,
payment configuration, bulk data deletion, branch switch, push or merge was performed.
