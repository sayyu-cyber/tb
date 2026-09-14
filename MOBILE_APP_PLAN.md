# Thaasbai: Going Native — Research & Plan

Written September 2026. Covers turning the existing web app into a shipped
mobile app, what "secure" realistically means for this project, and what it
actually costs. Read section 1 before doing anything else.

---

## 1. Read this first — the app is not secure today

This is not a theoretical concern or a hardening suggestion. There is a
working exploit in the live app right now, and **wrapping it in a native
shell does not fix it** — the flaw is in the backend rules, not the client.

### The exploit

`firestore.rules` line 75:

```
match /playerEconomy/{uid} {
  allow write: if request.auth != null && request.auth.uid == uid;
}
```

Any signed-in player may write **anything** to their own economy document.
The Firebase config in `lib/firebase.ts` is built from `NEXT_PUBLIC_*` env
vars, which Next inlines into the JavaScript bundle — it is public by design
and readable by anyone who opens devtools on tsbai.netlify.app. So a player
can open the console and run, in substance:

```js
setDoc(doc(db, 'playerEconomy', myUid), { economy: { coins: 99_999_999 } }, { merge: true })
```

They now have unlimited coins. Every cosmetic in the shop is free to them.

This completely bypasses the coin top-up approval gate. That gate is
carefully designed — a player cannot approve their own request, only an
admin can — but it is irrelevant, because **nobody needs an approved request
to credit themselves.** They can write the coins directly. The gate guards
the front door of a building with no walls.

### The same class of problem, elsewhere

- **`players/{uid}` (line 66)** — owner-only write, and trophies and rank
  live in this document. A player can set their own trophy count. The
  leaderboard and Hall of Fame are therefore forgeable.
- **`matches/{matchId}` (line 98)** — any player listed in a match may
  update the match document, which *is* the game state. A modified client
  can deal itself better cards, play illegal moves, or declare itself the
  winner. The rules engine runs only on the client; nothing server-side ever
  checks that a move was legal.
- **`matches` read (line 96)** — open to any signed-in user. The comment at
  lines 88–94 acknowledges this and calls it an accepted trade-off for
  Spectator Mode. That reasoning held when the stakes were cosmetic. It does
  not hold now: an opponent can subscribe to the match document and read
  your hand live, in real time, for the whole game. In a competitive game
  with a real-money currency attached, this is the most damaging of the
  three, because it is undetectable.
- **No App Check.** Nothing anywhere in the repo initialises it (only a
  transitive mention in `package-lock.json`). There is no attestation that
  requests come from your real app at all, so all of the above can be done
  with a plain script and no app installed.

### Why shipping an app changes none of this

A Capacitor app is your existing static bundle running in a system WebView.
The JavaScript is on the device and can be extracted from the APK in about
a minute. Remote debugging a WebView is a documented Android feature. Anyone
who wants to cheat does not even need to bother — the web version is still
live and open at the same Firestore project.

An app makes the surface *look* closed while changing nothing about who is
allowed to write what.

---

## 2. What "unhackable" actually means

Nothing is unhackable, and anyone who tells you otherwise is selling
something. But that is not the useful framing. The useful framing is:

> Assume the client is fully controlled by the attacker. What can they do?

Right now: anything. They can mint currency, rewrite match outcomes, forge
rankings, and read opponents' hands.

The achievable goal is: **the client can only ask; the server decides.** A
cheater with a fully modified app can then still send whatever requests they
like, and the server rejects the invalid ones. That is what a secure
multiplayer game with an economy means in practice, and it is a completely
reachable target for this project.

Getting there is not a matter of obfuscation, minification, root detection,
or making the app harder to decompile. Those are speed bumps that cost real
effort and buy hours. Moving authority to the server is the actual fix.

---

## 3. The security work, in priority order

### P0 — Server-authoritative economy (must ship before any store launch)

Coins, trophies, purchases, and match results must be written **only** by
trusted server code. Concretely:

1. Add **Cloud Functions for Firebase** (callable functions) for: crediting
   an approved top-up, purchasing a cosmetic, awarding match rewards, and
   recording a match result.
2. Change the rules so `playerEconomy/{uid}` is `allow read: if owner or
   admin; allow write: if false` — no client writes it, ever. Same for the
   trophy/rank fields on `players/{uid}` (split the mutable profile fields
   into a separate document the player may write, and keep the earned
   fields server-only).
3. Validate every purchase server-side: does this player actually have the
   coins, does the item exist, is the price the real price. Never trust a
   price or a balance sent by the client.

This is the single highest-value piece of work remaining on the project, and
it is larger than it sounds — it touches `EconomyContext`, `CosmeticShop`,
the top-up watcher, and the match-end paths in all four game clients.

### P1 — Firebase App Check

App Check attests that a request came from your genuine app (Play Integrity
on Android, DeviceCheck/App Attest on iOS, reCAPTCHA Enterprise on web), and
rejects unattested traffic before it reaches your rules or functions. Enable
it for Firestore and for callable functions. Roll it out in monitoring mode
first so you can see what would break before you start rejecting.

This is what stops the "plain script, no app installed" version of the
attack. It is not a substitute for P0 — a modified app on a real device
still passes attestation — but it raises the floor enormously.

### P2 — Server-authoritative match state

The rules engines currently live entirely in the client. Making matches
cheat-proof means the server holds the deck, deals the hands, and validates
each move. This is a substantial rewrite (realistically the biggest single
piece of engineering left in the roadmap) and it is reasonable to defer it —
but until it is done, ranked results cannot be trusted, and you should not
attach anything of real value to ranked outcomes.

**Correction after reading the code more closely.** An earlier draft of this
document claimed hand privacy could be fixed cheaply on its own, by moving
each hand into a per-player subcollection. That was wrong, and it is worth
recording why.

Every client runs the full rules engine against the shared match document.
That is precisely why all hands live in one doc: each client needs the
complete state to compute legal moves, resolve a trick, and decide a winner.
Hiding a hand from a client breaks the engine on that client. There is no
version of "hands are private" that survives while the engine is
client-authoritative — the two requirements are in direct conflict.

So hand privacy is not a separable quick win. It arrives as part of the
server-authoritative match engine, and until that lands, opponents can read
each other's hands. That is a genuine reason not to attach money or
meaningful stakes to ranked play yet.

### P3 — Everything else

Tighten the admin check (an email allowlist in rules is workable, but
`request.auth.token.email` is only trustworthy for verified providers —
prefer a custom claim set by a function). Rate-limit friend requests and
messages. Add abuse reporting, since you now have user-generated content in
DMs, club chat, and display names — stores will ask about this.

---

## 4. How to ship it as an app

### Use Capacitor

Your app is already configured with `output: 'export'` and
`images.unoptimized` — this is exactly the input Capacitor wants, and it is
the main reason this route is cheap for you. Capacitor 8 wraps the static
bundle in a native shell and gives you native APIs (push, haptics, status
bar, in-app purchase plugins) while keeping one codebase for web and mobile.

The realistic alternatives, and why not:

- **React Native / Flutter** — a full rewrite of every screen. Months of
  work to reach parity with what you already have. Only worth it if you hit
  a hard performance wall, which a card game will not.
- **PWA / Trusted Web Activity** — cheapest of all, installable from the
  browser, no store fee. But no App Store presence (iOS PWA support is
  limited and Apple does not list them), and you cannot use store billing.
  Worth keeping as the web offering, not as the app strategy.

### The rough steps

1. `npm i @capacitor/core @capacitor/cli && npx cap init`
2. Point `webDir` at `out` in `capacitor.config.ts`.
3. `npx cap add android` (and `ios` later, on a Mac — iOS builds require
   macOS and Xcode, there is no way around this).
4. `npm run build && npx cap sync`, then open in Android Studio.
5. Deal with the things that only break on device: the back button
   (Capacitor's `App` plugin — without handling it, Android's back gesture
   exits the app mid-match), safe-area insets on notched phones, deep links,
   and the fact that `localStorage` in a WebView can be cleared by the OS
   under storage pressure.

### The orientation work already done carries over

The landscape gate and the 1280px desktop-viewport trick both work inside a
WebView. Better: in a native shell you can lock orientation properly via
Capacitor's screen-orientation plugin and the Android manifest, so the app
simply cannot be rotated into portrait — which is a much better experience
than a blocking overlay. Keep the overlay for the web build.

---

## 5. Store requirements and timelines

### Google Play

- **$25 one-time** registration fee, no renewal.
- **Identity verification** with a government ID; the name on the ID, the
  payment card, and the developer profile must match.
- **The 12-tester rule.** Personal developer accounts created after 13
  November 2023 must run a closed test with **at least 12 testers opted in
  continuously for 14 days** before you can apply for production access. The
  14 days must be consecutive — a tester who drops out and rejoins resets.
  Plan for this: it is a hard three-to-four-week gate on your launch date,
  and finding 12 real testers is the part people underestimate.
- **Organization accounts are exempt** from the tester requirement. If you
  are willing to register as a business (requires a D-U-N-S number and more
  verification), you skip the entire closed-testing gate. Worth seriously
  considering given your timeline.
- **Target API level:** from 31 August 2026, new apps and updates must
  target Android 16 (API 36). Capacitor 8 handles this, but check it before
  your first upload.
- A **Data safety** form declaring everything you collect (you collect
  email, display name, photo URL, presence, and messages) and a published
  **privacy policy URL**. You do not currently have a privacy policy — you
  will need one.

### Apple App Store

- **$99/year**, recurring. This is the direct conflict with your "free"
  requirement — there is no free tier for App Store distribution.
- Requires a **Mac** for building and submitting.
- Review is stricter and slower than Play's. Card games with virtual
  currency draw extra scrutiny (see section 7).

**Recommendation:** ship Android first. It is $25 once, you can build it on
Windows, and it will tell you whether the app is worth the iOS tax.

---

## 6. Money — and the part that will hurt

Both stores require that **digital goods consumed inside the app** are sold
through their billing system, which takes **15–30%**. That includes virtual
currency. Coins fall squarely inside this rule.

Your current model — a player requests a top-up, pays you in MVR outside the
app, an admin approves it, the client credits the coins — is the thing the
policy exists to prevent. If the payment is arranged in-app and settled
outside it, that is circumvention, and it is grounds for removal. Apps do
get caught doing this.

2026 has loosened things, but **only in the United States**: following the
Epic litigation, Google opened Play to alternative in-app payment systems
for US users in October 2025, and Apple now permits US apps to link out to
external checkout. Neither relaxation helps you in the Maldives.

The realistic options:

1. **Use store billing for coins in the app** and accept the 15–30% cut.
   Cleanest, fully compliant, and the in-app purchase flow converts far
   better than a manual bank transfer anyway.
2. **Sell coins only on the website**, with zero purchase path, price list,
   or link inside the app. Coins bought on the web appear in the app because
   it is the same account. This is a genuinely grey area and the line is
   narrow — no "top up" button in the app that leads anywhere, not even a
   mention of prices.
3. **Do not sell coins at all.** Earn-only currency, monetise with ads or a
   cosmetic-free model. Removes the entire problem, including most of
   section 7.

Option 1 is what I would ship. The cut hurts, but the alternative is
building a business on a rule you are hoping is not enforced.

---

## 7. The legal question you should get an answer to

Thaasbai is a card game where currency is purchased with real money. That
places it close to a line that different jurisdictions draw in very
different places.

The distinction that matters almost everywhere is **cash-out**. If coins can
only be spent on cosmetics and entry to matches, and can never be converted
back into money or anything of value, the app is generally treated as a
social/casual game rather than gambling. The moment coins can be cashed out,
traded for money, or wagered player-against-player for a real prize, it
becomes real-money gaming: licensed, age-gated, geo-restricted, and subject
to a completely different (and far stricter) set of store policies.

Two things to be deliberate about:

- **Keep the currency strictly one-way.** No cash-out, no player-to-player
  coin transfers, no "winner takes the pot" mechanics. Ranked matches paying
  out coins from a system pool is fine; two players each staking coins with
  the winner taking both is the mechanic that changes the app's legal
  category.
- **Get local advice.** The Maldives is a jurisdiction where gambling is
  legally and culturally restricted, and I am not a lawyer — this section is
  the shape of the question, not an answer. Before you take money for coins
  at any scale, this is worth a real consultation. It is much cheaper to ask
  now than to unwind later.

---

## 8. What this actually costs

| Item | Cost |
|---|---|
| Google Play registration | $25 once |
| Apple Developer Program | $99/year (skip initially) |
| Firebase Spark (current) | Free — 50k reads / 20k writes per day, 1 GiB |
| **Firebase Blaze** | **Required for Cloud Functions.** Pay-as-you-go above the same free quotas; new projects get $300 credit |
| Netlify (web) | Free tier is fine at your scale |
| Domain | ~$10–15/year if you move off `tsbai.netlify.app` |
| Privacy policy | Free (template) to ~$100 (drafted) |

The honest headline: **"free" and "secure" are in direct tension here.**
Securing the economy requires Cloud Functions, and Cloud Functions require
the Blaze plan, which requires a card on file. In practice a game at your
current scale will sit inside the free quotas and bill you nothing — but it
is pay-as-you-go, not free, and you should set a **budget alert** on day one
so a bug or an abuse spike cannot run up a bill.

---

## 9. Order of work

Revised after auditing the code. The economy comes first because it is
self-contained — it can be fixed without touching the game engines — and it
closes the hole that destroys monetisation.

1. **Server-authoritative economy** (P0). Cloud Functions + rules lockdown +
   rewiring the client. The big one; nothing involving real money should
   ship before it.
2. **App Check** in monitoring mode, then enforcing. Cheap, broad benefit.
3. **Privacy policy, terms, and abuse reporting.** Store requirements, and
   quick.
4. **Play Console registration and start the closed test immediately.** The
   12-tester / 14-day clock runs in the background while you keep building,
   so starting it early costs nothing and saves weeks. (Or register as an
   organisation and skip the requirement.)
5. **Capacitor Android build.** Get an APK onto your own phone and live with
   it for a week.
6. **Decide the monetisation model** (section 6) and implement store billing
   if you go that route.
7. **Production release** on Play.
8. **Server-authoritative match engine** (P2). Includes hand privacy. Must
   land before ranked results carry real weight.
9. **iOS** only once Android proves the app is worth $99/year and a Mac.

## 10. Code audit findings (September 2026)

Things found in the codebase that the sections above did not anticipate:

- **`functions/` already exists** with three scheduled jobs (daily/weekly
  mission reset, weekly rank rewards) on the Firebase Functions v1 API. The
  scaffold, tsconfig and deploy config are in place, so P0 is cheaper to
  start than expected. Scheduled functions require Cloud Scheduler, which
  requires Blaze — so either the project is already on Blaze or these have
  never successfully deployed. **Confirm which before planning around them.**
- **The whole client reducer state is persisted verbatim.**
  `EconomyContext.tsx` line 856 does
  `setDoc(doc(db,'playerEconomy',user.uid), state, { merge: true })`. Every
  coin mutation is a client-side reducer action that is then written wholesale.
  The migration is therefore not "add validation" — it is moving each action
  to a function and deleting this write.
- **There are two coin balances and they can drift.** Both `profile.coins`
  and `economy.coins` are maintained in parallel by the reducer.
  `functions/src/index.ts` line 97 increments only `profile.coins`, while
  `lib/coinTopups.ts`'s `findPlayerByCode` reads
  `economy.coins ?? profile.coins`. These disagree today under some paths.
  Collapsing to one canonical balance is a prerequisite for the server
  migration, not an optional tidy-up.
- **Trophies are client-written.** `lib/trophyUpdates.ts` line 94 does
  `updateDoc(playerRef, { trophies: increment(...), currentRank })` straight
  from the browser.
- **No privacy policy or terms page exists.** Both are hard requirements for
  Play and Apple.
- **`next.config.js` is already Capacitor-ready** (`output: 'export'`,
  `images.unoptimized: true`).
- **Dead code to clear before shipping:** `components/layout/SideNav.tsx`,
  `HomeSidebar.tsx` and `BottomNav.tsx` are no longer rendered by the app
  (though `scripts/home-test-entry.tsx` still imports `HomeSidebar`), and the
  `/collection` and `/rewards` routes have no inbound link anywhere.

---

## Sources

- [Capacitor + Next.js static export](https://capgo.app/blog/nextjs-mobile-app-capacitor-from-scratch/)
- [Play: app testing requirements for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465?hl=en)
- [Play: target API level requirements](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en)
- [Play: get started with Play Console](https://support.google.com/googleplay/android-developer/answer/6112435?hl=en)
- [Play: payments policy](https://support.google.com/googleplay/android-developer/answer/10281818?hl=en)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [App Check enforcement for Cloud Functions](https://firebase.google.com/docs/app-check/cloud-functions)
- [Apple Developer Program cost](https://appbuilder24.com/blog/apple-developer-account-needed)
- [2026 store policy changes](https://www.appsonair.com/blogs/2025-mobile-app-store-policy-updates)
