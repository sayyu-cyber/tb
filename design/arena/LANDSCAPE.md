# Thaasbai · Arena: the whole app in landscape

**Direction change.** The phone version of Thaasbai now runs in landscape only. Every app screen, the lobby, the rooms
and the tables are drawn for a phone held sideways (844 × 390). An upright phone sees one "turn your phone" screen
instead of any page.

This replaces the portrait app in `MOBILE.md`. The desktop design is unchanged.

| Path | What it is |
| --- | --- |
| `boards/L*.dc.html` | The landscape app screens and their states, 844 wide (and 390 × 844 for the turn gate). |
| `boards/P*.dc.html` | The landscape tables, lobby and result (unchanged, still current). |
| `screens/landscape/*.jpg` | Pixel references at 1.5× (844 → 1266 wide). Tall boards are the whole scrolling page. Start here. |
| `landscape-reference.css` | The shell and layout CSS the boards use (phone shell + landscape layer), blue edition. |

On the canvas they are the rows headed "Landscape app · …", below "Private rooms". The old rows headed "Portrait phone
(replaced by landscape)" are kept for reference only. `MRotate` (a match held upright) is still used.

## What replaces what

| Portrait board | Now |
| --- | --- |
| `MHome`, `MMore`, `PHome` | `LHome`, `LMore` |
| `MProfile`, `MInventory` | `LProfile`, `LInventory` (+ `LInventoryRoom`, `LInventoryPreview`, `LInventoryLocked`) |
| `MFriends` | `LFriends`, `LFriendsRequests`, `LFriendActions` |
| `MMessages`, `MChat` | `LMessages`, `LChat` |
| `MClubs` | `LClubs`, `LClubsChat` |
| `MLeaderboard`, `MAchievements`, `MLeague`, `MHallOfFame` | `LLeaderboard`, `LAchievements` (+ `LAchievementsRanks`), `LLeague`, `LHallOfFame` |
| `MShop`, `MShopBuy`, `MShopShort`, `MShopVip` | `LShop`, `LShopBuy`, `LShopShort`, `LShopVip` |
| `MRewards`, `MSettings` | `LRewards`, `LRewardsClaimed`, `LSettings` |
| `MRooms`, `MRoomsCreate`, `MRoomLobby`, `MRoomLobbyFull` | `LRooms`, `LRoomsBadCode`, `LRoomLobby`, `LRoomLobbyGuest`, `LRoomLobbyFull` |
| `MPlay`, `MPlayFind` | gone: `PLobby` is the Play screen. No rotate sheet, because the phone is already sideways. |
| `MRotate` (match held upright) | stays, for a match in progress. Elsewhere the gate is `LGate`. |
| `PLobby`, `PMindi`, `PGin`, `PResult`, `PCut`, `PCutGin` | unchanged |

## Orientation

**Landscape everywhere.**
- The phone layout applies on `(orientation: landscape) and (max-height: 500px)`.
- Design width is 844 and it holds from 740 to 932 wide (checked on the boards). Height is 390 nominal, 360 to 430 real.
- Desktop at 768 wide and up with a normal height is untouched.
- Small phones (640 to 739 wide) need three narrow variants, because the boards run out of room:
  - `LProfile`: the two game cards stack their numbers under the ring.
  - `LRooms`: the top bar drops its "Play with your people" line.
  - `LRoomLobby`: the top bar drops the password pill and moves share into the seat menu.
  - In every board the 264 / 312 px side columns can shrink to 232 px, and the 4 to 7 across grids lose one column.

**The turn gate** (`LGate`, `LGateAndroid`, 390 × 844)
- Shown on any page when the phone is held upright. It is a full-screen overlay, so the page underneath keeps its state and
  nothing navigates. It goes the instant the phone turns.
- Pure CSS, as the old gate was: `(orientation: portrait) and (max-width: 767px) and (pointer: coarse)`. Lock body scrolling
  only while it is rendered.
- A match held upright keeps `MRotate` (live turn status, Leave table), not `LGate`.
- Content, top to bottom:
  1. the logo and wordmark
  2. the turning phone: a phone that turns −90° and shows a tiny landscape Home (`turnPhone`, 3.2 s, `cubic-bezier(.6,0,.3,1)`; under reduced motion it rests sideways)
  3. the label "Thaasbai plays sideways" and the title "Turn your phone sideways"
  4. the line "The whole app is built for landscape. Turn your phone and carry on right where you were."
  5. a chip: "You were on {page}"
  6. Android only: a full-width lime **Go landscape** button
  7. two tip cards: rotation lock, and play full screen (install the app)
- **Go landscape** (Android, where `screen.orientation.lock` exists) runs, from the tap:
  1. `document.documentElement.requestFullscreen({ navigationUI: "hide" })`
  2. `screen.orientation.lock("landscape")`
  If either fails, nothing breaks and the gate stays. iPhone cannot be rotated by a page, so there the gate only explains.
- Also try the same two calls quietly on the first tap of any session (sign in, Play). On success the gate never shows.
- `public/manifest.json`: change `"orientation": "portrait"` to `"landscape"`. The installed Android app then opens sideways
  by itself. (iOS ignores it, which is why the tip card says "Add to Home Screen" for full screen.)
- Copy to add, in all four languages: `gate_label` "Thaasbai plays sideways", `gate_title` "Turn your phone sideways",
  `gate_body`, `gate_youWereOn` "You were on {page}", `gate_goLandscape` "Go landscape", the iPhone and Android tip titles
  and bodies ("Screen not turning?", "Auto-rotate off?"), and "Play full screen" with its two bodies. Reuse `rotate_lockHint` where the text matches.
- On a non-touch device in a narrow, tall window, show the same gate with "Make this window wider".

## The shell

The frame is 844 × 390. Everything inside it is sized in px, so it holds on a 360 to 430 tall screen.

| Part | Spec |
| --- | --- |
| Rail | 76 px wide, left, full height, `env(safe-area-inset-left)` added. The logo, then Home, Friends (blue badge), the raised Play diamond, Shop, More. The active slot gets a lime pill. A short lime line sits on its right edge. |
| Top bar | 52 px tall, sticky, a black gradient with a 14 px blur and a hairline. Home shows the wordmark. Every other page shows a title block: a small lime dashed label over the page name in chrome (19 px). A drill-down (a room) shows a back button instead. The right side is always the coins chip, the bell and your avatar (all 34 px). |
| Content | 768 × 338 at 844 × 390: page padding 16 left and right, 64 at the top (52 + 12), 28 at the bottom, gap 12. Add the safe-area insets on the right and bottom. |
| Stage | Fixed to the viewport behind the page: the blue glow, a perspective grid floor 150 px tall, the light beam. |
| Rail items | Pages reached from More light **More**: Profile lights none. Friends, Shop and Home light themselves. The Play lobby has no rail (it is immersive, with its own back arrow). |

**Layout system** (`landscape-reference.css`)
- Columns: `.cols` with `.c2 … .c6`, and `.sideR` / `.sideL` (264 px side column), `.sideR2` / `.sideL2` (312 px). Add `.stretch` to equalise heights.
- The first 314 px of every page is a complete composition: a hero or the main task on one side, supporting panels on the other. More follows below the fold.
- **Scrolling pages** (Home, Profile, Inventory, Clubs, Achievements, League, Hall of Fame, Shop, VIP, Rewards, Rooms): the page scrolls, the rail and top bar stay.
- **Fixed screens** (Friends, Messages and Chat, Leaderboard, Settings, the room lobby): the page is `100dvh − 52 px` and does not scroll. Panes scroll inside (`.scrl`), with a short fade at the clipped edge.
- Buttons: 44 / 38 / 32 px (`.btn`, `.btn.sm`, `.btn.xs`). Tap targets stay at 38 px or more, 34 px for chips and tabs. Text is 11.5 px or more, apart from the uppercase labels (9 to 10 px).

**Patterns**

| Pattern | Spec |
| --- | --- |
| Side panel | Replaces the portrait bottom sheet. Opens from the rail edge, 392 px (`.sheet`), 540 px (`.sheet.w2`) or 640 px (`.sheet.w3`), or from the right edge (`.sheet.right`). `sideIn` .38 s `cubic-bezier(.2,.9,.25,1)`. Scrim `rgba(0,0,0,.66)` with a 3 px blur. Used for More, the friend actions, and the card preview. |
| Dialog | A centred card on the content area (`.ldlg > .card`): the buy dialog, the not-enough-coins state, the claimed-day celebration, the room password. `pop` .32 s. |
| Toast | Top right, under the bar: 300 × 46 px. |
| Tabs | Equal segments (`.tabs`) for 2 to 4 labels, otherwise a chip row (`.chips`). |
| Side scrollers | `.hs` bleeds to the screen edges with 16 px padding. The next card peeks in at the right. |
| Press, lip, shine, motion | Exactly as the desktop boards. Every loop stops under `prefers-reduced-motion`. |

## Screens

| Board | Route | Reference | Composition |
| --- | --- | --- | --- |
| LHome | `/home` | `landscape-01-home` | Left, a 460 px hero: label, the title, the tagline, Play Now and Find Friends, with the four Tens on the lit ring. Right, the Weekend League strip, the Ranks Locked strip and your card (rank meter, Trophies, Wins, Win rate). Below: Quick Play (Mindi, Gin Rummy, Equipped) 3 across; Current Rank beside Weekend League; shortcuts 3 × 3 beside three stacked news items; the footer. |
| LMore | the More panel | `landscape-01b-more-panel` | A 540 px side panel. Left: profile, the VIP card, Settings. Right: Explore, a 3 × 3 tile grid (Leaderboard, Weekend League with its live dot, Clubs, Messages with its badge, Inventory, Achievements, Daily Rewards, Missions, Hall of Fame). |
| LProfile | `/profile` | `landscape-02-profile` | Section chips. The player card on the left, Statistics (4 across) and Game Stats (Mindi and Gin Rummy, ring plus numbers) on the right. Below: Achievements (scroller), Milestones with the "Next at the table" slot, and Match History. |
| LInventory, LInventoryRoom | `/inventory`, `/collection`, `/room-cards` | `landscape-03`, `03b` | Tabs and the collected meter, then the Loadout as five slots across. Collection: category chips, search, a 7 across grid with a "4/13 Collected" cell. Room Cards: the card and its Activate button beside Buy with Coins (3 × 2). |
| LInventoryPreview, LInventoryLocked | card preview | `landscape-03c`, `03d` | A 540 px side panel from the right: the card art on the lit ring, the name, "On Neon Arena" with a mini fan, Rarity, Status, Price, and Equip or Buy for. |
| LFriends, LFriendsRequests | `/friends` | `landscape-04`, `04b` | Fixed. The list panel on the left (tabs, Online only, search, sort, rows with play, message and "…"). Right: the three count tiles (they open their tab), Add Friend, Friend Suggestions and Recently Played. Requests puts a label beside each group. |
| LFriendActions | the "…" menu | `landscape-04c` | A 372 px side panel from the right: profile, Invite to Mindi, Invite to Gin Rummy, Remove Friend, Cancel. |
| LMessages, LChat | `/messages` | `landscape-05`, `05b` | Fixed, two panes. Left: the five threads with unread dots. Right: the open chat (header, Invite to Mindi, bubbles, composer), or "Select a conversation" when none is open. |
| LClubs, LClubsChat | `/clubs` | `landscape-06`, `06b` | My Club hero: the club identity with a capacity meter and vertical Members / Club Chat tabs, and the body (six members in 2 × 3, or the chat). Then the tagline with Create Club, Browse / My Clubs, search, and Suggested Clubs in 2 × 2. |
| LLeaderboard | `/leaderboard` | `landscape-07` | Fixed. Weekly / Monthly (Soon) / All Time / Friends chips with the resets pill. Left: the podium and Your Rank. Right: search, You · #10, the rewards button, and the list (it scrolls and ends with Weekly Rewards and how ranks are ordered). |
| LAchievements | `/achievements` | `landscape-08`, `08b` | The progress ring and copy, with two tiles (coins earned, still to earn). Category chips with counts. Ten achievements in 2 columns. |
| LLeague | `/tournament` | `landscape-09` | Hero with the countdown and the qualify pill on the left. Mindi and Gin Rummy buttons and the Weekend Champion panel on the right. Four rule cards, then the standings in two columns with your row lit. |
| LHallOfFame | `/hall-of-fame` | `landscape-10` | The all-time strip with "You · No. 5". The podium: 2, 1 (wider, gold), 3. Ranks 4 to 9 in two columns, your row lit. |
| LShop | `/shop` | `landscape-11` | The balance chip and the four tabs on one row. Featured items 3 across (two rows), the VIP strip, and four coin packs across with Popular and Best Value flags. |
| LShopBuy, LShopShort | buy dialog | `landscape-11b`, `11c` | A centred dialog. The preview on the left. Price, balance and "After purchase" (or "More coins needed" and "Not enough coins.") on the right, with Cancel and Buy for (or Get Coins). |
| LShopVip | `/shop` (VIP Pass) | `landscape-12` | The tabs, then the VIP hero (six perks, the showcase) beside the Weekly / Monthly plan cards and Activate. Coin packs follow, as rows in two columns. |
| LRewards, LRewardsClaimed | `/rewards`, `/missions` | `landscape-13`, `13b` | Daily Login across the top: seven tall day cells (Today lit, Day 7 the gift), the streak pill and the cycle meter. Daily Missions and Weekly Missions in two columns. Claiming opens the "Day 6 claimed!" dialog. |
| LSettings | `/settings` | `landscape-14` | Fixed, two panes. Left: Preferences, Account, Privacy & security, Help & support, with the brand and version. Right: the selected group's controls (toggles, Language as a 4-way segment). Log Out lives in Account. |
| LRooms, LRoomsBadCode | `/rooms` | `landscape-15`, `15b` | Join with a code (six boxes, Paste code, Join room) and the Room Card strip on the left, Create a room (game, seats, password, Create room) on the right: side by side, no tabs. Below: Invites (3 across) and Recent Rooms. |
| LRoomLobby, LRoomLobbyGuest, LRoomLobbyFull | `/rooms/[code]` | `landscape-16`, `16b`, `16c` | Fixed. The top bar carries the room code, a password pill, copy and share. Four seat cards sit round the table oval, with Team A and Team B in the corners, Swap partners and Leave room. Right: Room Details and Start match. Along the bottom: Invite friends. When the table is full, Start match turns lime and there is no rotate sheet. |
| LGate, LGateAndroid | any page held upright | `landscape-17`, `17b` | The turn gate (above). |

The Play lobby, the cut and deal, the tables and the hand result are the existing `P*` boards (`phone-land-01` to `06`).
Play on the rail goes straight to `PLobby`: there is no portrait lobby and no rotate sheet any more.

## New copy

Where the landscape boards add or change text, use existing i18n keys when the text matches and add the rest, in all four languages:

| Screen | Text |
| --- | --- |
| Messages | "Select a conversation", "Choose a thread on the left to read and reply.", "Go to Friends" |
| Friends | "Add Friend" (the portrait board said "Add") |
| Clubs | "Create Club" (was "Create"), the capacity meter "24 / 30 members" |
| Hall of Fame | "You · No. {n}", "Ranks 4–9" |
| Achievements | "Coins earned" and "Still to earn" (both come from the data, not typed in) |
| Inventory | "Collection", "{n}/{total} Collected" |
| League | "How it works" |
| Rooms | the Team A / Team B labels, "Waiting for {name} to start", "Invite" and "Waiting" on open seats |
| Gate | listed under "The turn gate" |

## Building it

- The boards are already blue, so `scripts/port-board.mjs` has nothing to recolour. Namespace them the same way.
- Build the landscape layer on the existing phone shell. The boards use these class names, so keep them: `.mrail`, `.mtop`, `.mpage`, `.mstage`, `.sheet`, `.mscrim`, `.ldlg`, `.cols`, `.c2 … .c6`, `.sideR`, `.sideL`, `.fit`, `.scrl`, `.ltile`, `.lstat`, `.gate`.
- In the app, the `.mview` box the boards use for sheets is `position: fixed; inset: 0`, and so are the stage, the rail and the top bar (sticky).
- Use `env(safe-area-inset-*)` where the boards leave room. Don't draw a status bar.
- The sample data is the same as the desktop boards. The app shows real data. Derived numbers (coins earned and so on) come from it.
- Not drawn, and so not decided: the other three Settings groups (they reuse the desktop controls inside the same right pane), a typing state for the chat composer, and the small-phone variants listed under "Orientation".
