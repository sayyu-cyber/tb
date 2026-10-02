# Thaasbai · Arena: phone screens

> **Replaced by `LANDSCAPE.md` for the app screens.** The phone version now runs in landscape only, so the portrait
> boards (`boards/M*.dc.html`) are kept for reference and must not be built. What still applies from this file:
> - the landscape table screens (`PLobby`, `PMindi`, `PGin`, `PResult`) and "Tables fit what is visible"
> - `MRotate`, the gate for a match held upright, and "The turning phone"
> - "Copy shortened to fit" for the tables
> Everything about portrait app screens, the bottom tab bar, bottom sheets, `MPlay`, `MPlayFind` and `PHome` is superseded.

These are the phone versions of the app screens and the card tables. They use the same blue edition palette, type
and components as `APP_SCREENS.md`. There are no new colours or fonts: only the layout, sizes and a few patterns change.

| Path | What it is |
| --- | --- |
| `boards/M*.dc.html` | Portrait app screens, 390 wide and as tall as the page. |
| `boards/P*.dc.html` | Landscape screens: the four table screens at 844 × 390, and `PHome`, the app held sideways (844 wide). |
| `screens/phone/*.jpg` | Pixel references at 2× (portrait 780 wide, landscape 1688 × 780). Start here. |

On the canvas they are the four rows headed "Phone · …", below the desktop app screens.

## Two orientations

- **App screens are portrait.** They are designed at 390 × 844 (a current iPhone). They must hold from 360 to 430 wide:
  - one column
  - 16 px side gutters
  - nothing fixed-width except icons and avatars

  The phone layout applies below 768 px wide, and on any phone held sideways (see below). Otherwise the desktop
  layout applies.
- **App screens also work held sideways** (`PHome`). The tab bar stands up as a rail, and the page stays one column.
- **The table screens are landscape: Lobby, Mindi, Gin and Hand result.** They are designed at 844 × 390.
  - Keep 44–48 px clear on the left and right for the notch and rounded corners, and about 16 px at the bottom.
  - Only the match screens insist on landscape. The Play lobby has a portrait version (`MPlay`), so the phone turns
    once, when a game is starting, and never in the middle of browsing. "Turning the phone" below has the whole flow.

## Turning the phone

This replaces the current rotate gate and the rule that gates the Play lobby.

**Which screens need landscape**
- Only the screens inside a match need landscape:
  - the Mindi and Gin tables, in every mode (online, ranked, Vs AI, Pass & Play)
  - spectating
  - the hand result
- Everything else works in both orientations, including the Play lobby: `MPlay` in portrait, `PLobby` sideways.

**The turn happens at the Play button** (`MPlay` → `MPlayFind`)
- Play in the portrait lobby starts looking for a table at once, then opens the rotate sheet over the lobby.
- The sheet shows:
  - the turning phone
  - "The table plays sideways" and "Rotate your phone"
  - "We'll keep looking for a table while you turn."
  - a live status row: "Finding a Mindi table", with the mode and the time spent looking
  - Stop looking, and the lock hint
- For Vs AI and Pass & Play there is nothing to wait for. The status row reads "Your Mindi table is ready" with a lime
  tick, and the game starts only once the phone is sideways, so no timer runs while the player turns it.
- When the phone turns, the sheet goes and the landscape lobby carries on with "Finding a table". The table then opens
  in landscape.

**Android turns the table for you**
- Where `screen.orientation.lock` exists (Chrome on Android and the installed app), the same Play tap does two things,
  because it counts as a user gesture:
  1. `document.documentElement.requestFullscreen({ navigationUI: "hide" })`
  2. `screen.orientation.lock("landscape")`
- If both succeed, the screen turns on its own and the sheet only flashes. If either fails (on iPhone, desktop, or a
  refusal), nothing breaks and the sheet stays.
- "Go landscape" repeats the same two calls from a fresh tap. It appears only where the lock exists; on iPhone the
  sheet shows Stop looking and the hint alone.
- When the player leaves the match, call `screen.orientation.unlock()`, and `document.exitFullscreen()` if the app
  entered fullscreen.

**The installed app must be allowed to turn**
- `public/manifest.json` has `"orientation": "portrait"`. That pins the installed Android app upright, so it can
  never reach a table. Change it to `"any"`.

**A table held upright** (`MRotate`)
- This happens on an iPhone, when auto-rotate is off, or when a player turns back mid-hand. The gate covers the live
  table, which shows blurred behind it.
- Nothing pauses and nothing is forfeited. The gate shows what is happening:
  - Your turn: "Your turn · Follow spades · 10s left". The ring counts down, and the row pulses (`hurry`) from 5 s.
  - Otherwise: "Ibrahim is playing · You're next".
- Buttons:
  - Go landscape (Android only)
  - Leave table, through the existing leave and confirm flow
  - the lock hint
- The chip at the top names the game and mode, with the trick count on the right.
- The gate must stay pure CSS:
  - It goes the instant the phone turns, with no JavaScript, as now: `(orientation: portrait) and (max-width: 767px)
    and (pointer: coarse)`.
  - Lock body scrolling only while the gate is rendered, as now.
- Copy:
  - Reuse `rotate_title` ("Rotate your phone") and `rotate_lockHint`.
  - `rotate_body` ("Thaasbai is built for landscape…") is no longer true, so replace it with two keys: one for the
    table ("Your seat is held and the hand keeps going. Turn sideways to play your cards.") and one for the lobby
    ("We'll keep looking for a table while you turn.").
  - Add keys, in all four languages, for "The table plays sideways", "Go landscape", "Leave table", "Stop looking",
    "Finding a {game} table", "Your {game} table is ready", "Your turn", "{name} is playing", "You're next" and the
    Android hint.

**The turning phone** (`.turn`, 132 px on the gate and 96 px on the sheet)
- The phone outline holds a landscape table, drawn sideways so that it reads correctly once the phone has turned.
- A lime arc arrow above it shows the direction.
- It turns on `turnPhone`: 2.8 s, `cubic-bezier(.6,0,.3,1)`. It holds upright, turns −90°, holds, and turns back.
- Under reduced motion it rests sideways.

**App screens held sideways** (`PHome`)
- A phone held sideways matches `(orientation: landscape) and (max-height: 500px) and (pointer: coarse)`. On app screens
  it keeps the phone layout:
  - The tab bar stands up as a 76 px rail on the left: the logo, then the same five slots, with the Play diamond in
    the middle.
  - The top bar is 52 px.
  - The page is one centred column up to 560 px wide.
  - Sheets open from the rail as a 392 px side panel (`sideIn`, .38 s).
- So a player who leaves a match still holding the phone sideways lands on a Home that works, and never has to turn
  back.
- It also fixes a real problem: the desktop rail's ten icons don't fit in a 390 px tall screen.

**Tables fit what is visible**
- The table boards are 844 × 390 compositions. A browser tab shows less than that (toolbars, notch insets).
- Scale each composition evenly to fit the visible viewport (`100dvh` / `visualViewport`), centred on the stage
  background, the way the desktop tables scale. Never crop the hand or the action button.
- A phone held sideways (max-height 500 px) gets these phone compositions. Larger screens keep the desktop tables.

## The phone shell

**Top bar**
- 60 px tall plus `env(safe-area-inset-top)`. Sticky. A black gradient with a 14 px backdrop blur and a hairline along the bottom.
- Left: the lime logo diamond (30 px) and the `THAASBAI` wordmark in chrome.
- Right, in order:
  - The coins chip (36 px tall, lime gem, lime `+` button).
  - The bell (38 px, with its blue count).
  - Your avatar (38 px, ringed in your rank colour). It opens Profile.
- The chat thread swaps this bar for its own: back, avatar, name, status and profile.

**Page header**
- A dashed lime label, the page name in chrome at 46 px, and an optional sub line.
- Long names drop to 40–42 px: Achievements and Daily Rewards.
- When the desktop header has an action (Add Friend, Create Club), it sits to the right of the name as a small lime button.

**Bottom tab bar**
- 62 px tall plus `env(safe-area-inset-bottom)` (22 px in the boards), for 84 px in all.
- Five slots:

  | Slot | Notes |
  | --- | --- |
  | Home | |
  | Friends | Blue badge with the request count |
  | Play | A raised lime diamond with a darker lip under it. It glows on a 2.6 s loop (`playglow`). |
  | Shop | |
  | More | |

- The active slot gets a lime pill behind its icon, and its label turns white.
- These pages light up **More**: Leaderboard, Weekend League, Clubs, Messages, Inventory, Achievements, Rewards, Missions, Hall of Fame and Settings. Profile lights no slot.

**More sheet**
- A bottom sheet, in this order:
  1. A profile row (avatar, name, rank, "Profile" link).
  2. The VIP card.
  3. A 3 × 3 tile grid: Leaderboard, Weekend League (live dot), Clubs, Messages (badge), Inventory, Achievements, Daily Rewards, Missions, Hall of Fame.
  4. A Settings row.
- It opens from More. Tapping the scrim closes it.
- It replaces the current bar, which scrolls sideways through all ten icons. Every destination is still at most two taps away.

## Patterns

| Pattern | Spec |
| --- | --- |
| Sheet | Used for the purchase confirm in Shop and the friend actions in Friends' "…" menu, instead of dialogs and menus. Top corners 24 px, a 40 × 5 handle, and a short lime line across the top edge. Slides up with `sheetUp` .42 s `cubic-bezier(.2,.9,.25,1)`. Scrim `rgba(0,0,0,.66)` with a 3 px blur, `scrimIn` .25 s. |
| Celebration | Stays a centred card, as on "Day 6 Claimed!". `pop` .42 s `cubic-bezier(.2,1.3,.4,1)`. |
| Tabs | Equal segments (`.tabs`) when 2–4 labels fit: Friends, Clubs, Inventory, Shop and VIP. Otherwise a scrolling chip row (`.chips`) whose active chip starts the row: Profile, Leaderboard, Achievements and Settings. |
| Side scrollers | `.hs` runs to the screen edges with 16 px padding and snaps to each card: Latest Updates, Loadout and the profile achievements. |
| Rows | 58–68 px tall. Main controls are 44 px or taller. Compact icon buttons (in rows and the top bar) are 38 px, with at least 6 px between them. |
| Buttons | 52 px for the main action and 44 px (`sm`) for the rest. A button that ends a card runs the full width. The 3D lip, press depth and shine sweep are the same as on desktop. |
| Thread | The chat is its own screen: it slides in (`slideIn` .32 s), hides the tab bar and pins the composer to the bottom. |

**Animations**
- Every desktop loop stays on the phone:
  - `drift` motes, `breathe` and `blink` on the live dots
  - `holo` on the Tens and `bob` on the home fan
  - `spin`, and `chase` on the table lights
  - `handIn`, `toss`, `flipIn`, `stamp`, `rays` and `dealIn` on the tables
- The phone adds `playglow`, `sheetUp`, `scrimIn`, `slideIn` and `pop`.
- All loops stop under `prefers-reduced-motion`.

## Screens

| Board | Route | Reference | What changes from desktop |
| --- | --- | --- | --- |
| MHome | `/home` | `phone-01-home` | The hero becomes a title screen: the four Tens on the lit ring, with Play Now and Find Friends under it. The Weekend League link and the rank lock become two strips. Stats become a 3 × 2 grid, adding Win rate (54 of 96). Quick Play is two covers side by side, then the loadout row. Latest Updates scrolls sideways. |
| MMore | the More sheet | `phone-01b-more-menu` | New: the phone's way to every page. |
| PHome | any app screen, held sideways | `phone-land-00-home-sideways`, `00b` | New: the rail, the centred column and the side-panel sheets. |
| MPlay, MPlayFind | `/play` in portrait | `phone-15-play-lobby`, `15b`, `15c` | New: the portrait lobby. The decks sit on the podium, the modes are listed with their detail line, the Weekend League strip and your rank follow, and Play is docked above the tab bar. Play opens the rotate sheet: `15b` is iPhone, `15c` is Android. |
| MRotate | a match screen in portrait | `phone-16-table-upright`, `16b` | Replaces the current gate. `16` is iPhone, `16b` is Android. |
| MProfile | `/profile` | `phone-02-profile` | The profile tabs become chips. The player card stacks. Statistics are 2 × 2 tiles. Achievements scroll sideways. In Match History each row shows the mode and date under the game, with the result and score on the right. |
| MInventory | `/inventory`, `/collection`, `/room-cards` | `phone-03-inventory` | Collection progress sits under the title. The Loadout scrolls sideways. Card backs are 3 across, with no description (it lives in the preview). Room Cards stack, with Buy with Coins 3 × 2. |
| MFriends | `/friends` | `phone-04`, `04b`, `04c` | The three counts become tiles that open their tab. Search, sort and "Online only" go inside the list panel. "…" opens the actions sheet. Suggestions and Recently Played follow the list. |
| MMessages, MChat | `/messages` | `phone-05`, `05b` | The list and the thread are two screens. "Invite to Mindi" is a full-width blue button under the thread header. |
| MClubs | `/clubs` | `phone-06`, `06b` | My Club comes first (Members / Club Chat), showing six members and "All 24 members". Browse, search and Suggested Clubs follow, one card per row. |
| MLeaderboard | `/leaderboard` | `phone-07-leaderboard` | Order: the podium, Your Rank, the list, Weekly Rewards, then how ranks are ordered. Each row shows rank, win rate and games played under the name. The podium drops matches and keeps the win rate. |
| MAchievements | `/achievements` | `phone-08-achievements` | Overall progress is one card with the ring on the left. Categories become chips. Rows show the reward and state on the right, with progress along the bottom. |
| MLeague | `/tournament` | `phone-09-weekend-league` | The hero stacks: countdown, then qualification. Mindi and Gin Rummy are two full-width buttons. The rules are 2 × 2. |
| MHallOfFame | `/hall-of-fame` | `phone-10-hall-of-fame` | #1 is a full-width card, with #2 and #3 side by side under it. |
| MShop, MShopBuy, MShopShort | `/shop` | `phone-11`, `11b`, `11c` | The balance card is full width. Tabs are Featured · Permanent · Coins · VIP Pass. Featured items are 2 across. The purchase dialog becomes a sheet with an art preview. |
| MShopVip | `/shop` (VIP Pass) | `phone-12-vip-and-coin-packs` | The hero stacks: perks, VIP-only cosmetics, plan cards and Activate. In the coin pack rows, the Popular and Best Value flags sit on the row's top edge. |
| MRewards | `/rewards`, `/missions` | `phone-13`, `13b` | The seven days are a 4 + 3 grid, and Day 7 spans two columns. Claimed ticks sit on the tile corner. Missions show the reward on the right and progress along the bottom. |
| MSettings | `/settings` | `phone-14-settings` | The side nav becomes chips. Language is a 4-way segment under its row. The brand card and Log Out end the page. |
| PLobby | `/play` held sideways | `phone-land-01`, `01b` | The podium and deck boxes sit in the centre (the desktop boxes at 0.56). The Weekend League card and your rank are on the left. The modes are a 2-column grid of names, ×2 as a corner tag, with the detail line, CTA and "Finding a table" on the right. |
| PMindi | Mindi table | `phone-land-02-mindi` | The blue edition of the landscape Mindi board already on the canvas ("Mindi on a phone"). |
| PGin | Gin table | `phone-land-03`, `03b`, `03c`, `03d` | Top bar: your melds and deadwood on the left, the turn clock on the right. Hussain's ten backs fan above his frame. There are eleven compact cards, with group tags above each meld. Discard is bottom right. The Gin and Not quite Gin banners are compact. |
| PResult | hand-over | `phone-land-04-result` | The headline and the four Tens are on the left. The four stats (2 × 2), Play again / Lobby and "Replay the reveal" are on the right. |

## Copy shortened to fit

Where the phone can't fit the desktop text, the boards use a shorter version:

| Screen | What changed |
| --- | --- |
| Inventory | The label reads "Cosmetics and Room Cards". |
| Shop | The label reads "Cosmetics and coin packs", and the tab "Coins". |
| Friends | "Connect and play", and the buttons "Add" and "Create". |
| Leaderboard | "Compete and climb the ranks", and "Soon" on Monthly. |
| Hall of Fame | "By peak trophies". |
| Rewards | "Come back every day". Day 6 reads "Today", and the mission counts read "2/3 done". |
| Result | "Lobby" (for "Back to lobby"). |
| Gin | Group tags read "Run 3 / Run 4 / Set 3 / DW 10". |

Use existing i18n keys where the text is the same, and add short keys for the rest.

## Building it

- The boards are already blue, so `scripts/port-board.mjs` has nothing to recolour. Namespace them the same way.
- Use a real phone layout below 768 px. Don't pin a desktop viewport.
- Sheets and dialogs are drawn inside a 390 × 844 `.mview` box because the boards are full-length pages. In the app that box is `position: fixed; inset: 0`, and so are the stage background, the top bar (sticky) and the tab bar.
- Use `env(safe-area-inset-*)` where the boards leave room for the notch and home indicator. Don't draw a status bar.
- The sample data is the same as the desktop boards (Sayyu, Gold, 58 trophies, 1,240 coins…). The app shows real data.
