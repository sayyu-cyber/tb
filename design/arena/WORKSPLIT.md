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

## Phase 2: review and merge

- Claude reviews `arena/codex-screens` and ChatGPT reviews `arena/claude-screens`. Each checks against the references and this file's ownership rules, and lists problems without fixing the other's code.
- Sayyu merges `arena/claude-screens` first, then `arena/codex-screens`. Run `npm run verify` on `main` after each merge, then push.
