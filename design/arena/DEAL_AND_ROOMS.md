# The opening deal and private rooms

Two features, designed for desktop and phone in the Arena blue edition:

1. **The opening deal.** Cut for first play, then the deal. This replaces the gold "lounge" ceremony the app shows now.
2. **Private rooms.** The Create or join page, and the waiting room.

Everything here is on the canvas (https://claude.ai/artifact/BYFstSTQ14paceyGJpGgV8), in the rows "The opening deal · cut for first play" and "Private rooms".

## Boards and references

| Board | What it shows | References |
| --- | --- | --- |
| `boards/Cut.dc.html` | Desktop, Mindi. The whole ceremony plays on a loop. Use the `phase` prop to freeze it on one step. | `screens/deal/deal-01…06` |
| `boards/CutGin.dc.html` | Desktop, Gin Rummy: two seats, 10 cards each, then the upcard. | `screens/deal/deal-gin-*` |
| `boards/PCut.dc.html` | Phone held sideways (844 × 390), Mindi | `screens/phone/phone-land-05*` |
| `boards/PCutGin.dc.html` | Phone held sideways, Gin Rummy | `screens/phone/phone-land-06*` |
| `boards/Rooms.dc.html` | Desktop Private Room: create, join with a code, invites and recent rooms. Props: `roomCard`, `codeError`. | `screens/app/app-15*` |
| `boards/RoomLobby.dc.html` | Desktop waiting room. Props: `view` (Host or Guest) and `table` (3 of 4 or Full). | `screens/app/app-16*` |
| `boards/MRooms.dc.html`, `MRoomsCreate.dc.html` | Phone Private Room, on the Join tab and the Create tab | `screens/phone/phone-17*` |
| `boards/MRoomLobby.dc.html`, `MRoomLobbyFull.dc.html` | Phone waiting room. The Full board shows what every player sees when the host starts. | `screens/phone/phone-18*` |

The boards are interactive. Try Paste code, Join, the password switch, Invite (Aishath joins about 1.7 s later), the ⋯ seat menu, Swap partners, Start and Skip to deal.

---

## 1. The opening deal

### The idea

The ceremony plays **on the match's own table**, from the first frame:

- the same camera and table
- the same seat plates and header

There is no separate scene or modal. The two HUD panels do ceremony work while it runs:

- The **left** panel shows the steps.
- The **right** panel shows the cut.

When the deal ends, those same panels cross-fade into the Tens and Trump panels (Mindi) or the Your melds and Turn panels (Gin). Your hand then rises into place, and it's trick 1. Nothing jumps and nothing reloads.

It is still presentation only. The engine settles the cut and the deal beforehand (`lib/openingCut.ts`, `openMindiHand`), and the animation only shows them. The engine's rules shape the words:

- Ace is high in the cut.
- A tie for the top card is cut again. The UI only ever sees the final, untied cut.
- Mindi deals 13 each, one at a time, clockwise from the dealer's left. Trump isn't dealt.
- Gin deals 10 each, then turns the upcard.

### Timeline (Mindi)

| ms | Phase (step) | What moves |
| --- | --- | --- |
| 0–1150 | shuffle (Cut) | **Riffle.** The pack splits into two halves (±80 table px, ±11° turn, the inner edges lifted 18°) over 280 ms. The cards then drop back in alternately, one every 26 ms from 300 ms, 160 ms each. |
| 1150–1900 | spread (Cut) | **Ribbon spread.** 26 cards slide into an arch across the middle of the felt (600 ms, cubic-bezier(.25,.8,.25,1), 7 ms stagger). |
| 1900–2750 | draw (Cut) | One card slides out of the spread to each player's spot, face down, starting at the dealer's left. 600 ms each, 170 ms apart. |
| 2750–3150 | gather (Cut) | The spread closes up into the dealer's deck, beside the dealer. |
| 3150–4350 | reveal (Reveal) | Each cut card flips where it lies: it lifts 64 px, turns on its long edge and lands face up. 520 ms each, 150 ms apart. The right panel fills in row by row. |
| 4350–5650 | first (First player) | The winning card rises to the centre of the table and stands up to face you (scale 1.1). It gets a lime ring, a glow and a lime halo on the felt, with a "First to play" standee above it. The other cut cards dim to brightness .6. The winner's plate turns lime. |
| 5650–6150 | collect (Deal) | The cut cards go back onto the dealer's deck, face down, 70 ms apart. |
| 6150–8520 | deal (Deal) | 52 cards fly clockwise from the dealer's left, one every 40 ms. Each flight lasts 330 ms and arcs up 70 px. The cards land on neat piles in front of each seat, with a little jitter. Your pile lands just past the rail, in front of you. Each seat's count badge ticks up as its cards land. |
| 8680 | ready | Your pile lifts away (420 ms) as your hand rises (the table's `handIn`, 70 ms stagger). The other piles fade into the seat fans. The ceremony panels fade out (200 ms), then the table's panels fade in (350 ms, after 220 ms). The status pill reads "Mariyam leads the first trick". |

For **Gin**, everything up to the deal is the same. Then:

1. 20 cards go out, one every 62 ms.
2. At 7738 ms the upcard flips from the deck onto the discard spot.
3. Ready comes at 8188 ms.

The stock stays centre-left.

Update `components/game/mindiCutTimeline.ts` to match:

```ts
{ fan: 1150, draw: 1900, reveal: 3150, winner: 4350, dealing: 5650, end: 8680 /* Gin: 8188 */ }
```

**Skip to deal** moves the clock to `dealing`, as `skipToDeal` does today. Escape does the same. The deal itself can't be skipped, so while it runs the button reads "Dealing…" and is disabled.

### Layout (table space, 1200 × 740, the `.table` element)

These values are copied from the boards' `GEO` constants. The desktop table is `rotateX(52deg) scale(.86)` and the phone table is `rotateX(50deg) scale(.5)`.

| | Desktop | Phone |
| --- | --- | --- |
| Card size | pack 96 × 134, cut cards 120 × 168 | pack 96 × 134, cut cards 124 × 174 (big-index faces) |
| Riffle and spread centre | 600, 372 | 600, 404 |
| Spread arch | half-width 222, y 404, rise 44, tilt ±14° | 200, 440, 20, ±12° |
| Cut spots | S 600,584 · W 256,404 · N 600,190 · E 944,404 | S 600,590 · W 238,440 · N 600,252 · E 962,440 |
| Winner | stands at 600,404, scale 1.1, with the standee | floats flat at 600,424, lifted 64, scale 1.28, no standee |
| Dealer's deck | Mindi 966,262 (Shifa) · Gin 780,150 (Hussain) | Mindi 1000,262 · Gin 860,290 |
| Piles | S 600,742 · W 176,372 · N 600,94 · E 1024,372 | S 600,742 · W 244,372 · N 600,268 · E 956,372 |
| Gin stock and upcard | 530,372 and 676,378 | 530,404 and 676,408 |

The whole pack wears **your equipped card back**. Today, each drawn card shows its owner's back.

### Chrome and copy

**Left panel (desktop).** It reads "— Opening deal" and "Step n of 4", then a title of up to two lines, a line of rule text, and a four-part step bar (Cut · Reveal · First · Deal). The current part fills lime and the parts already done turn blue. The titles are:

- "Shuffle": "Shifa deals this hand. First, everyone cuts one card."
- "Cut for first play": "One card each. The highest card plays first."
- "Reveal": "Ace is high. A tie for the top card is cut again."
- "Mariyam plays first": "Ace of hearts is the highest card. Your team leads the first trick." If you win, the title is "You play first" and the line is "You lead the first trick". If an opponent wins, it's "<Name> leads the first trick".
- "Deal": "13 cards each, one at a time, from Shifa's left." For Gin: "10 cards each, then the top card turns up to start the discard pile."

**Right panel, "The cut · Ace high".** It has one row per seat, with the avatar, the name ("Sayyu · you") and the result. Before the reveal, the card slot is a "?" mini card and the result reads "Waiting", then "Drew a card". After the reveal, it shows the mini card and "Jack of diamonds". The winner's row turns lime and reads "First to play".

**Status pill** (the table's pill at y 600). It has a blue dot while the ceremony runs and says:

1. "Shifa is shuffling"
2. "The pack is spread for the cut"
3. "Everyone draws one card"
4. "Turning the cards over"
5. "Ace of hearts wins the cut"
6. "Shifa is dealing"

At ready it shows the table's own line.

**Seat plates:**

- The dealer's plate has a blue "Dealer" tag until ready.
- After the reveal, each plate's second line reads "Drew 9 ♣", with the suit in red for hearts and diamonds.
- The winner's plate turns lime and reads "First to play" (at ready: "Leads" / "Your turn").
- The count badges appear when the deal starts and tick up with a lime flash.

**Phone.** The phone keeps the table's bars instead of HUD panels:

- **Top left:** "Opening deal", four step dashes and a short title: "Shifa shuffles", "Cut for first play", "Reveal · ace high", "Mariyam plays first", "Shifa deals · 13 each".
- **Top right:** a "Cut" strip with an avatar and a mini card per seat. The winner's chip gets a lime ring.
- **Hint pill:** none until ready.
- **Skip button:** a compact ghost "Skip" where the Play button goes.

### Reduced motion

Leave out the riffle, the spread and the flights:

1. The cut cards fade in face up at their spots (200 ms), and the right panel fills in.
2. The winner gets its ring, in place.
3. After 900 ms, the piles appear with their counts, and the hand and the table's panels fade in.

The total is about 1.9 s, like the current reduced-motion path. The hand is still dealt on screen.

### Sound hooks (optional)

Riffle, card slide (×4), flip (×4), winner chime, and a soft tick per dealt card (throttle it to one every 80 ms).

### Building it

- The match tables are already DOM boards inside `ArenaStage`:
  - desktop (1440 × 900): `MindiTable` and `GinRummyTable`
  - phones (844 × 390): `PhoneMindiBoard` and `PhoneGinBoard`

  The three.js `mindiTableRenderer` is no longer drawn.
- Build the ceremony as a layer inside those same boards, in CSS 3D, the way the design boards do it:
  - The card layer is `.ccl`, inside `.table`.
  - Each card is `.cc` and pivots on its near edge.
  - `place()` in the boards' script turns a card centre into a transform.
  - Use the desktop `GEO` on the 1440 × 900 board and the phone `GEO` on the 844 × 390 one.
- The game clients stop returning `MindiDealIntro` in place of the table. Instead, they render the table from the first frame in an opening state, and `MindiDealIntro` becomes the ceremony layer and its chrome:
  - Its steps, cut rows, status and Skip button render in the table's own panels and pill.
  - Focus stays on Skip to deal.
  - The status line and the cut rows are `aria-live="polite"`.
- Once nothing imports them, `MindiCutScene.tsx`, `mindiCutAnimation.ts` and the lounge styles can go.
- **Mindi 1v1** (the two-seat room variant) deals 26 each. It uses `CutGin`'s two-seat layout (you, and the opponent opposite), with Mindi's 40 ms gap and no upcard.
- Don't touch `openingCut.ts` or the engines.

---

## 2. Private rooms

### Private Room page (Create or join)

| | Desktop (`Rooms`) | Phone (`MRooms`, `MRoomsCreate`) |
| --- | --- | --- |
| Header | "Back to Play", then "— Play with your people", PRIVATE ROOM and one line of intro. The Room Card status sits on the right. | Back to Play in the top bar, the same hero, the Room Card status, then two tabs: **Join a room** (first) and **Create a room** |
| Create | A panel with a lime tick. It holds: two game tiles with deck art and a check (Mindi "2 or 4 players", Gin "2 players"); a seats segment ("4 · Two teams" or "2 · Head to head", with Gin locked to 2) and a line of help; the password row ("Lock this room" with a switch); when it's on, the password field with an eye toggle; the lime Create room button and a note. | The same pieces, stacked |
| Join | A panel with a blue tick. It holds six code boxes (the caret sits in the next empty box, and filled boxes turn blue), Paste code, "Letters A–Z and numbers 2–9", an error line when needed, and the blue Join room button. | The same |
| Invites | A panel listing each invite with the avatar, "<Name> invited you", "Mindi · 2 of 4 seated · 2 min ago" and a Join button. A full room shows a disabled "Full". | A section under Join |
| Recent rooms | Four cards: the small deck, "Mindi room", the code in spaced type, a lock if the room has a password, "3 / 4", a status pill and Join. | Rows under Invites |

**Room Card status:**

- **Active:** a lime ticket, "Room Card active" with a Host pill, "1-Hour card · 42 min left" and a time-left meter.
- **None:** a grey ticket, "No active Room Card", "Hosting needs one. Joining is always free.", and a Get a card button (Get one on the phone) that goes to Room Cards. Create room is disabled, and its note says why.

**Status pills:** Available is lime, Game started is blue, and Full, Closed, Expired and Unavailable are grey. Join is disabled unless the room is Available. This matches `RecentRooms`.

**Joining a locked room** opens a password dialog on desktop, or a bottom sheet on the phone. It reads "Room password" and "TF2GRQ is locked. Ask Mariyam." It has the password field and Cancel / Join room, and wrong passwords show the error inline.

**Errors.** Keep `PrivateRoomSetup`'s messages as they are ("Room not found. Check the code and try again.", "This room is full.", and so on) and show them on the error line. The code boxes turn red for "not found".

### Waiting room

| | Desktop (`RoomLobby`) | Phone (`MRoomLobby`) |
| --- | --- | --- |
| Header | "Leave room", "— Private room · Mindi · two teams", MINDI ROOM. On the right, the code card: "Room code", a password pill, six code tiles, and Copy and Share buttons. | The top bar has back (leave) and Share. The code card has the password pill, six tiles, and Copy code / Share link. |
| Seats | The table seen from above (an oval with a lime ring and LED dots). The four seat cards sit around it: you at the bottom, your partner opposite, and opponents at the sides. The centre says "Waiting for 1 more" with a pulse, or "Table full". | The same, at phone size. The seat cards become avatar chips with a name and a line. Tap a player to open a sheet with View profile, Remove from room and Ban from room. |
| Teams | Seats 0 and 2 are Team A (lime) and seats 1 and 3 are Team B (blue), shown by the stripe on each seat card and the key along the bottom. | Coloured avatar rings and the key |
| Host tools | The ⋯ menu on each other player (View profile, Remove from room, Ban from room) and Swap partners | The seat sheet and a Swap partners button |
| Invite friends | Built in on the right: search, then friends with the online ones first. Each shows Online, In a Gin game or Last seen, with Invite, Sent, Joined or Full. | A section on the page |
| Details | Game, Password (the host sees it), Room Card time left and Host | The same |
| Start | The host's lime **Start match** button, disabled ("Waiting for players · 3/4") until the table is full. A guest sees "Waiting for Mariyam to start" instead. | Docked at the bottom. On a phone, **Start opens the rotate sheet for everyone** ("Match starting · Rotate your phone"), because the table plays sideways. It has the four avatars, Leave room and the rotation-lock hint, and Android gets the lock, as in MPlayFind. |

**Where the data comes from:**

- `RoomDoc` gives `players`, `maxPlayers`, `password`, `ownerUid`, `seatOrder`, `mindiMode` and `bannedUids`.
- `getActiveRoomCards()` gives the Room Card status.
- `recentRoomCodes` and `watchRoom` give the recent rooms.
- `watchRoomInvites`, `sendRoomInvite` and `dismissRoomInvite` handle invites.
- `kickPlayer`, `banPlayer`, `setSeatOrder` and `startRoomMatch` do what their names say.

**Other states.** Loading, not found, load error, removed, banned and closed keep their `roomlobby_*` strings. Draw each one as a centred panel: an icon tile, the message, and a "Back to Play" button (lime for not found, closed, removed and banned; a blue "Try again" for load error).

**A question for Sayyu:**

- Today's "Swap teams" swaps seats 0 and 1, which moves the host to the other team.
- The design's **Swap partners** swaps seats 1 and 2 instead, so the host keeps their seat and just changes partner.

Both are one `setSeatOrder` call. Which should it be?

### New strings

Each needs i18n keys in en, dv, hi and bn.

- **Private Room page:** "Play with your people", "Open a table for friends, or join theirs with a code.", "Lock this room", "Anyone with the code can join.", "Only players with the password can join.", "Paste code", "Letters A–Z and numbers 2–9", "Invites", "<Name> invited you", "Recent rooms", "Room Card active", "No active Room Card", "Hosting needs one. Joining is always free.", "Covered by your Room Card. Create as many rooms as you like."
- **Waiting room:** "Swap partners", "Waiting for {n} more", "Table full", "Start when you are ready.", "Waiting for {host} to start", "Open seat", "Invite a friend", "Remove from room", "Ban from room", "Match starting".
- **Opening deal:** every string in section 1.
