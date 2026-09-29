# Arena app screens: who builds what

Two agents build the Arena look for the app screens at the same time:

- **Claude**: the Thaasbai project session in Claude.
- **ChatGPT**: Codex, working in its own git worktree.

This file is the single source of truth for who owns which files. Both agents read it before starting,
and both follow it.

- The designs are in `APP_SCREENS.md`, `screens/app/*.jpg` and `boards/*.dc.html`.
- The table boards (the Mindi and Gin tables, lobby, result, motion and kit) stay with Claude as they are now.

## Phases

| Phase | Who | What | Done when |
| --- | --- | --- | --- |
| 0. Foundation | Claude | Finish and commit the table-port work in progress, and commit `design/` (it is untracked, and ChatGPT's worktree only sees what is on `main`). Then build the shared layer (below) and commit it on `main`. | `npm run verify` and `node scripts/check-shell-ui.cjs` pass, and the commit is on `main` |
| 1. Screens | Claude and ChatGPT, in parallel | Each builds its own screens on its own branch (below). | Each screen matches its reference, and all checks pass |
| 2. Review and merge | Each reviews the other | Claude reviews ChatGPT's branch and ChatGPT reviews Claude's, then Sayyu merges. | Both branches are on `main`, and `npm run verify` passes on `main` |

**Nobody pushes to GitHub.** Pushing `main` deploys to Netlify, so Sayyu pushes after the review.

## Phase 0: the shared layer (Claude only, before anyone starts screens)

0. Commit `design/` on its own, with the message `Add Arena design references`.
1. Port `app-reference.css` into `styles/arena-app.css` the same way the table boards were ported: namespaced so `.panel`, `.tabs`, `.pill` and the rest can't collide, with fonts through the `--font-*` variables.
2. Add shared React pieces in `components/arena/`: PageHeader, Panel (tick and blue-tick variants), Tabs, Pill, RankBadge, Meter, Avatar, CoinGem, StatTile, CardBackArt (all 13 backs) and TableSwatch.
3. Restyle the shell to match the boards:
   - `components/layout/sidebar/*` (collapsed rail, expanded panel, VIP card, social tiles)
   - `components/layout/TopBar.tsx`
   - the `ar-stage` background
   - `components/economy/CoinBalance.tsx` (the lime gem)
4. Update `RARITY_COLORS` / `RARITY_GLOW` in `data/cosmetics.ts` to the Arena rarity colours (APP_SCREENS.md, "Palette").
5. Create two empty stylesheets for ChatGPT, `styles/arena-social.css` and `styles/arena-compete.css`, and import both in `app/layout.tsx`. That way ChatGPT never has to touch `layout.tsx`.
6. Commit on `main` with a message starting `Arena foundation:`.

## Phase 1: ownership

### Claude (branch `arena/claude-screens`, in `C:\Users\Sayyu\thaasbai`)

Screens: **Home, Profile, Inventory (+ Collection, Room Cards), Shop (all four tabs and the purchase dialog), VIP Pass + coin packs, Daily rewards, Missions.**
Code issues 1–7 and 11 in APP_SCREENS.md. For 1 and 2, ask Sayyu before changing how VIP is paid for or deploying any function.

Claude alone may edit:

- **Root and config:** `app/layout.tsx`, `tailwind.config.ts`, `package.json` and `package-lock.json`.
- **Styles:** `styles/globals.css`, `styles/buttons.css`, and every `styles/arena*.css` except the two below.
- **Components:**
  - `components/layout/**`, `components/ui/**`, `components/arena/**`, `components/economy/**`
  - `components/home/**`, `components/profile/**`, `components/shop/**`, `components/vip/**`
  - `components/rewards/**`, `components/missions/**`, `components/collection/**`, `components/roomcards/**`, `components/game/**`
- **Routes:** `app/(main)/home`, `app/(main)/profile`, `app/inventory`, `app/collection`, `app/room-cards`, `app/shop`, `app/rewards`, `app/missions`, `app/(main)/play/**`.
- **Shared code:** `contexts/**`, `data/**`, `constants/**`, `functions/**`, `lib/i18n.ts`, and every `lib/*` and `hooks/*` not listed under ChatGPT.
- **Scripts:** `scripts/port-board.mjs`, plus the check scripts and test entries for its own screens.

### ChatGPT (branch `arena/codex-screens`, in the worktree `C:\Users\Sayyu\thaasbai-codex`)

Screens: **Friends, Messages, Clubs, Leaderboard, Achievements, Weekend League (`/tournament`), Hall of Fame, Settings.**
Code issues 8, 9 and 10 in APP_SCREENS.md.

ChatGPT alone may edit:

- **Routes:** `app/(main)/friends/**`, `app/(main)/messages/**`, `app/(main)/clubs/**`, `app/(main)/leaderboard/**`, `app/(main)/settings/**`, `app/achievements/**`, `app/tournament/**`, `app/hall-of-fame/**`.
- **Components:** `components/messages/**`, `components/clubs/**`, `components/leaderboard/**`, `components/achievements/**`, `components/halloffame/**`, `components/settings/**`, `components/moderation/**`.
- **Shared code:** `lib/clubs.ts`, `lib/hallOfFame.ts`, `lib/weekendLeague.ts`, `hooks/useLeaderboard.ts`.
- **Styles:** `styles/arena-social.css` and `styles/arena-compete.css`.
- **Scripts:** its own check scripts and test entries: `scripts/check-friends-ui.cjs`, `check-clubs-ui.cjs`, `check-settings-ui.cjs` and their `*-test-entry` / `*-test-services` files, plus any new `check-*` scripts for its screens.

ChatGPT reads, but does not edit, everything in Claude's list. In particular:

- **Shared components:** use `components/arena/*` and the shell as they are. If a shared piece is missing or wrong, build what you need inside your own component folder and list it under "Needs from Claude" in your final summary. Don't change shared files.
- **Strings:** don't edit `lib/i18n.ts`. Reuse existing keys. Where a screen already hard-codes English (Friends, Clubs, Settings section titles), keep doing that for new text and list the new strings in your summary.
- **Shared hooks:** keep the existing fields of `hooks/useRankLock.ts` and the other shared hooks. For code issue 9, work the opening time out inside `app/tournament/page.tsx` or `lib/weekendLeague.ts`.
- **The Weekly Rewards card (code issue 8):** work the tier out from trophies inside `components/leaderboard/RewardsCard.tsx` with `getRankFromTrophies`. Don't touch `contexts/EconomyContext.tsx`.

### If you find you need a file you don't own

Stop and write it down, don't edit it. Put it in your final summary under "Needs from Claude" or "Needs from ChatGPT". Sayyu passes it on.

## Setting up the parallel work (after phase 0 is on `main`)

ChatGPT gets its own folder, so the two agents never share a working tree:

```
cd C:\Users\Sayyu\thaasbai
git worktree add ..\thaasbai-codex -b arena/codex-screens main
cd ..\thaasbai-codex
copy ..\thaasbai\.env.local .env.local
npm ci
```

Claude starts its own branch in the main folder: `git switch -c arena/claude-screens`.

**Ports.** The UI check scripts expect a dev server at `http://127.0.0.1:3000`.

- Claude uses port 3000.
- ChatGPT runs `npm run dev -- -p 3001`. In the check scripts it owns, it reads the base URL from `process.env.CHECK_BASE_URL`, defaulting to `http://127.0.0.1:3000`, and runs them with `CHECK_BASE_URL=http://127.0.0.1:3001`.

## How every screen is checked

1. It matches its `screens/app/*.jpg` at 1440×900 (and at the board's full height for long pages). Layout, colours, type, states and copy must all match. The values come from `boards/<Board>.dc.html`.
2. It uses real data and real strings from the code, never the sample names and numbers on the boards.
3. It is still correct at 1280 and 1920 wide. On an 844×390 landscape phone the app's desktop-layout viewport applies, and the existing no-horizontal-overflow checks still pass at every width the scripts test.
4. `npm run verify` passes, along with the screen's `scripts/check-*-ui.cjs` where one exists.
5. Accessibility:
   - Every text is at least 4.5:1 against its background, and blue fills carry dark text.
   - Real `<button>` / `<a>` / `<input>` elements, with `aria-label` on icon-only buttons.
   - A visible focus ring.
   - Loops stop under `prefers-reduced-motion`.
6. Commit each screen on its own (`Arena: <Screen>`), with a line in the message saying which reference it matches.

### Exact match (Claude's screens and the shell)

Sayyu's rule: Claude's screens (Home, Profile, Inventory with Collection and Room Cards, Shop, VIP Pass + coin packs,
Daily rewards and Missions) and the shared shell (sidebar, top bar, stage, coin gem) are **copies of the artboards,
not interpretations**. The layout, sizes, spacing, radii, colours, gradients, shadows, fonts, letter-spacing, icons,
buttons, states and animations must all be the same.

- **Styles.** Port each board's `<style>` block, and the parts of `app-reference.css` it uses, value for value. Namespace
  them the way the table boards were, with `scripts/port-board.mjs` where it fits. Don't round numbers, don't swap in
  Tailwind approximations, and don't bend the design to fit the old components: replace the old styling.
- **Markup.** Keep each board's structure and class names, written as React components.
- **Buttons.** Use the board's `.btn` recipe in every variant the board shows (lime, blue, ghost, `sm`, disabled), with
  its hover, pressed and focus states.
- **Animations.** Port every `@keyframes` rule and every `animation` / `transition` the board uses (`blink`, `bob`, `bob2`,
  `breathe`, `chase`, `drift`, `fade`, `handIn`, `holo`, `rise`, `spin`). Put each one on the same element, with the
  same duration, easing, delay and loop. The interactions in the board's `DCLogic` class (tabs, plan pick, dialogs,
  claim, equip) must behave and animate the same way.
- **Icons.** Use the same Lucide icons, at the same size and stroke.
- **Screens without their own board.** Collection and Room Cards use the Inventory board's pieces (`app-03`). Missions
  use the Rewards board (`app-13`).
- **What may differ.** Only these:
  - real data and strings in place of the board's sample names and numbers
  - layout that adapts at widths other than 1440
  - loops that stop for people who have turned on reduced motion (everyone else sees the board's animations)

  If a board element has no real data or feature behind it, don't drop it and don't fake it. List it and ask Sayyu.
- **Proof.**
  1. Feed the board's sample data into the screen's test fixture (`scripts/*-test-services`, never app code).
  2. Screenshot the screen at 1440 wide, in the same state as each of its references.
  3. Save the screenshot and the reference side by side in `artifacts/compare/<screen>.png`. Don't commit these.
  4. Fix every difference you can see, then attach the comparison images to the phase 1 summary.

## Phone layouts

The phone designs are in `MOBILE.md`, `boards/M*.dc.html`, `boards/P*.dc.html` and `screens/phone/*.jpg`.

- **Claude builds the whole phone version** on the branch `phone/claude`:
  - the shell: the top bar, the tab bar with the Play diamond, the More sheet, the sheets, and the rail when the phone is held sideways
  - the rotate handling in MOBILE.md "Turning the phone"
  - the four landscape table screens
  - every portrait screen, including ChatGPT's desktop screens
- **ChatGPT reviews** the branch once it's done (PROMPTS.md, prompt 7), then Sayyu merges it.
- **Checks.**
  - Each portrait screen matches its `screens/phone/*.jpg` at 390 × 844, and still works at 360 and 430 wide.
  - The landscape screens match at 844 × 390.
  - The desktop checks still pass at 768 and up.
  - The "Exact match" rules above apply to every phone screen.

## Phase 2: review and merge

- Claude reviews `arena/codex-screens` and ChatGPT reviews `arena/claude-screens`. Each checks against the references and this file's ownership rules, and lists problems without fixing the other's code.
- Sayyu merges `arena/claude-screens` first, then `arena/codex-screens`. Run `npm run verify` on `main` after each merge, then push.
