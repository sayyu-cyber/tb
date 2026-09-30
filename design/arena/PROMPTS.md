# Prompts for the Arena app screens

Use them in this order:

1. **Claude, phase 0.** Paste prompt 1 into the Thaasbai project session in Claude. Wait until it reports that phase 0 is on `main`.
2. **Both, in parallel.** Paste prompt 2 into ChatGPT (Codex), and reply `start phase 1` to Claude.
3. **Reviews.** When both have finished, run prompt 3 in Claude and prompt 4 in ChatGPT. Send each list of problems back to the agent that owns the code.
4. **Merge.** Run prompt 5 in Claude, then push `main` yourself.
5. **Phone.** Once the desktop work is on `main`, paste prompt 6 into Claude. When it finishes, run prompt 7 in ChatGPT and send the problems back to Claude. Then run prompt 8, and push `main` yourself.
6. **The opening deal and private rooms.** Once the phone work is on `main`, paste prompt 9 into Claude. When it finishes, run prompt 10 in ChatGPT and send the problems back to Claude. Then run prompt 11, and push `main` yourself.

The rules behind all of this are in `WORKSPLIT.md`, and the designs are in `APP_SCREENS.md` (desktop), `MOBILE.md` (phone) and `DEAL_AND_ROOMS.md` (the opening deal and private rooms).

## 1. Claude: phase 0, then phase 1

```text
Finish what you're doing first, then read this.

We're moving the Arena look from the card tables to the rest of the app. Everything you need is in design/arena/ (it's untracked right now):
- APP_SCREENS.md: the blue edition palette (the app screens were drawn in #00BCC8 blue; leave the table code as it is), the shell spec, shared pieces, the board → route → files → screenshot table, and 11 code issues.
- WORKSPLIT.md: who owns which files. You are "Claude". ChatGPT (Codex) builds the other half at the same time in its own worktree, C:\Users\Sayyu\thaasbai-codex, so stay strictly inside your own file list.
- screens/app/*.jpg are the pixel references. boards/<Board>.dc.html hold the exact values. Their {{ }}, sc-for/sc-if and DCLogic parts are the design canvas's demo runtime: read them, don't copy them. app-reference.css is the shared CSS to port.
Read both .md files in full, and look at every screenshot for your screens, before you write code.

PHASE 0 (on main)
1. Finish, check and commit the table-port work that's still uncommitted (about 52 files). Run npm run verify and the check scripts it touches (check-mindi-ui, check-gin-ui, check-gameplay-ui, check-arena-gameplay). Don't commit throwaway screenshots in artifacts/.
2. Commit design/ on its own: "Add Arena design references".
3. Build the shared layer exactly as WORKSPLIT.md "Phase 0" lists it, and commit it as "Arena foundation: …". The shell (sidebar, top bar, stage, coin gem) follows the EXACT MATCH rules below.
4. Phase 0 is done when npm run verify and node scripts/check-shell-ui.cjs pass (dev server on 127.0.0.1:3000). Then STOP and tell me, listing the shared components and CSS classes you made, so I can start ChatGPT.

PHASE 1 (when I say "start phase 1")
- git switch -c arena/claude-screens
- Build your screens: Home, Profile, Inventory (plus Collection and Room Cards), Shop (all four tabs, the buy dialog and the not-enough-coins state), VIP Pass + coin packs, Daily rewards and Missions.
- Every screen must pass WORKSPLIT.md "How every screen is checked":
  - It matches its reference at 1440×900 and still works at 1280, at 1920 and on the 844×390 phone.
  - It passes npm run verify and its check-*-ui script.
  - It meets the accessibility list.
  - It uses real data and strings from the code, never the boards' sample names and numbers.
- Commit each screen on its own as "Arena: <Screen>", naming the reference it matches.
- Fix code issues 3, 4, 5, 6, 7 and 11 from APP_SCREENS.md. For 1 (VIP activates for free) and 2 (weekly rank rewards), write up what you'd change and ask me first.
- If I pass on a "Needs from Claude" request from ChatGPT, do it on your branch and tell me when it's in.

EXACT MATCH (my rule for your screens and the shell; also in WORKSPLIT.md "Exact match")
Copy the artboards; don't interpret them. The layout, sizes, spacing, radii, colours, gradients, shadows, fonts, letter-spacing, icons, buttons, states and animations must all be the same as the boards.
- Styles: port each board's <style> block, and the parts of app-reference.css it uses, value for value. Namespace them the way you did the table boards, with scripts/port-board.mjs where it fits. Don't round numbers, don't swap in Tailwind approximations, and don't bend the design to fit the old components: replace the old styling.
- Markup: keep the board's structure and class names, written as React components.
- Buttons: use the board's .btn recipe in every variant it shows (lime, blue, ghost, sm, disabled), with its hover, pressed and focus states.
- Animations: port every @keyframes rule and every animation/transition the board uses (blink, bob, bob2, breathe, chase, drift, fade, handIn, holo, rise, spin). Put each one on the same element, with the same duration, easing, delay and loop. The interactions in the board's DCLogic class (tabs, plan pick, dialogs, claim, equip) must behave and animate the same way.
- Icons: use the same Lucide icons, at the same size and stroke.
- Screens without their own board: Collection and Room Cards use the Inventory board's pieces (app-03). Missions use the Rewards board (app-13).
- What may differ, and nothing else:
  - real data and strings in place of the board's sample names and numbers
  - layout that adapts at widths other than 1440
  - loops that stop for people who have turned on reduced motion
  If a board element has no real data or feature behind it, don't drop it and don't fake it. List it and ask me.
- Proof, for each screen:
  1. Feed the board's sample data into the screen's test fixture (scripts/*-test-services, never app code).
  2. Screenshot the screen at 1440 wide, in the same state as each of its references.
  3. Save the screenshot and the reference side by side in artifacts/compare/<screen>.png. Don't commit these.
  4. Fix every difference you can see. A screen isn't done until the two halves look the same apart from the allowed differences.

RULES
- Never push to GitHub (pushing main deploys to Netlify) and never run firebase deploy. I push after the review.
- Don't touch C:\Users\Sayyu\thaasbai-codex or the arena/codex-screens branch.
- Stage files by path, not with git add -A.
- When you finish phase 1, give me a summary: screens done, the artifacts/compare images, checks run and their results, code issues fixed, anything that still differs from its board and why, and your questions for me.
```

## 2. ChatGPT (Codex): phase 1, after Claude reports phase 0 is done

```text
You're working on Thaasbai, a Next.js 14 card-game web app (Mindi and Gin Rummy) in C:\Users\Sayyu\thaasbai. Claude works in that folder at the same time, so you'll work in your own git worktree and never edit files in C:\Users\Sayyu\thaasbai.

SETUP
1. In C:\Users\Sayyu\thaasbai, run git log main --oneline -5 and check it shows an "Arena foundation:" commit. If it doesn't, stop and tell me.
2. Create your worktree, and from then on work only there:
   cd C:\Users\Sayyu\thaasbai
   git worktree add ..\thaasbai-codex -b arena/codex-screens main
   cd ..\thaasbai-codex
   copy ..\thaasbai\.env.local .env.local
   npm ci
3. Run your dev server on port 3001, because Claude uses 3000: npm run dev -- -p 3001

READ FIRST
- Read design/arena/WORKSPLIT.md (you are "ChatGPT") and design/arena/APP_SCREENS.md, in full.
- The references for your screens are design/arena/screens/app/*.jpg. If you can't view images, work from design/arena/boards/<Board>.dc.html: its <style> block and markup are the design. Its {{ }}, sc-for/sc-if and DCLogic parts are the design canvas's demo runtime, so read them for structure and don't copy them.
- Also read the shared layer Claude built on main: styles/arena-app.css, components/arena/*, and the restyled sidebar and TopBar.

YOUR SCREENS
Build Friends, Messages, Clubs, Leaderboard, Achievements, Weekend League (/tournament), Hall of Fame and Settings. Also fix code issues 8, 9 and 10 in APP_SCREENS.md.
- Build on components/arena/* and the arena-app.css classes.
- Put your CSS in the two stylesheets that are already imported: styles/arena-social.css (Friends, Messages, Clubs, Settings) and styles/arena-compete.css (Leaderboard, Achievements, Weekend League, Hall of Fame).
- Every screen must pass WORKSPLIT.md "How every screen is checked":
  - It matches its reference at 1440×900 and still works at 1280, at 1920 and on the 844×390 phone.
  - It passes npm run verify.
  - It meets the accessibility list.
  - It uses real data and strings from the code, never the boards' sample names and numbers.
- Make the check scripts you own (check-friends-ui, check-clubs-ui, check-settings-ui and any new ones) read the base URL from process.env.CHECK_BASE_URL, defaulting to http://127.0.0.1:3000. Run them in PowerShell:
  $env:CHECK_BASE_URL='http://127.0.0.1:3001'; node scripts/check-friends-ui.cjs
- Commit each screen on its own on arena/codex-screens as "Arena: <Screen>", naming the reference it matches.

RULES
- Edit only the files WORKSPLIT.md gives to ChatGPT.
- Don't edit lib/i18n.ts, contexts/, data/, constants/, app/layout.tsx, the shell, components/arena/*, or the existing fields of shared hooks. If you need a change there, build a local version inside your own folders and list it under "Needs from Claude".
- Never push or merge, never switch branches or commit in C:\Users\Sayyu\thaasbai, and never run firebase deploy.
- When you finish, give me a summary:
  - screens done
  - checks run and their results
  - code issues fixed
  - "Needs from Claude"
  - any new hard-coded English strings
  - anything that doesn't match its reference, and why
```

## 3. Claude reviews ChatGPT's branch

```text
Phase 2 of design/arena/WORKSPLIT.md: review ChatGPT's branch arena/codex-screens, which is checked out in C:\Users\Sayyu\thaasbai-codex. This is a review only: don't edit or commit anything there.
1. Run git diff main...arena/codex-screens --stat, and flag every changed file that isn't on ChatGPT's list in WORKSPLIT.md.
2. In C:\Users\Sayyu\thaasbai-codex, with ChatGPT's dev server stopped:
   - run npm run verify
   - run npm run dev -- -p 3001
   - run its check scripts with CHECK_BASE_URL=http://127.0.0.1:3001
3. Compare each of its screens with design/arena/screens/app/*.jpg at 1440×900, 1280, 1920 and 844×390: layout, colours, type, states and copy. Check the contrast, the focus rings and reduced motion, and check that it uses real data rather than the boards' sample data.
4. Check the fixes for code issues 8, 9 and 10, and go through its "Needs from Claude" list.
Give me a list of problems, most serious first, each with the file and line and the reference it differs from. End with "ready to merge" or "not yet".
```

## 4. ChatGPT reviews Claude's branch

```text
Phase 2 of design/arena/WORKSPLIT.md: review Claude's branch arena/claude-screens. This is a review only: don't edit, commit or switch branches in any existing folder.
1. From C:\Users\Sayyu\thaasbai-codex, run git diff main...arena/claude-screens --stat. Flag every changed file outside Claude's list, and any change to ChatGPT's files.
2. Claude's folder has that branch checked out, so make a temporary review copy instead:
   git worktree add --detach ..\thaasbai-review arena/claude-screens
   cd ..\thaasbai-review
   copy ..\thaasbai\.env.local .env.local
   npm ci
   Then run npm run verify, and npm run dev -- -p 3002. Claude's check scripts assume port 3000, so skip them; Claude has already run them.
3. Claude's screens must be exact copies of the artboards (WORKSPLIT.md "Exact match"). For each screen (Home, Profile, Inventory, Collection, Room Cards, Shop, VIP, Rewards, Missions):
   - Screenshot it at 1440 wide. Compare that, and Claude's own comparison in C:\Users\Sayyu\thaasbai\artifacts\compare (read it; don't edit it), with design/arena/screens/app/*.jpg.
   - Flag every difference in layout, spacing, sizes, colours, type, icons, buttons, states or animations. Open the board's .dc.html to check the exact values, @keyframes and timings.
   - Check 1280, 1920 and 844×390, the contrast, the focus rings, reduced motion, and that it uses real data.
4. Check the fixes for code issues 3–7 and 11. Confirm that nothing changed how VIP is paid for and nothing was deployed.
5. Stop the server and remove the copy: git worktree remove ..\thaasbai-review
Give me a list of problems, most serious first, each with the file and line and the reference it differs from. End with "ready to merge" or "not yet".
```

## 5. Claude merges

```text
Both reviews are done and fixed. Merge as design/arena/WORKSPLIT.md phase 2 says, in C:\Users\Sayyu\thaasbai:
1. git switch main
   git merge --no-ff arena/claude-screens
   npm run verify
2. git merge --no-ff arena/codex-screens
   Resolve any conflicts so that both sides keep their intent. Then run npm run verify and every check-*-ui script.
3. If ChatGPT built local stand-ins for things on its "Needs from Claude" list, switch them to the shared pieces in a separate commit.
4. Remove the worktree: git worktree remove ..\thaasbai-codex
Don't push. Tell me when main is ready and I'll push.
```

## 6. Claude: the phone version (after the desktop work is merged)

Paste this into the Thaasbai project session. Claude builds the whole phone version on the branch `phone/claude`.

```text
Finish and commit whatever you're in the middle of first, so the phone work starts from a clean main. Then read this.

We're building the phone version of Thaasbai, and it must be an exact copy of the phone artboards. You build all of it; ChatGPT only reviews at the end.

READ FIRST, all of it, before any code
- design/arena/MOBILE.md: the phone spec (orientations, the phone shell, patterns, "Turning the phone", the screens table, shortened copy, build notes).
- design/arena/boards/M*.dc.html (portrait) and P*.dc.html (the landscape tables, and PHome, the app held sideways) hold the exact values. Their {{ }}, sc-for/sc-if and DCLogic parts are the design canvas's demo runtime: read them for structure and behaviour, but don't copy them.
- design/arena/screens/phone/*.jpg: the pixel references, at 2×.
- design/arena/WORKSPLIT.md, "How every screen is checked" and "Exact match". Both apply to the phone too.

WHERE
git switch -c phone/claude (from main). Make one commit per step below, "Phone: <step>", naming the references it matches.

1. THE PHONE SHELL
- It applies below 768 px wide, and on a phone held sideways: (orientation: landscape) and (max-height: 500px) and (pointer: coarse). Desktop at 768 and up stays exactly as it is.
- Build:
  - the 60 px top bar
  - the 5-slot bottom tab bar with the raised Play diamond
  - the More sheet
  - one shared bottom-sheet component
  - held sideways (PHome): the 76 px rail, the 52 px top bar, the centred 560 px column, and sheets as side panels
- The tab bar replaces the current phone bar that scrolls through all ten icons. Update scripts/check-shell-ui.cjs:
  - At 390×844 the bar holds exactly Home, Friends, Play, Shop and More, and every other destination is in the More sheet.
  - At 844×390 the rail holds the same five.
  - The desktop assertions stay.

2. TURNING THE PHONE (MOBILE.md "Turning the phone"; boards MPlay, MPlayFind, MRotate)
- In public/manifest.json, change "orientation": "portrait" to "any".
- Only match screens need landscape. Take /play out of needsLandscape in components/layout/AppShell.tsx. The Play lobby is MPlay in portrait and PLobby held sideways.
- Play in the portrait lobby starts looking for a table at once and opens the rotate sheet (MPlayFind). Vs AI and Pass & Play show "Your table is ready" instead, and start only once the phone is sideways.
- Where screen.orientation.lock exists, the same tap requests fullscreen and locks landscape. Unlock and leave fullscreen when the player leaves the match. If either call fails, fall back to the sheet with no error. "Go landscape" shows only where the lock exists.
- Rebuild RotateDeviceGate as MRotate:
  - It covers the live table, which shows blurred behind it, and the match keeps running.
  - It shows the live turn status with the countdown ring.
  - Leave table goes through the existing leave flow, and the lock hint stays.
  - It stays a pure CSS media query and disappears the moment the phone turns.
- Copy: reuse rotate_title and rotate_lockHint, replace rotate_body, and add i18n keys in all four languages for every new string MOBILE.md lists.

3. THE TABLES HELD SIDEWAYS: PLobby, PMindi, PGin, PResult
- Each is an 844×390 composition. On a phone held sideways, scale it evenly to fit the visible viewport (100dvh / visualViewport), and never crop the hand or the action button.
- Keep the game logic as it is: this step is layout and look only.

4. THE PORTRAIT SCREENS, one commit each
- Home, with the More sheet
- Profile
- Inventory
- Friends, with the actions sheet
- Messages and the chat thread
- Clubs
- Leaderboard
- Achievements
- Weekend League
- Hall of Fame
- Shop, with the buy sheet and not-enough-coins
- VIP and coin packs
- Rewards and Missions
- Settings

EXACT MATCH
- Port each board's CSS value for value with scripts/port-board.mjs. The phone boards are already blue, so there is nothing to recolour.
- Keep, from each board:
  - the structure and class names
  - the buttons, with their press depth and shine
  - every animation at the same timing, including playglow, sheetUp, scrimIn, sideIn, slideIn, pop, hurry and turnPhone
  - the interactions
- The only allowed differences are:
  - real data and strings in place of the sample data
  - fluid width from 360 to 430
  - loops that stop under reduced motion
- If a board element has no real data or feature behind it, don't drop it and don't fake it. List it and ask me.
- Desktop must not change: every desktop check still passes, and the desktop screens still match screens/app/*.jpg.

PROOF, for every screen and state
1. Feed the board's sample data into the screen's test fixture (scripts/*-test-services, never app code).
2. Screenshot it in the same state as each reference: 390×844 full page for portrait, 844×390 for landscape.
3. Save the screenshot beside the reference in artifacts/compare/phone-<screen>.png. Don't commit these.
4. Fix every visible difference, then check 360 and 430 wide as well.
Test the rotate flow in Chrome's device emulation, turning between portrait and landscape. In your summary, say what you couldn't test for real (iPhone Safari, and the Android lock on a real phone).

RULES
- Never push to GitHub and never run firebase deploy. I push after the review.
- Stage files by path, not with git add -A.
- When you finish, give me a summary:
  - screens done
  - the compare images
  - checks run and their results
  - anything that still differs from its board, and why
  - your questions for me
```

## 7. ChatGPT reviews the phone branch

```text
Review Claude's branch phone/claude against design/arena/MOBILE.md and the references in design/arena/screens/phone/*.jpg. This is a review only: don't edit, commit or switch branches in any existing folder.
1. In C:\Users\Sayyu\thaasbai, run git diff main...phone/claude --stat. This and the next step leave that folder's files alone.
2. Make a temporary review copy:
   git worktree add --detach ..\thaasbai-review phone/claude
   cd ..\thaasbai-review
   copy ..\thaasbai\.env.local .env.local
   npm ci
   npm run verify
   npm run dev -- -p 3002
3. In Chrome's device emulation, compare each portrait screen at 390×844 (and at 360 and 430) and each landscape screen at 844×390 with its reference: layout, spacing, sizes, colours, type, icons, buttons, states and animations. Open the board's .dc.html to check the exact values.
4. Check the rotate flow:
   - Play in the portrait lobby opens the rotate sheet and keeps looking.
   - A table held upright shows the gate, with the live turn status and Leave table.
   - The gate goes as soon as the phone turns.
   - App screens held sideways use the rail.
   - manifest.json has "orientation": "any".
   - Desktop at 1280 and 1440 is unchanged.
5. Stop the server and remove the copy: git worktree remove ..\thaasbai-review
Give me a list of problems, most serious first, each with the file and line and the reference it differs from. End with "ready to merge" or "not yet".
```

## 8. Claude merges the phone branch

```text
The phone review is done and its problems are fixed. In C:\Users\Sayyu\thaasbai:
1. git switch main
2. git merge --no-ff phone/claude
3. Run npm run verify and every check-*-ui script, at desktop and phone sizes.
Don't push. Tell me when main is ready and I'll push.
```

## 9. Claude: the opening deal and private rooms

Paste this into the Thaasbai project session. Claude builds both features, on desktop and phone, on the branch `deal-rooms/claude`.

```text
Finish and commit whatever you're in the middle of first, so this starts from a clean main. Then read this.

We're building two features from the Arena artboards, and the app must end up an exact copy of them:
- the opening deal: cut for first play, then the deal (Mindi and Gin)
- private rooms: the Private Room page (create or join) and the waiting room
You build both, on desktop and phone. ChatGPT only reviews at the end.

READ FIRST, all of it, before any code
- design/arena/DEAL_AND_ROOMS.md is the spec: the timeline, the table-space positions, the copy, reduced motion, and where each screen's data comes from.
- The boards hold the exact values: design/arena/boards/Cut, CutGin, PCut, PCutGin, Rooms, RoomLobby, MRooms, MRoomsCreate, MRoomLobby and MRoomLobbyFull (.dc.html).
  - The ceremony's choreography is in the Cut and PCut scripts: GEO, timeline(), phaseAt() and place().
  - Their {{ }}, sc-for/sc-if and DCLogic parts are the design canvas's demo runtime. Read them for structure and behaviour, but don't copy them.
- The pixel references, at 2×, are:
  - design/arena/screens/deal/*.jpg
  - screens/app/app-15* and app-16*
  - screens/phone/phone-land-05*, phone-land-06*, phone-17* and phone-18*
- design/arena/WORKSPLIT.md, "How every screen is checked" and "Exact match". Both apply here.
- design/arena/MOBILE.md, for the phone shell and the rotate flow.

WHERE
git switch -c deal-rooms/claude (from main). Make one commit per step below, "Deal/Rooms: <step>", naming the references it matches.

1. THE OPENING DEAL
It runs on desktop (MindiTable, GinRummyTable) and on phones held sideways (PhoneMindiBoard, PhoneGinBoard).
- Today, MindiGameClient, MindiOnlineClient, GinRummyGameClient and GinRummyOnlineClient return <MindiDealIntro> instead of the table, and that opens a <dialog> over a separate three.js lounge. Replace this:
  - The clients render the table from the first frame, in an opening state.
  - The ceremony is a layer inside the same ArenaStage board, in CSS 3D exactly as the boards do it: the .ccl layer inside .table, .cc cards that pivot on their near edge, and place() for the transforms.
  - Use the desktop GEO on the 1440×900 board and the phone GEO on the 844×390 board.
- The ceremony's words and controls live in the table's own chrome:
  - On desktop, the left HUD shows the steps and the right HUD shows the cut. At the end, both cross-fade into Tens and Trump (Gin: Your melds and Turn).
  - The status pill narrates.
  - Skip to deal sits in the action button's slot.
  - On phones, use the top bars and the compact Skip, as on PCut.
- It stays presentation only:
  - The cut and the deal still come from lib/openingCut.ts and the engines, unchanged.
  - Online clients replay the stored result.
  - The seat plates, card counts, the hand and trick 1 all come from real state.
- Mindi 1v1 (the two-seat room variant) deals 26 each. Use CutGin's two-seat layout, with Mindi's 40 ms gap and no upcard.
- Update components/game/mindiCutTimeline.ts to the spec's numbers.
- Skip to deal and Escape jump the clock to the deal. The deal itself can't be skipped.
- Build reduced motion as the spec describes, and keep the hand dealt on screen.
- The whole pack wears the viewer's equipped card back.
- Once nothing imports them, delete MindiCutScene.tsx, mindiCutAnimation.ts and the lounge styles. Leave mindiTableRenderer.ts alone.
- Update scripts/check-mindi-cut.cjs and scripts/mindi-cut-test-entry.tsx for the new phases, the panel swap, Skip, and both games.

2. THE PRIVATE ROOM PAGE: components/game/PrivateRoomSetup.tsx and RecentRooms.tsx
- The boards are Rooms (desktop), MRooms and MRoomsCreate (phone).
- Build:
  - the game tiles
  - the seats segment, with Gin locked to 2
  - the password switch, and the field with its eye toggle
  - the six-box code entry with Paste
  - the Room Card status: active with time left, or none with Get a card
  - incoming invites (watchRoomInvites)
  - recent rooms with their status pills
- Keep every existing validation message and flow: sign-in, Room Card required, not found, full, already started, and the password prompt. The password prompt is a dialog on desktop and a sheet on the phone.
- On the phone, Join is the first tab.

3. THE WAITING ROOM: components/game/RoomLobbyClient.tsx and RoomInviteDialog.tsx
- The boards are RoomLobby (desktop, Host and Guest), MRoomLobby and MRoomLobbyFull (phone).
- Build:
  - the code card, with Copy and Share
  - the table seen from above, with its seat cards: teams by seats 0 and 2 (lime) and 1 and 3 (blue), the host's crown, the You tag and open seats
  - the host's seat menu: View profile, Remove (kickPlayer) and Ban (banPlayer)
  - invites built into the page, using RoomInviteDialog's logic
  - the room details
  - Start, for the host only, enabled once the table is full. Guests see "Waiting for <host> to start" instead.
- Swap partners exchanges seats 1 and 2 with setSeatOrder, so the host keeps seat 0 and only their partner changes. This replaces today's swap of seats 0 and 1.
- On a phone, Start opens the rotate sheet for every player: the MPlayFind pattern, with the Android landscape lock.
- The loading, not found, load error, removed, banned and closed states use the centred panel from the spec, with the existing roomlobby_* strings.
- Update scripts/check-room-ui.cjs, scripts/room-test-entry.tsx and scripts/room-test-services.tsx to cover every state.

EXACT MATCH
- Port the boards' CSS value for value with scripts/port-board.mjs. The boards are already blue.
- Keep, from each board:
  - the structure and class names
  - the buttons, with their press depth and shine
  - every animation at the same timing: the riffle (rsplit and rdrop), spread, draw, flip, winner rise and halo, deal flights (fly), pickup (pick), handIn, the panel cross-fade, standPop, miniPop, tick, seatIn, charIn, toastIn, ping, sheetUp and scrimIn
- The only allowed differences are:
  - real data and strings in place of the sample data
  - fluid width from 360 to 430 on portrait phones
  - loops that stop under reduced motion
- New strings get i18n keys in en, dv, hi and bn. The list is at the end of DEAL_AND_ROOMS.md.
- If a board element has no real data or feature behind it, don't drop it and don't fake it. List it and ask me.
- Nothing else may change: every existing check-*-ui script still passes, at desktop and phone sizes.

PROOF, for every screen and state
1. Feed the board's sample data into the test fixtures (scripts/*-test-services, never app code).
2. Screenshot each state beside its reference in artifacts/compare/. Don't commit these.
   - deal-<phase>.png at 1440×900
   - phone-land-deal-<phase>.png at 844×390
   - rooms-<state>.png
   - phone-<screen>.png at 390×844
   Freeze the ceremony clock at each phase. The boards' phase prop shows which moment.
3. Fix every visible difference. Then check 1280 wide, and phones at 360 and 430.
4. Play the whole ceremony for real, online and against AI, in:
   - Mindi with four seats
   - the Mindi 1v1 room variant
   - Gin
   Confirm that the cut's winner leads trick 1 and that every seat has the right number of cards.

RULES
- Never push to GitHub and never run firebase deploy. I push after the review.
- Stage files by path, not with git add -A.
- When you finish, give me a summary:
  - what's done
  - the compare images
  - checks run and their results
  - anything that still differs from its board, and why
  - your questions for me
```

## 10. ChatGPT reviews the opening deal and rooms

```text
Review Claude's branch deal-rooms/claude against design/arena/DEAL_AND_ROOMS.md and its references. The references are design/arena/screens/deal/*.jpg, screens/app/app-15* and app-16*, and screens/phone/phone-land-05*, phone-land-06*, phone-17* and phone-18*. This is a review only: don't edit, commit or switch branches in any existing folder.
1. In C:\Users\Sayyu\thaasbai, run git diff main...deal-rooms/claude --stat. This and the next step leave that folder's files alone.
2. Make a temporary review copy:
   git worktree add --detach ..\thaasbai-review deal-rooms/claude
   cd ..\thaasbai-review
   copy ..\thaasbai\.env.local .env.local
   npm ci
   npm run verify
   npm run dev -- -p 3002
3. Compare every screen and state with its reference, at 1440×900 and 1280 on desktop, 844×390 for phones held sideways, and 390×844 (and 360 and 430) for portrait phones. Check layout, spacing, sizes, colours, type, icons, buttons and states. Open the board's .dc.html to check the exact values.
4. Check the ceremony:
   - It plays on the real table, with no separate scene.
   - Its timing matches the spec.
   - Skip to deal and Escape jump to the deal.
   - Reduced motion follows the spec.
   - Trick 1 starts with the cut's winner in Mindi (four seats and 1v1) and in Gin.
5. Check the rooms:
   - create with and without a Room Card
   - join with a good code, a bad code, and a locked room
   - invites, and recent rooms' statuses
   - the host's seat menu, Swap partners, and Start only once the table is full
   - Start on a phone opens the rotate sheet
6. Stop the server and remove the copy: git worktree remove ..\thaasbai-review
Give me a list of problems, most serious first, each with the file and line and the reference it differs from. End with "ready to merge" or "not yet".
```

## 11. Claude merges the opening deal and rooms

```text
The review of deal-rooms/claude is done and its problems are fixed. In C:\Users\Sayyu\thaasbai:
1. git switch main
2. git merge --no-ff deal-rooms/claude
3. Run npm run verify and every check-*-ui script, at desktop and phone sizes.
Don't push. Tell me when main is ready and I'll push.
```
