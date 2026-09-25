# Thaasbai · Arena — app screens (blue edition)

These are the fourteen boards for the rest of the app, outside the card tables. They sit on the same
canvas as the table boards (rows "Home and you", "Friends and clubs", "Compete" and "Store, rewards
and settings"). They use the same Arena system described in `README.md`, with one difference: they
were drawn in **blue `#00BCC8`** from the start, so there is no violet to convert.

This file is reference material only. Nothing in `design/` is imported, built or linted by the app.
Who builds what, and in which order, is in `WORKSPLIT.md`.

## What's here

| Path | What it is |
| --- | --- |
| `screens/app/*.jpg` | Pixel reference for every board and its key states. **Start here.** |
| `boards/<Board>.dc.html` | Exact source of each board (CSS, markup, demo logic). Read it for values. It needs the design-canvas runtime to render. `scripts/port-board.mjs` can namespace its CSS exactly as it did for the table boards. |
| `app-reference.css` | The shared shell and pieces that all fourteen boards use: sidebar, top bar, stage background, panels, tabs, pills, rank badges, meters, avatars, coin gem, rarity colours, card-back and table-swatch art. Not imported. |

## Palette

This is the same ramp the app already declares in `styles/arena.css`:

| Role | Hex |
| --- | --- |
| Stage, rails | `#000000` |
| Blue: felt, other players, secondary actions, info | `#00BCC8` (hi `#4FE3EC`, soft `#6FE9F0`, lo `#00727A`, deep `#005A61`) |
| Lime: you, your team, the main action, progress | `#C6FF33` (hi `#DDFF70`, lo `#6F9412`) |
| White: cards, type | `#FFFFFF` |
| Graphite: panels, icon buttons | `#121217` |
| Danger: remove, kick, log out, "not enough coins" | `#FF6B80` |

- **Text on blue is dark** (`#00191B`). White on `#00BCC8` fails contrast.
- **Coins** are a lime gem, replacing the gold circular "T" coin in `components/economy/CoinBalance.tsx`.
- **Rarity** needed new colours because violet is gone. `RARITY_COLORS` in `data/cosmetics.ts` still says grey / blue / purple / amber.

  | Rarity | Colour |
  | --- | --- |
  | Common | `#BEBECA` |
  | Rare | `#00BCC8` |
  | Epic | `#C6FF33` |
  | Legendary | `#FFC940` |

- **Rank badges** are hexagons in the existing metals: Bronze, Silver, Gold `#E0B52E`, and Platinum with a blue edge.
- **Avatar tints** on the boards are placeholders. In the app they come from the player's Avatar Color preset.

## The shell (every signed-in screen)

The boards use `components/layout/AppShell.tsx`, `TopBar.tsx` and `sidebar/*`.

- **Sidebar, collapsed rail (the app default)**
  - 84 px of black glass. From top to bottom: the logo diamond (a lime crown in a black diamond), your avatar with a lime presence dot, then the ten nav items from `sidebarItems.ts`.
  - The ten items: Home, Play, Friends, Leaderboard, Inventory, Shop, Clubs, Tournaments, Achievements, Settings.
  - The active item is a lime tile with a black icon. Counts are blue badges (e.g. 2 friend requests).
  - Footer: the VIP button (foil lime/blue/white), then Online Players and Active Chats tiles with counts.
- **Sidebar, expanded (256 px)** is shown on the Home board.
  - The "THAASBAI" wordmark and the collapse toggle.
  - An identity card: avatar, name, and rank badge.
  - Uppercase nav labels.
  - A VIP card: "Upgrade to / VIP Pass / Get more matches, exclusive rewards and more! / View Plans".
  - Online Players with avatars and "+N". Active Chats with a blue count.
- **Top bar** is 76 px tall:
  - The search pill "Search games, modes...", with a `/` key hint.
  - The coin balance (lime gem, amount, and a lime "+" that means Get coins).
  - The bell, whose blue count = friend requests + unread DM threads.
  - The profile chip: avatar, name, rank badge, chevron.
- **Stage background** (`.stagebg`): black, a soft blue glow, a receding blue floor grid at the bottom, and one spotlight beam. The app already paints `ar-stage` in `AppShell.tsx`, so match that.

## Shared pieces

All of these are in `app-reference.css`.

- **Page header:** a lime tracked label with a dash, then a chrome Space Grotesk H1 (56 px), and an optional Inter Tight subline.
- **Panel:** near-black glass with a 1 px 10% white border and a 16 px radius. The `tick` variant adds lime corner ticks; the `tick b` variant uses blue ticks for secondary panels.
- **Tabs / segmented:** the active tab is lime with black text. Counts inside tabs are blue. A disabled tab has a "Coming soon" chip.
- **Pills:** lime (live, you, equipped), blue (event, popular), line (neutral) and dim.
- **Meters:** lime (you), blue (in progress) and segmented (rank progress).
- **Buttons:** the same buttons as the table boards.
  - Lime primary, blue secondary (dark text), ghost, icon.
  - Disabled ghost and blue buttons turn graphite.
- **Card-back art** (`.cb.*`): CSS stand-ins for all 13 backs, because `/public/cosmetics/*` doesn't exist. The backs are Arena, Classic Gold, Maldives Sunset, Mahogany, Deep Ocean, Inferno, White Marble, Frostbite, Shadow Veil, Neon Cyber, Dragon Scale, Phoenix Rebirth and VIP Royal Gold.
- **Table swatches** (`.tt.*`) cover the table themes.

## Screens

| Board | Route | App files today | Screens |
| --- | --- | --- | --- |
| Home | `/home` | `app/(main)/home/page.tsx`, `components/home/*` | `app-01` |
| Profile | `/profile` | `app/(main)/profile/page.tsx`, `components/profile/*` | `app-02` |
| Inventory (+ Room Cards) | `/inventory`, `/room-cards`, `/collection` | `app/inventory`, `components/roomcards/RoomCardManager.tsx`, `components/collection/CollectionPage.tsx` | `app-03` |
| Friends | `/friends` | `app/(main)/friends/page.tsx` | `app-04`, `app-04b` |
| Messages | `/messages` | `components/messages/MessagesClient.tsx` | `app-05` |
| Clubs | `/clubs` | `components/clubs/*` | `app-06`, `app-06b` |
| Leaderboard | `/leaderboard` | `components/leaderboard/*` | `app-07` |
| Achievements | `/achievements` | `components/achievements/*` | `app-08` |
| Weekend League | `/tournament` | `app/tournament/page.tsx` | `app-09` |
| Hall of Fame | `/hall-of-fame` | `app/hall-of-fame/page.tsx`, `components/halloffame/*` | `app-10` |
| Shop | `/shop` | `components/shop/*` | `app-11`, `app-11b`, `app-11c` |
| VIP Pass + coin packs | `/shop` (VIP Pass tab) | `components/shop/*`, `components/vip/*` | `app-12` |
| Daily rewards + missions | `/rewards`, `/missions` | `components/rewards/*`, `components/missions/MissionsPanel.tsx` | `app-13`, `app-13b` |
| Settings | `/settings` | `app/(main)/settings/page.tsx`, `components/settings/*`, `components/moderation/BlockedPlayers.tsx` | `app-14` |

What each board adds on top of today's screen:

- **Home**
  - A hero with key art: the four foil Tens fanned over a lime LED ring, and the Weekend League link card in the corner.
  - The Ranks Locked bar, shown only during the league.
  - The PlayerHUD strip.
  - Quick Play covers for Mindi and Gin Rummy, with an Equipped loadout card beside them.
  - Current Rank, which now also shows the weekly tier reward.
  - The Weekend League card with its rules pills, a 3×3 shortcut grid, Latest Updates, and the footer.
- **Profile**
  - A banner card: big avatar with its rank hex, ID chip, trophies, and member-since date.
  - Statistics tiles.
  - Game Stats with win-rate rings, plus the locked "Next at the table" card.
  - An achievements strip, Milestones, and Match History rows with Win/Loss chips.
- **Inventory**
  - A loadout strip with the five equip slots.
  - Category chips with owned/total counts, taken from the real catalogue (56 items).
  - A card-back grid with its states: equipped, equip, price, VIP only.
  - The Room Cards panel: the available card with Activate, and the Buy with Coins prices.
- **Friends**
  - Stat buttons, then tabs (Friends / Requests with a count / Blocked, disabled as in the app).
  - Search, sort and an "Online only" switch.
  - Friend rows with invite, message and more; the more-menu is shown open.
  - Suggestions and Recently Played.
- **Messages:** **a proposal.**
  - A conversation list and the open chat side by side, where the app today shows one at a time.
  - Avatars, online dots and an unread dot.
  - Chat bubbles: lime for you, graphite for them. The composer shows a 500-character counter.
  - "Invite to Mindi" in the chat header reuses the Friends invite action.
- **Clubs**
  - Suggested clubs with a suit crest, [TAG], a member meter, and the correct button state ("Already in a club" while you're in one).
  - A My Club panel with Members (Kick for the owner) and Club Chat.
- **Leaderboard**
  - A lit podium, Your Rank, Weekly Rewards (your tier highlighted), and "How ranks are ordered".
  - The table, with your row pinned.
- **Achievements**
  - An overall ring (4 of 10).
  - Category filter with counts.
  - Two-column achievement cards: progress, reward (coins or Prestige), and Unlocked/Locked.
- **Weekend League:** a live hero with a countdown and your qualification, big Mindi and Gin Rummy buttons, the four rules, the Weekend Champion reward, and This Week's Standings.
- **Hall of Fame:** a top three on gold, silver and bronze cards, then a ranked list by peak trophies.
- **Shop**
  - A balance card, then tabs and the VIP strip.
  - Weekly Featured with per-category art and rarity glows.
  - Coin Packs, with Popular and Best Value flags.
  - The purchase dialog, with both the enough-coins and not-enough-coins states.
- **VIP Pass + coin packs**
  - The VIP hero: perks list, VIP-only cosmetics, and weekly/monthly plan cards.
  - The full coin-pack list, showing a pending top-up.
- **Daily rewards + missions**
  - Seven day tiles; the Day 3, 5 and 7 bonuses now show on their tiles.
  - The claim popup.
  - Daily and weekly missions, with the cosmetic rewards shown too.
  - In the app these stay two routes with the same look.
- **Settings**
  - A category list and an About card.
  - Game Preferences: Notifications and Sound disabled as in the app, and a live Music switch.
  - The language segmented control. Choosing Dhivehi notes that the app switches to right-to-left.
  - Appearance, Account, Privacy & Security with the Blocked Players empty state, Help FAQs, and Log Out.

The names and numbers on the boards are sample data: Sayyu, Gold, 58 trophies, 1,240 coins, and the
bot-name players. They are consistent with each other and with the game rules, but the app must show
real data.

## Code issues found while designing (not design changes)

| # | Issue | Where | Suggested owner |
| --- | --- | --- | --- |
| 1 | The VIP Pass activates for free (no MVR step). Perks 3, 4 and 6 (frame, VIP shop section, VIP cosmetics) aren't implemented. **Ask Sayyu before changing how VIP is paid for.** | `components/shop/*`, `contexts/EconomyContext.tsx` | Claude |
| 2 | Weekly rank rewards aren't paid. `checkAndClaimWeeklyRank` is never called, `WeeklyRankReward.tsx` is unused, and `profile.rank` is hard-set to Bronze. `functions/src/index.ts` already has a weekly payout function marked **do not deploy until the client path is removed**. Follow that plan and ask Sayyu before deploying anything. | `contexts/EconomyContext.tsx`, `components/rewards/WeeklyRankReward.tsx`, `functions/src/index.ts` | Claude |
| 3 | Rank thresholds conflict: 0/25/50/75 in `constants/ranks.ts` (what the game uses) vs 0/500/1200/2500 in `RANK_CONFIGS`. Gold is `#D4AF37` in one and `#FFD700` in the other. | `constants/ranks.ts`, `data/cosmetics.ts` | Claude |
| 4 | Collection totals are hard-coded (93) against 56 real items, with "???" filler tiles. Master Collector's target of 85 is unreachable, and nothing grants the Master Collector or Animated Gold frames. | `components/collection/CollectionPage.tsx`, `data/cosmetics.ts` | Claude |
| 5 | Master Collector, Animated Gold and Champion's Banner can be bought for 0 coins in the Shop. | `data/cosmetics.ts`, `lib/cosmeticRotation.ts` | Claude |
| 6 | Online Mindi passes +15/−5 to the match reward popup, but the rules are `TROPHY_WIN`/`TROPHY_LOSS` (+5/−2), doubled in the league pool. | `components/game/MindiOnlineClient.tsx` (the `trophyChange` prop) | Claude |
| 7 | The daily login popup shows "+ 1-Hour Room Card Bonus!" on Days 3 and 5, which give a sticker and a banner. | `components/rewards/DailyLoginCalendar.tsx` | Claude |
| 8 | The Leaderboard's Weekly Rewards card always highlights Bronze. Work the tier out from trophies with `getRankFromTrophies` inside the card. | `components/leaderboard/RewardsCard.tsx` | ChatGPT |
| 9 | Tournament "Opens {time}" renders empty outside the league window. | `app/tournament/page.tsx` | ChatGPT |
| 10 | Club member trophies go stale: they're saved on join and never refreshed. | `lib/clubs.ts`, `components/clubs/*` | ChatGPT |
| 11 | The shop dialog prints a raw category id ("Epic / cardBack"). | `components/shop/ShopItemDialog.tsx` | Claude |
