# Thaasbai — Legal Briefing & Question List

Prepared September 2026, for a first meeting with a Maldivian lawyer before
public launch.

**What this is:** a factual description of what the app actually does
(verified against the source code, not assumed), followed by the questions
worth paying a lawyer to answer. **What it is not:** legal advice. I am not
a lawyer. Several statements below about Maldivian law come from public
sources and should be treated as prompts for your lawyer to confirm or
correct, not as settled fact.

**How to use it:** give your lawyer Section 1 first. Lawyers charge by the
hour and most of that hour gets burned establishing facts. Handing over an
accurate description of the product up front converts the meeting from
discovery into advice.

---

## 1. What the app actually is (give this to your lawyer first)

**Thaasbai** is an online multiplayer card-game service offering **Mindi**
(a traditional Maldivian card game) and **Gin Rummy**. It runs as a website
today at `tsbai.netlify.app` and is being prepared for release on the Google
Play Store, and possibly later the Apple App Store.

### How play works
- Players sign in with Google, with an email and password, or as an
  anonymous guest.
- They play against other real players online, against the computer, or
  locally pass-and-play.
- There are **casual** matches and **ranked** matches. Ranked matches move a
  player's trophy count up or down and place them on a public leaderboard.
- There is a **Weekend League** tournament based on trophies earned in a week.
- Players can create **private rooms** and invite friends.

### How money works
- There is a virtual currency called **coins**.
- Coins are bought with real money in **Maldivian Rufiyaa**. The current flow:
  a player requests a top-up in the app, pays **outside the app**, and an
  administrator manually approves the request, after which the coins appear.
- Coins buy: **cosmetic items** (card designs, table designs, profile frames,
  emotes, banners), **room cards** (which allow hosting a private room for a
  set duration), and **VIP** status.
- Coins are also **earned for free** by playing — for winning matches,
  completing daily and weekly missions, unlocking achievements, and a weekly
  payout based on the player's rank tier.

### VIP
A paid tier. It grants a higher daily limit on ranked matches, exclusive
cosmetic items, a room card, and a profile badge.

### Critical facts about the currency (verified in the source code)
- **Coins cannot be cashed out.** There is no mechanism anywhere in the code
  to convert coins back into money or anything of monetary value.
- **Coins cannot be transferred between players.** No gifting, trading or
  sending.
- **Players cannot wager coins against each other.** There is no staking, no
  entry fee paid into a pot, and no winner-takes-the-stakes mechanic.
- Coins awarded for winning come from the **system**, not from another
  player's balance. One player winning does not reduce another player's coins.

### Social features
Players have friends lists, send **private direct messages**, and post in
**club chat rooms**. They choose their own display names. All of this is
user-generated content that the operator stores.

### Data collected
Email address, display name, profile photo, gameplay statistics (matches,
wins, trophies, rank), coin balance and transaction history, top-up requests
including the Rufiyaa amount paid, direct messages, club chat messages, a
"last seen" timestamp, and a short public player code.

### Where data is stored
- **Google Firebase** (authentication, database, server functions) — servers
  outside the Maldives.
- **Netlify** (website hosting) — servers outside the Maldives, keeps standard
  access logs including IP addresses.

### Age
**There is currently no age gate of any kind.** The app does not ask for a
date of birth or age at any point, and anyone — including a child — can
create an account, including an anonymous guest account that identifies
nobody.

### Who operates it
Currently an individual. There is no registered business entity yet. The
administrator function is controlled by a single email address hard-coded
into the application.

---

## 2. The central question

Everything else is secondary to this one:

> **Does Thaasbai, as described above, constitute gambling under Maldivian
> law — and if not, what specifically must stay true for it to remain
> outside that definition?**

### Why this is urgent right now

Public reporting indicates a bill was submitted to the People's Majlis in
2026 proposing to amend the Penal Code to criminalise gambling — including
**online** gambling — with penalties reported at up to **four years'
imprisonment**, and to criminalise operating a gambling establishment.
Gambling is already prohibited under existing law.

**Ask your lawyer directly: what is the current status of that bill, and if
it passes in its proposed form, does anything about this app fall inside it?**
A product that is lawful today and unlawful in six months is a worse outcome
than one you adjusted before launch.

### The facts that matter to the analysis

Most jurisdictions test gambling on three elements together — payment,
chance, and a prize of value. Walk your lawyer through how each applies here:

**Arguments that this is not gambling:**
- The prize is cosmetic and in-game only. It has no monetary value and cannot
  be converted to money.
- Coins move one way. Money buys coins; coins never become money.
- Winnings are funded by the operator, not by other players' stakes.
- Mindi and Gin Rummy are substantially games of **skill**, not pure chance.

**Facts that create risk and must be raised honestly:**
- Real money does enter the system.
- **Paying increases your opportunity to win rewards.** VIP raises the daily
  cap on ranked matches, and ranked matches pay coins and trophies. Money
  therefore buys more chances at rewards, even though it does not buy the
  rewards directly. *Ask specifically whether this matters.*
- The Weekend League is a competition with rewards attached.
- **Mindi is culturally associated with money play in the Maldives.** Even if
  the app itself never handles a wager, a regulator or a member of the public
  may perceive an online Mindi service with a payment feature differently than
  they would a generic puzzle game. Ask whether perception and enforcement
  risk differ from the strict legal analysis.

### Questions to ask

1. Under current Maldivian law, is this gambling? What is the actual legal
   test applied?
2. Does the absence of cash-out settle the question, or is it only one factor?
3. Does the fact that paying buys **more chances to earn rewards** (via VIP
   match limits) change the analysis?
4. Would a "winner takes the staked coins" mode — which does not exist today —
   cross the line? I want a clear red line I can design around.
5. Does player-to-player coin transfer cross the line? (Also not implemented.)
6. Would a real-money prize tournament cross the line?
7. Does the Weekend League, as a competition with coin prizes, raise any
   issue?
8. What is the status of the 2026 gambling bill, and how would it apply?
9. Is there any licensing, notification or approval regime for online games
   in the Maldives — and is there a regulator I should speak to proactively?
10. Does hosting the service on foreign servers change where it is considered
    to operate?
11. If I am wrong about all this, what is my personal criminal exposure as an
    individual operator, and does incorporating change that?

---

## 3. Business structure, registration and tax

Public sources indicate a sole proprietorship can be registered online
through the Ministry of Economic Development business portal, is open only to
Maldivian citizens aged 18 or over, costs around MVR 500 and runs for five
years. Confirm all of this.

12. Should I operate as a **sole proprietorship** or a **limited liability
    company**? Specifically: does a company meaningfully protect me
    personally if there is a dispute about the gambling question, or about a
    player's money?
13. Am I legally required to register a business before taking payment from
    the public at all, or only above a revenue threshold?
14. **Tax.** Public sources mention registering with MIRA if average monthly
    gross revenue exceeds MVR 40,000, and a GST registration threshold of MVR
    1 million in annual sales. Confirm both figures, tell me which applies to
    me, and tell me what I must do *before* I cross them rather than after.
15. Is selling virtual in-game currency a **taxable supply of services** for
    GST? At what rate?
16. From 1 July 2025 the Maldives reportedly applies destination-based GST to
    digital services. Does that affect me as a **domestic** supplier? Does it
    affect me if I later sell to players outside the Maldives?
17. If players outside the Maldives buy coins, what changes — tax, licensing,
    or otherwise?
18. Do I need a separate **business bank account**, and am I currently
    exposed by taking player payments into a personal account?
19. What records must I keep of each top-up, and for how long?

---

## 4. Taking money from players

20. Coins are a **prepaid balance**. Does holding prepaid customer value
    create any obligation — consumer protection, a duty to honour the
    balance, or anything resembling e-money regulation?
21. What are my **refund** obligations? My drafted terms say coin purchases
    are final once credited. Is that enforceable in the Maldives?
22. If I shut the service down, what do I owe players holding unspent coins?
    Should the terms address this explicitly?
23. VIP is a time-limited paid tier. Does it count as a **subscription**, and
    does that bring extra obligations such as renewal notices or cooling-off?
24. The current top-up flow settles **outside the app** and is approved
    manually by me. Is there any legal problem with that arrangement?
25. Are there anti-money-laundering or know-your-customer obligations at any
    transaction volume? Is there a threshold at which I must start
    identifying customers?
26. Am I required to issue a receipt or tax invoice for each purchase?

---

## 5. Minors — the most urgent gap to close

**Right now the app collects no age information at all.** Anyone can create
an account, including anonymously. I need concrete direction here, not
general guidance.

27. Is there a minimum age at which a person can enter a binding contract in
    the Maldives — and does accepting my terms constitute one?
28. **Can a minor lawfully buy coins? If a 14-year-old's parent demands a
    refund, what is my position?**
29. Must I implement an age gate before launch? If so, what does a legally
    sufficient one look like — a self-declared date of birth, or something
    stronger?
30. Does the answer change because the game is a card game, given the
    cultural and religious sensitivity around card play and money?
31. Do I need parental consent for players under a certain age, and what
    would satisfy that?
32. What are my obligations regarding **children's personal data**
    specifically?
33. My app has **private direct messaging between users, with no age
    verification on either side**. What is my liability exposure if an adult
    contacts a child through it? What must I do to reduce it?

---

## 6. Data protection and privacy

Public sources indicate a Privacy and Personal Data Protection Bill was
released for consultation in 2023, with a proposed Data Protection Authority
and administrative fines, and an intended compliance date around January 2026.
Its current status needs confirming.

34. **Is there a data protection law in force in the Maldives today? If not,
    when, and what should I build for now?**
35. All player data sits on Google and Netlify servers **outside the
    Maldives**. Is that lawful now, and would it remain lawful under the
    proposed law's cross-border transfer rules?
36. Do I need a written processing agreement with Google or Netlify, or does
    their standard contract suffice?
37. Please review my drafted Privacy Policy (`app/privacy/page.tsx`). Is it
    adequate, and what is missing?
38. Am I obliged to provide **data export** and **account deletion** on
    request? My policy promises both by email — is a manual process
    acceptable, or must it be automated?
39. I store the **content of private messages between users**. Any special
    obligation attached to that?
40. If there is a data breach, whom must I notify, how fast, and in what form?
41. Do I need a written retention policy, and is there a maximum period I may
    keep inactive account data?

---

## 7. User-generated content and moderation

The app carries private messages, club chat and self-chosen display names.
There is **no reporting or blocking mechanism built yet**.

42. Am I legally responsible for what users say to each other on my service?
43. Does that change once I actively moderate — does moderating create a
    duty I do not currently have?
44. What must I do on receiving a complaint about a user, and how quickly?
45. Do I need to retain message records for law enforcement? For how long?
46. If asked by police for a user's data or messages, what am I required to
    hand over, and what should I refuse without a court order?
47. Is there any content-licensing or online-content registration requirement
    for an interactive service in the Maldives?

---

## 8. App store distribution and foreign exposure

48. Publishing on Google Play means contracting with a foreign company under
    foreign law, and makes the app reachable worldwide. What exposure does
    that create?
49. Both stores require digital goods to be sold through **their** billing
    systems, taking 15–30%. If I instead sell coins only on my website, am I
    exposed contractually, legally, or for tax?
50. If a player abroad plays and pays, which country's law governs the
    dispute? My terms specify Maldivian law — is that enforceable?
51. Should I **geo-restrict** the app to the Maldives at launch to limit
    exposure, and is that advisable?

---

## 9. Intellectual property and ownership

52. **Mindi** is a traditional game. Can I use the name commercially? Can
    anyone claim rights over it?
53. Should I register **"Thaasbai"** as a trademark in the Maldives? What
    does that cost and take?
54. A substantial part of this codebase was **written by AI assistants**
    working from my direction. Does that affect who owns the code, or my
    ability to assert rights over it? *(Worth asking plainly — the answer
    varies by jurisdiction and it is better to know now than during a
    dispute.)*
55. The app uses third-party open-source libraries. Any licence obligations I
    must satisfy before commercial release?
56. Player-uploaded profile photos and chosen display names: do I need a
    licence from users to display them, and does my terms wording cover it?

---

## 10. Operational and contingency

57. Please review my drafted **Terms of Service** (`app/terms/page.tsx`).
    Are the liability limits and the "coins have no cash value" clause
    enforceable here?
58. My terms let me remove coins and items obtained through cheating. Is that
    enforceable, and how should I word it?
59. What insurance, if any, is worth carrying?
60. If I later take on a partner or investor, what should I put in place
    *now* to avoid problems then?
61. What is the single biggest legal risk you see in this product, and what
    would you do about it first?

---

## 11. Bring these to the meeting

- This document.
- The drafted **Privacy Policy** and **Terms of Service** (print from
  `app/privacy/page.tsx` and `app/terms/page.tsx`, or open the pages once
  they are live at `/privacy` and `/terms`).
- A live walkthrough of the app on a phone or laptop — particularly the
  **shop**, the **coin top-up flow**, and a **ranked match**.
- The current coin pack price list in Rufiyaa.
- A note of any revenue taken so far, if any.

---

## 12. Decisions to come back with

The engineering work waiting on these answers:

| Decision | What it blocks |
|---|---|
| Is an age gate required, and what kind? | Must be built before store submission |
| Does VIP raising ranked-match limits create a problem? | May require redesigning the VIP benefit |
| Store billing, or web-only coin sales? | Monetisation implementation (#144) |
| Sole proprietorship or company? | Play Console registration — a business account also skips Play's 12-tester requirement |
| Business bank account required? | Payment flow |
| Geo-restrict to the Maldives at launch? | Store listing configuration |
| Operator name and contact email | Placeholders in the privacy policy and terms **must** be filled before submission |
| Data export / deletion — manual or automated? | Feature work |
| Moderation and reporting obligations | Abuse reporting build (#140) |

---

## Sources consulted

These informed the questions above and are worth your lawyer correcting
where wrong:

- [Bill proposes criminalizing gambling with jail sentences — Edition.mv](https://edition.mv/news/47216)
- [Maldives Penal Code (Law No. 6/2014)](https://www.law.upenn.edu/live/files/4203-maldives-penal-code-2014)
- [Privacy and Personal Data Protection Bill — Maldives](https://regulations.ai/regulations/RAI-MV-NA-PPDPXXX-2023)
- [Data Protection Bill introduced to regulate use of personal information — MV+](https://www.plus.mv/english/data-protection-bill-introduced-to-regulate-use-of-personal-information/)
- [How to register a sole proprietorship in the Maldives](https://achievia.mv/how-to-register-your-sole-proprietorship-in-maldives/)
- [MIRA — GST registration requirements](https://mira.gov.mv/Guides/View/gst_registration_requirements-ig)
- [Maldives GST guide for digital businesses](https://quaderno.io/guides/maldives-gst-guide/)
