# Thaasbai · Arena — design handoff

This folder carries the **Arena** redesign into the codebase so work can continue here.
It is reference material only: nothing in `design/` is imported, built or linted by the app
(`next lint`, `tsc` and `npm run check` only look at `app/`, `components/`, `lib/`, `styles/` and `*.ts(x)`).

The live, playable canvas (private to Sayyu) is at
https://claude.ai/artifact/BYFstSTQ14paceyGJpGgV8. It's titled "Thaasbai · Arena" and has 57 boards: the 7 table boards, the 14 app screens, 26 phone boards, and 10 boards for the opening deal and private rooms.

## New: the app screens (blue edition)

The canvas now has 14 more boards for the rest of the app: Home, Profile, Inventory, Friends, Messages,
Clubs, Leaderboard, Achievements, Weekend League, Hall of Fame, Shop, VIP Pass + coin packs, Rewards and
Settings. They use **blue `#00BCC8` in place of violet**. The table boards below stay violet.

| Path | What it is |
| --- | --- |
| `APP_SCREENS.md` | **Start here for app screens.** Palette, shell spec, shared pieces, a board → route → files → screenshot table, and code issues found while designing. |
| `WORKSPLIT.md` | Who builds what: Claude and ChatGPT (Codex), file ownership, branches, ports and the checks every screen must pass. |
| `PROMPTS.md` | The prompts to paste into Claude and ChatGPT, in the order to use them. |
| `MOBILE.md` | **Phone layouts.** Portrait app screens (`boards/M*.dc.html`) and landscape tables (`boards/P*.dc.html`), with 2× references in `screens/phone/`. |
| `DEAL_AND_ROOMS.md` | **The opening deal and private rooms**, desktop and phone: cut for first play, the deal, the Private Room page and the waiting room. Boards `Cut*`, `PCut*`, `Rooms`, `RoomLobby` and `MRoom*`. References in `screens/deal/`, `screens/app/app-15*` and `app-16*`, and `screens/phone/phone-land-05*`, `phone-land-06*`, `phone-17*` and `phone-18*`. |
| `screens/app/*.jpg` | Pixel reference for every app screen and its key states (19 images). |
| `boards/<Screen>.dc.html` | Source of each app board (same format as the table boards). |
| `app-reference.css` | The shared shell and component CSS the app boards use, blue edition. |

## What's here (the table boards)

| Path | What it is |
| --- | --- |
| `screens/*.jpg` | Pixel reference for every board and key game state. **Start here.** |
| `boards/*.dc.html` | Exact source of each board: all CSS, markup and the demo logic. These files need the design canvas runtime to render, so read them for values instead of opening them in a browser. |
| `tokens.css` | Palette, type, depth, motion and the core recipes (HUD panel, buttons, chips, player frame, cards), extracted from the boards. Prefixed `ar-`. Not imported anywhere yet. |

### Screens

| File | State |
| --- | --- |
| `mindi-01-your-turn.jpg` | Mindi, trick 9 of 13. Spades led, trump Hearts, your turn. Only spades are playable. |
| `mindi-02-ten-selected.jpg` | 10♠ picked: it lifts 36 px with a lime ring, and the button reads PLAY 10 ♠. |
| `mindi-03-trick-won.jpg` | Mariyam's K♠ takes the trick. The "Takes it" standee is up. |
| `mindi-04-hand-won.jpg` | The 10♠ has flown to the Tens rack. All four Tens are taken (Us 3 to 1) and the "hand is yours" banner shows. |
| `mindi-05-last-trick.jpg` | Last-trick popover (trick 8). |
| `gin-01-discard-selected.jpg` | Gin, 11 cards after drawing 3♠ ("New"). K♦ picked, and the button reads DISCARD & WIN. |
| `gin-02-gin.jpg` | Gin: Hussain's hand is revealed. Points 47 (25 + 22), deadwood 22, coins +10, balance 1,250. |
| `gin-03-not-quite-gin.jpg` | Wrong discard (6♥): melds 3 · 3, 30 deadwood. "Rewind the turn". |
| `phone-landscape.jpg` | Mindi on an 844×390 phone, shown at 2×. |
| `lobby-01-mindi.jpg`, `lobby-02-gin-finding.jpg` | Game select on a lit podium, the mode list, and the "Finding a table" busy state. |
| `result-hand-won.jpg` | Mindi result: Tens 3–1, tricks 8–5, trophies +10 (58 → 68, 7 to Platinum), coins +10. |
| `motion.jpg` | The 8 motion loops, with timings under each one. |
| `kit.jpg` | Palette, buttons in every state, controls, cards, table pieces, ranks, type. |

## The look in one paragraph

A night arena: a black stage and a violet perspective-grid floor, lit by two soft spotlight beams.
The table has violet felt with "THAASBAI" printed down both long sides, a glossy black rail, a lime
LED ring around the felt and violet chase lights running round the rail. Everything you can act on,
and everything that is *yours*, is lime. Opponents, trump and secondary actions are violet. Cards
are clean white stock with bold Space Grotesk indices. Every Ten carries a lime, violet and white
foil ring, because Tens decide Mindi. Court cards are a solid suit-colour panel with a white letter.
HUD panels are near-black with two lime corner ticks. Headlines are uppercase Space Grotesk in a
silver gradient, taken from threadarena.store.

## Palette

| Token | Hex | Use |
| --- | --- | --- |
| Black | `#000000` | stage, rails |
| Violet | `#7D39EB` | felt, opponents, trump, secondary buttons |
| Lime | `#C6FF33` | you and your team, the main action, focus of attention |
| White | `#FFFFFF` | card stock, type |
| Graphite | `#121217` | icon buttons, panels |
| Card red | `#E0213A` | hearts and diamonds |
| Ten foil | conic lime → violet → white | Tens only |

Felt skins (the table theme names come from `data/cosmetics.ts`):
Neon Arena `#2E1468` (default), Crimson Velvet `#4A1119`, Sapphire Blue `#0E2C4E`,
Midnight Black `#101214`. The Gin table uses `#17122A` with a violet LED ring and lime chase lights.

Contrast: all body and label text is at least 4.5:1 on its surface. Lime text on lime-tinted chips
and black text on lime buttons both pass.

## Type

- **Space Grotesk 700**: display, scores, labels, buttons. Uppercase, with tracking
  `-0.02em` for headlines, `0.22em` for small labels and `0.06em` for buttons.
- **Inter Tight 400–700 (+ italic)**: interface and body text, 13–17 px.
- **Noto Sans Thaana 600/700**: Dhivehi names (މިންޑި, ޖިން ރަމީ, ތާސްބައި).

With `next/font/google` (all three are in this repo's installed Next font list):

```ts
import { Space_Grotesk, Inter_Tight, Noto_Sans_Thaana } from "next/font/google";
const display = Space_Grotesk({ subsets: ["latin"], weight: ["500", "600", "700"], variable: "--font-display", display: "swap" });
const ui = Inter_Tight({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-ui", display: "swap" });
const thaana = Noto_Sans_Thaana({ subsets: ["thaana"], weight: ["600", "700"], variable: "--font-thaana", display: "swap" });
```

## Components (values are in `tokens.css` and the boards)

- **Primary button (lime)**: 58 px tall (48 px for `sm`), 12 px radius, black uppercase text. It has a
  6 px lime-dark lip (`#6F9412`) and a sheen that crosses on hover. Pressing sinks the face 5 px onto
  its lip: 90 ms down (ease-out), 180 ms back on a spring `cubic-bezier(.3,1.7,.5,1)`. Disabled is
  graphite with no lip.
- **Secondary (violet)**: same shape, with a `#3E1685` lip.
- **Ghost**: graphite with a 1.5 px white 20% inset. Its hover gets a lime inset, and a pressed toggle turns lime.
- **Icon button**: 48 px square, 12 px radius, graphite. It turns lime on hover.
- **Segmented control**: the active option is white with black text.
- **Chips**: 26 px tall, 7 px radius, tracked caps. Variants are live (lime, with a blinking dot), violet,
  mono and white.
- **HUD panel**: near-black gradient, 1 px 10% white border, 14 px radius, and two 16 px lime corner ticks
  (violet on "their" panels).
- **Player frame**: 64 px tall with a 52 px square avatar (lime for you and your partner, violet for
  opponents) and a white card-count badge. The name is tracked caps. On your turn the frame gets a
  lime border and glow.
- **Trump badge**: a violet hexagon with a white suit. Before trump is set it's a dark hex.
- **Cards**: sized by font-size (7.2em × 10.08em). The index is Space Grotesk 700. Pips use real layouts.
  The in-hand states are hover +16 px, picked +36 px with a lime ring, and can't-play −12 px dimmed to 50%.
- **Standee on the felt**: a lime tag ("Winning" / "Takes it") that stands up on a spring.
- **Turn clock**: a lime ring that turns red (`#FF3B55`) at 5 seconds.
- **Ranks**: hex badges for Bronze 0–24, Silver 25–49, Gold 50–74 and Platinum 75+.

## Motion (see `screens/motion.jpg` and `boards/Motion.dc.html`)

| Moment | Timing |
| --- | --- |
| Opening draw | App timeline: fan 1.3 s · draw 2.4 · reveal 3.9 · first player 5.1 · deal 6.65 · done 8.0 |
| Deal | 52 cards inside the 1.35 s deal window: 26 ms apart, 420 ms flight, ease-out |
| Play a card | 580 ms `cubic-bezier(.2,.75,.25,1)`. The card lifts, arcs, and flattens from hand tilt to table tilt. |
| Follow suit | 200 ms ease-out. Can't-play cards sink 12 px and dim to 50%, never hidden. |
| Trick won | Hold 1.3 s, then sweep 620 ms `cubic-bezier(.55,0,.35,1)` with a 50 ms stagger |
| Trump set | Hex flip, 520 ms with overshoot (spring stiffness 320, damping 18) |
| Ten captured | Flight 950 ms `cubic-bezier(.45,0,.2,1)` to the rack, slot pop 620 ms, glint 900 ms |
| Baga / Haas Baga | Tens fan in 120 ms apart, the title stamps at 1.3 s, one light sweep |

## Porting notes for this repo (read before changing styles)

1. **`styles/globals.css` sets `* { letter-spacing: 0 !important; }`** (around line 88). That kills every
   tracked label and button in the Arena look. Remove or narrow it first, or none of the caps will
   match the screens.
2. **`styles/buttons.css`** already gives every `<button>` a depth-only bevel through `--btn3d-*`
   custom properties, enforced by `scripts/check-button-3d.mjs` (it must never change size). The Arena
   buttons are a *colour and lip* change. Do them as variants in `components/ui/Button.tsx` and
   `GameButton.tsx`, or by retuning the `--btn3d-*` tokens, without breaking that script's rules. Keep
   `data-flat` / `--btn3d-rest:none` on card buttons.
3. **Fonts**: `app/layout.tsx` loads `Inter`, and `tailwind.config.ts` maps `sans` to Inter. Swap to the
   three fonts above and add `display` / `thaana` families.
4. **Tailwind colours**: the current theme is the gold `thaasbai.*` palette. Add an `arena` palette
   (black, violet, lime, white, graphite, card red) rather than renaming gold in place, so screens
   can move over one at a time.
5. **The Mindi table is WebGL** (`components/game/mindiTableRenderer.ts` via `MindiTableScene.tsx`),
   while the boards draw it in CSS 3D. Recreate it with materials:
   - felt: the violet skin colour with a soft centre light
   - rail: glossy black (metalness ~0.4, roughness ~0.3)
   - LED ring: an emissive torus or line in lime `#C6FF33`, plus a blurred copy for the glow
   - chase lights: small emissive violet dots `#B18CFF` animated along the rail
   - "THAASBAI" printed on both long sides at about 13% white

   The floor grid, beams and outlined backdrop word can stay DOM/CSS behind the canvas.
6. **Reduced motion**: every loop above should stop under `prefers-reduced-motion`, as the repo already
   does per screen.
7. **Landscape gate / phone**: `phone-landscape.jpg` is the 844×390 layout. It has the same pieces at half
   scale, 48 px side insets for the notch, and compact frames (44 px).
8. Run `npm run verify` after each step. The Netlify build runs `next lint`, and ESLint errors fail it.

## Suggested order

1. Foundations: fonts, the `arena` Tailwind colours, the `letter-spacing` fix, and `tokens.css` values into `styles/`.
2. Buttons, chips, segmented control and icon buttons (`components/ui/*`, `GameButton`, `SortGameButton`).
3. Cards: `PlayingCard.tsx` faces, foil Tens, court panels and the violet back. The existing skins
   (Classic Gold, Neon Cyber, Shadow Veil and so on) stay as alternatives.
4. Table HUD: score and Tens rack, trump badge, player frames, status pill and turn clock
   (`MindiTable.tsx`, `GinRummyTable.tsx`, `TurnClock.tsx`, `TrickArea.tsx`).
5. The table itself in `mindiTableRenderer.ts` (felt, rail, LED ring), then the Gin table.
6. Lobby / play select (`GameSelectCard.tsx`, `GameDeckArt.tsx`, `app/(main)/play`), then results
   (`GinResultScreen.tsx` and the Mindi result).
7. Motion polish against the table above.

All game facts on the boards (rules, scores, trophy and coin amounts, rank bands, skin names) were
taken from this repo's engines and data. Change them in the code, not from the pictures.
