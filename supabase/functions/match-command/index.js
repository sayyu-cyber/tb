/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./lib/openingCut.ts
// lib/openingCut.ts
//
// The opening cut: one card each, highest card plays first.
//
// Both games open the same way, so the ritual lives here rather than inside
// either rules engine - lib/mindiEngine.ts and the Gin Rummy clients both use
// this, and neither engine has to import the other.
//
// ACE IS HIGH IN THE CUT, in both games. That is deliberate and it is worth
// knowing for Gin Rummy, where an ace is otherwise the LOWEST card (a run may
// start A-2-3 but never turns the corner at the King). The cut is a separate
// ritual from the game's own card ranking, and the owner asked for Gin to cut
// exactly as Mindi does.
//
// Ties are broken by cutting again rather than by seat order, so the outcome
// never depends on where somebody happens to be sitting.
const CUT_SUITS = ["S", "H", "D", "C"];
function shuffledCutDeck(random) {
    const deck = [];
    for (const suit of CUT_SUITS) {
        for (let rank = 2; rank <= 14; rank++)
            deck.push({ suit, rank: rank });
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}
/**
 * Cuts one card for each key and returns the whole cut, so the UI can show
 * every card before naming the winner.
 *
 * Works for any number of players - two for Gin Rummy and for the Mindi 1v1
 * room variant, four for the standard Mindi game.
 */
function cutForFirstPlay(keys, random = Math.random) {
    const deal = () => {
        const deck = shuffledCutDeck(random);
        const cards = {};
        keys.forEach((key, i) => { cards[key] = deck[i]; });
        return cards;
    };
    for (let attempt = 0; attempt < 20; attempt++) {
        const cards = deal();
        let best = keys[0];
        let tied = false;
        for (const key of keys) {
            if (cards[key].rank > cards[best].rank) {
                best = key;
                tied = false;
            }
            else if (key !== best && cards[key].rank === cards[best].rank)
                tied = true;
        }
        if (!tied)
            return { cards, winner: best };
    }
    // Astronomically unlikely to land here; fall back rather than loop forever.
    return { cards: deal(), winner: keys[0] };
}

;// CONCATENATED MODULE: ./lib/mindiEngine.ts
// lib/mindiEngine.ts
//
// Rules engine for Mindi.
//
// These rules come from the game owner and are the authority for this app.
// They differ from the published "Dihaeh" description on pagat.com, which an
// earlier version of this file implemented — do not "correct" the engine back
// toward that source.
//
// SETUP
//   4 players, two fixed partnerships, partners sit opposite.
//   13 cards each from a standard 52-card pack.
//   Four cards are drawn face up, one per seat; highest card leads the first
//   trick (drawForFirstPlayer).
//   Ranking is standard: A high, then K Q J 10 9 ... 2.
//
// PLAY
//   Follow the led suit if you hold it. Highest card of the led suit wins.
//   The winner of a trick leads the next.
//   Every hand is played out to all 13 tricks — there is no early finish.
//
// TRUMP
//   There is NO trump at the start of a hand. The first time any player
//   cannot follow the led suit, the suit they play instead becomes trump for
//   the remainder of the hand. It takes effect immediately, so that card wins
//   the trick it was played in unless a higher trump follows in the same
//   trick. Trump beats any non-trump; only a higher trump beats a trump.
//
// WINNING — Tens ("Mindi" cards) decide it
//   Most Tens wins. Trick count is ONLY consulted at 2-2, so three Tens beats
//   one Ten even if the other team won every trick.
//   All four Tens AND every trick  = "Haas Baga".
//   All four Tens, not every trick = "Baga".
//
// This module is pure game logic — no React, no backend SDK — so it can be
// reused by AI matches, Pass & Play, and online matchmaking.

const SUITS = ["S", "H", "D", "C"];
const SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const SUIT_COLOR = { S: "black", H: "red", D: "red", C: "black" };
function rankLabel(rank) {
    if (rank === 14)
        return "A";
    if (rank === 13)
        return "K";
    if (rank === 12)
        return "Q";
    if (rank === 11)
        return "J";
    return String(rank);
}
function cardId(card) {
    return `${card.suit}${card.rank}`;
}
const SEATS = [0, 1, 2, 3];
function teamOf(seat) {
    return seat === 0 || seat === 2 ? "A" : "B";
}
function partnerOf(seat) {
    return ((seat + 2) % 4);
}
function nextSeat(seat) {
    return ((seat + 1) % 4);
}
/** Like nextSeat, but for the 1v1 FFA variant where only seats 0 and 1 are
 *  ever in play (see dealMindiHandFFA1v1) - just toggles between the two. */
function nextSeatFFA1v1(seat) {
    return seat === 0 ? 1 : 0;
}
/**
 * Kept as Mindi's own name for the cut, but the implementation is shared with
 * Gin Rummy in lib/openingCut.ts - both games open the same way, and neither
 * engine should have to import the other. Mindi's card ranks are already
 * 2..14 ace-high, so the shared cut card is the same shape as a Mindi card.
 */
function drawForFirstPlayer(seats = SEATS, random = Math.random) {
    const cut = cutForFirstPlay(seats, random);
    return { cards: cut.cards, winner: cut.winner };
}
function openMindiHand(dealer = 3, random = Math.random) {
    const draw = drawForFirstPlayer(SEATS, random);
    return { draw, deal: dealMindiHand(dealer, draw.winner, random) };
}
function openMindiHandFFA1v1(dealer = 1, random = Math.random) {
    const draw = drawForFirstPlayer([0, 1], random);
    return { draw, deal: dealMindiHandFFA1v1(dealer, draw.winner, random) };
}
function createShuffledDeck(random) {
    const deck = [];
    for (const suit of SUITS) {
        for (let rank = 2; rank <= 14; rank++) {
            deck.push({ suit, rank: rank });
        }
    }
    // Fisher-Yates shuffle
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}
/**
 * Deals a fresh hand: 13 cards each, one at a time, clockwise from the
 * dealer's left.
 *
 * No trump is set here. `leader` is who plays the first card, and is decided
 * by the four-card draw (drawForFirstPlayer) rather than by seat position,
 * so pass the draw winner in.
 */
function dealMindiHand(dealer, leader = nextSeat(dealer), random = Math.random) {
    const deck = createShuffledDeck(random);
    const hands = { 0: [], 1: [], 2: [], 3: [] };
    let seat = nextSeat(dealer);
    for (let i = 0; i < 52; i++) {
        hands[seat].push(deck[i]);
        seat = nextSeat(seat);
    }
    return { hands, trumpSuit: null, dealer, leader };
}
/**
 * Deals a 1v1 "free-for-all" hand: just two players, seats 0 and 1, no
 * partnership. Reuses the existing team plumbing unmodified - teamOf(0) is
 * always "A" and teamOf(1) is always "B", and since each "team" here has
 * exactly one player, the existing tensCaptured/tricksWon-by-team tallies
 * already are individual scoring for this mode. Seats 2 and 3 are simply
 * never dealt into or played from.
 *
 * 26 cards each (52 / 2), same one-at-a-time dealing rule as the 4-player
 * game. Trump is established in play here too, not dealt.
 */
function dealMindiHandFFA1v1(dealer, leader = dealer === 0 ? 1 : 0, random = Math.random) {
    const deck = createShuffledDeck(random);
    const hands = { 0: [], 1: [], 2: [], 3: [] };
    const other = dealer === 0 ? 1 : 0;
    let seat = other;
    for (let i = 0; i < 52; i++) {
        hands[seat].push(deck[i]);
        seat = seat === 0 ? 1 : 0;
    }
    return { hands, trumpSuit: null, dealer, leader };
}
/** Cards a seat may legally play, given the suit led (null if this seat is leading). */
function getLegalPlays(hand, ledSuit) {
    if (!ledSuit)
        return hand;
    const followers = hand.filter((c) => c.suit === ledSuit);
    return followers.length > 0 ? followers : hand;
}
/**
 * Trump after this card is played.
 *
 * Trump is established the first time anyone plays off-suit. No extra state
 * is needed to detect "couldn't follow": getLegalPlays already forces you to
 * follow the led suit whenever you hold it, so an off-suit card IS a renege
 * by definition.
 *
 * Returns the existing trump unchanged once one is set — only the FIRST
 * renege in a hand sets it, and it holds for the rest of the hand.
 */
function establishTrump(trumpSuit, ledSuit, card) {
    if (trumpSuit)
        return trumpSuit;
    if (!ledSuit)
        return null; // leading a trick can never set trump
    return card.suit === ledSuit ? null : card.suit;
}
/**
 * Which seat wins a completed trick.
 *
 * `trumpSuit` is null before any trump has been established, in which case
 * the highest card of the led suit simply wins.
 *
 * Note the trump that was established BY this trick counts within it: the
 * off-suit card that created the trump beats the led suit and takes the
 * round, unless a later player in the same trick plays a higher trump. Pass
 * the post-establishment trump in and this falls out naturally.
 */
function resolveTrick(plays, trumpSuit) {
    const ledSuit = plays[0].card.suit;
    const trumpPlays = trumpSuit ? plays.filter((p) => p.card.suit === trumpSuit) : [];
    const pool = trumpPlays.length > 0 ? trumpPlays : plays.filter((p) => p.card.suit === ledSuit);
    let best = pool[0];
    for (const p of pool) {
        if (p.card.rank > best.card.rank)
            best = p;
    }
    return best.seat;
}
/**
 * Trump for a trick, derived from the trump before it plus any renege within
 * it. Convenience for callers that resolve a whole trick at once.
 */
function trumpAfterTrick(trumpSuit, plays) {
    if (trumpSuit || plays.length === 0)
        return trumpSuit;
    const ledSuit = plays[0].card.suit;
    for (const play of plays) {
        const next = establishTrump(null, ledSuit, play.card);
        if (next)
            return next;
    }
    return null;
}
function isTen(card) {
    return card.rank === 10;
}
/**
 * The Tens in a trick that has just resolved, tagged with the team that took
 * it. Called from the same place the tensCaptured tally is updated, so the
 * two can never disagree about how many Tens went where.
 */
function tensFromTrick(plays, winner, trickNumber) {
    const team = teamOf(winner);
    return plays
        .filter((play) => isTen(play.card))
        .map((play) => ({ suit: play.card.suit, team, trick: trickNumber }));
}
/**
 * Checks whether the hand should end after the trick just resolved.
 * `totalTricks` defaults to 13 (the standard 4-player, 13-card-each game);
 * pass 26 for the 1v1 FFA variant (26 cards each - see
 * dealMindiHandFFA1v1), which needs a proportionally higher "unassailable
 * majority" and "all tricks played" threshold.
 */
function checkHandOutcome(tensCaptured, tricksWon, tricksPlayed, totalTricks = 13) {
    // Every hand runs to the last card. There is deliberately no early exit:
    // a team three Tens up has all but won, but the fourth Ten and the trick
    // count are still live, and those decide Baga, Haas Baga, and the 2-2
    // tiebreak. Calling it early would erase results players care about.
    if (tricksPlayed < totalTricks)
        return null;
    const tensA = tensCaptured.A;
    const tensB = tensCaptured.B;
    // Tens decide it outright. Trick count is ONLY a tiebreak at 2-2, which is
    // why three Tens beats one Ten even when the other team swept every trick.
    let winner;
    if (tensA !== tensB) {
        winner = tensA > tensB ? "A" : "B";
    }
    else {
        winner = tricksWon.A >= tricksWon.B ? "A" : "B";
    }
    const sweptTens = tensCaptured[winner] === 4;
    const sweptTricks = tricksWon[winner] === totalTricks;
    return {
        winner,
        tensCaptured,
        tricksWon,
        special: sweptTens ? (sweptTricks ? "haasbaga" : "baga") : null,
    };
}
/**
 * Simple-but-legal bot heuristic: follow suit when required, try to win
 * cheaply when it's worth winning (a Ten is in the trick, or the bot's team
 * isn't already winning), otherwise shed the lowest safe card.
 */
function chooseBotPlay(hand, trickSoFar, trumpSuit, botSeat) {
    const ledSuit = trickSoFar.length > 0 ? trickSoFar[0].card.suit : null;
    const legal = getLegalPlays(hand, ledSuit);
    const sorted = [...legal].sort((a, b) => a.rank - b.rank);
    if (!ledSuit) {
        // Leading: prefer a low non-trump card to conserve trumps. Before trump
        // exists there is nothing to conserve, so this is just the lowest card.
        const nonTrump = sorted.filter((c) => c.suit !== trumpSuit);
        return nonTrump[0] || sorted[0];
    }
    // A renege by this bot would SET trump, so evaluate the trick with the
    // trump that would be in force rather than the one before the play.
    const effectiveTrump = trumpAfterTrick(trumpSuit, trickSoFar);
    const partnerSeat = partnerOf(botSeat);
    const partnerCurrentlyWinning = trickSoFar.length > 0 && resolveTrick(trickSoFar, effectiveTrump) === partnerSeat;
    const tenInTrick = trickSoFar.some((p) => isTen(p.card));
    if (partnerCurrentlyWinning && !tenInTrick) {
        // No need to spend a good card — play the lowest legal card.
        return sorted[0];
    }
    // Cheapest legal card that would win the trick right now. Each candidate
    // is scored against the trump IT would create if it is a renege — playing
    // off-suit while trump is unset both sets trump and wins the trick.
    let cheapestWinner = null;
    for (const candidate of sorted) {
        const hypothetical = [...trickSoFar, { seat: botSeat, card: candidate }];
        const candidateTrump = establishTrump(effectiveTrump, ledSuit, candidate) ?? effectiveTrump;
        if (resolveTrick(hypothetical, candidateTrump) === botSeat) {
            cheapestWinner = candidate;
            break;
        }
    }
    if (cheapestWinner)
        return cheapestWinner;
    // Can't win (or don't need to) — shed the lowest card, preferring to keep trumps.
    const nonTrump = sorted.filter((c) => c.suit !== effectiveTrump);
    return nonTrump[0] || sorted[0];
}

;// CONCATENATED MODULE: ./lib/ginRummyEngine.ts
// lib/ginRummyEngine.ts
//
// Rules engine for Gin Rummy (2 players, standard 52-card deck, no jokers).
//
// THESE RULES COME FROM THE GAME OWNER and are the authority for this app.
// They deliberately differ from the standard game described on pagat.com,
// which an earlier version of this file implemented - do not "correct" the
// engine back toward that source.
//
// SETUP
// - Each player is dealt 10 cards; the rest form a stock, with the top card
//   turned up to start the discard pile.
//
// PLAY
// - Each turn: draw one card (from the stock or the top of the discard pile),
//   then discard one card. A turn is 15 seconds; see TURN_SECONDS.
// - If the stock runs out, the discard pile (except its top card) is shuffled
//   back into the stock and play continues. See replenishStock. There is no
//   fixed end to a hand - it runs until somebody wins.
//
// WINNING - the important difference
// - THERE IS NO KNOCKING. Deadwood never wins a hand, however low it is.
// - The only way to win is to hold, after discarding, exactly three melds
//   of sizes 3, 3 and 4 covering all ten cards. See findGinLayout.
//
// - Worth knowing, because it looks like a bug and is not: a long run counts
//   if it can be RE-CUT into 4+3+3. A ten-card run wins (A-2-3-4 | 5-6-7 |
//   8-9-10), and so do 6+4 and 7+3. The only way to meld all ten cards and
//   still not win is 5+5, because a five-card run cannot be cut into two
//   melds (that would need six cards) and a five-card set cannot exist.
//   So "must be 3,3,4" excludes exactly one shape: 5+5.
//
// - This is why bestMeldArrangement (which only minimises deadwood VALUE)
//   cannot be used to detect a win: it reports zero deadwood for 5+5 too.
//
// Deadwood is still computed, but only as a progress readout for the player
// and a heuristic for the bots - it decides nothing.
//
// Pure game logic only - no React, no backend SDK.
const ginRummyEngine_SUITS = ["S", "H", "D", "C"];
const ginRummyEngine_SUIT_SYMBOLS = { S: "♠", H: "♥", D: "♦", C: "♣" };
const ginRummyEngine_SUIT_COLOR = { S: "black", H: "red", D: "red", C: "black" };
function ginRummyEngine_rankLabel(rank) {
    if (rank === 1)
        return "A";
    if (rank === 11)
        return "J";
    if (rank === 12)
        return "Q";
    if (rank === 13)
        return "K";
    return String(rank);
}
function cardValue(rank) {
    if (rank >= 11)
        return 10;
    return rank;
}
function ginRummyEngine_cardId(card) {
    return `${card.suit}${card.rank}`;
}
function ginRummyEngine_createShuffledDeck(random = Math.random) {
    const deck = [];
    for (const suit of ginRummyEngine_SUITS) {
        for (let rank = 1; rank <= 13; rank++) {
            deck.push({ suit, rank: rank });
        }
    }
    for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
}
/** Deals a fresh hand: 10 cards each, then the next card starts the discard pile. */
function dealGinHand(random = Math.random) {
    const deck = ginRummyEngine_createShuffledDeck(random);
    const playerHand = deck.slice(0, 10);
    const opponentHand = deck.slice(10, 20);
    const discard = [deck[20]];
    const stock = deck.slice(21);
    return { playerHand, opponentHand, stock, discard };
}
function isSet(cards) {
    if (cards.length < 3)
        return false;
    return cards.every((c) => c.rank === cards[0].rank);
}
function isRun(cards) {
    if (cards.length < 3)
        return false;
    const suit = cards[0].suit;
    if (!cards.every((c) => c.suit === suit))
        return false;
    const ranks = [...cards].map((c) => c.rank).sort((a, b) => a - b);
    for (let i = 1; i < ranks.length; i++) {
        if (ranks[i] !== ranks[i - 1] + 1)
            return false;
    }
    return true;
}
/** All possible sets/runs (length 3+) that can be formed from a hand. */
function candidateMelds(hand) {
    const melds = [];
    // Sets: group by rank, take all subsets of size 3 and 4.
    const byRank = new Map();
    for (const c of hand) {
        if (!byRank.has(c.rank))
            byRank.set(c.rank, []);
        byRank.get(c.rank).push(c);
    }
    for (const cards of Array.from(byRank.values())) {
        if (cards.length >= 3)
            melds.push(cards.slice(0, 3));
        if (cards.length >= 4)
            melds.push(cards);
        if (cards.length === 4) {
            // also all four 3-card combinations
            for (let skip = 0; skip < 4; skip++) {
                melds.push(cards.filter((_, i) => i !== skip));
            }
        }
    }
    // Runs: group by suit, sort by rank, find all consecutive runs length >= 3.
    const bySuit = new Map();
    for (const c of hand) {
        if (!bySuit.has(c.suit))
            bySuit.set(c.suit, []);
        bySuit.get(c.suit).push(c);
    }
    for (const cards of Array.from(bySuit.values())) {
        const sorted = [...cards].sort((a, b) => a.rank - b.rank);
        for (let start = 0; start < sorted.length; start++) {
            let run = [sorted[start]];
            for (let next = start + 1; next < sorted.length; next++) {
                if (sorted[next].rank === run[run.length - 1].rank + 1) {
                    run = [...run, sorted[next]];
                    if (run.length >= 3)
                        melds.push(run);
                }
                else {
                    break;
                }
            }
        }
    }
    return melds;
}
/**
 * Finds the arrangement of non-overlapping melds that minimizes deadwood
 * value. Brute-force with memoization over "remaining card ids" - hands are
 * at most 11 cards, so this is small enough to be instant.
 */
function bestMeldArrangement(hand) {
    const melds = candidateMelds(hand);
    const cache = new Map();
    function key(cards) {
        return cards.map(ginRummyEngine_cardId).sort().join(",");
    }
    function solve(remaining) {
        if (remaining.length === 0)
            return { melds: [], value: 0 };
        const k = key(remaining);
        const cached = cache.get(k);
        if (cached)
            return cached;
        const remainingIds = new Set(remaining.map(ginRummyEngine_cardId));
        // Baseline: take no meld from remaining, all deadwood.
        let best = { melds: [], value: remaining.reduce((sum, c) => sum + cardValue(c.rank), 0) };
        for (const meld of melds) {
            if (!meld.every((c) => remainingIds.has(ginRummyEngine_cardId(c))))
                continue;
            const meldIds = new Set(meld.map(ginRummyEngine_cardId));
            const rest = remaining.filter((c) => !meldIds.has(ginRummyEngine_cardId(c)));
            const sub = solve(rest);
            if (sub.value < best.value) {
                best = { melds: [meld, ...sub.melds], value: sub.value };
            }
        }
        cache.set(k, best);
        return best;
    }
    const result = solve(hand);
    const meldedIds = new Set(result.melds.flat().map(ginRummyEngine_cardId));
    const deadwood = hand.filter((c) => !meldedIds.has(ginRummyEngine_cardId(c)));
    return { melds: result.melds, deadwood, deadwoodValue: result.value };
}
/** Seconds a player gets for a whole turn (draw AND discard together). */
const TURN_SECONDS = 15;
/** The only winning shape: three melds of exactly these sizes, all 10 cards. */
const GIN_MELD_SIZES = (/* unused pure expression or super */ null && ([4, 3, 3]));
/**
 * The winning layout for a hand, or null if the hand does not win.
 *
 * A win is exactly three melds of sizes 4, 3 and 3 covering all ten cards.
 * Because 4+3+3 is ten distinct cards, finding three non-overlapping melds of
 * those sizes in a ten-card hand necessarily covers the whole hand - there is
 * no separate "did it cover everything" check to forget.
 *
 * Deliberately NOT built on bestMeldArrangement: that minimises deadwood
 * value, so it happily reports zero deadwood for a 5+5 or a ten-card run,
 * neither of which wins under these rules.
 */
function findGinLayout(hand) {
    if (hand.length !== 10)
        return null;
    const melds = candidateMelds(hand);
    const fours = melds.filter((meld) => meld.length === 4);
    const threes = melds.filter((meld) => meld.length === 3);
    for (const four of fours) {
        const usedByFour = new Set(four.map(ginRummyEngine_cardId));
        for (let i = 0; i < threes.length; i++) {
            const first = threes[i];
            if (first.some((card) => usedByFour.has(ginRummyEngine_cardId(card))))
                continue;
            const usedSoFar = new Set([...Array.from(usedByFour), ...first.map(ginRummyEngine_cardId)]);
            for (let j = i + 1; j < threes.length; j++) {
                const second = threes[j];
                if (second.some((card) => usedSoFar.has(ginRummyEngine_cardId(card))))
                    continue;
                return [four, first, second];
            }
        }
    }
    return null;
}
function isWinningGin(hand) {
    return findGinLayout(hand) !== null;
}
function shuffle(items, random) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}
/**
 * Refills an empty stock from the discard pile so play can continue.
 *
 * The top discard stays face up and in play - it is the card an opponent may
 * still draw - and everything beneath it is shuffled back into the stock.
 * Returns the input untouched when there is nothing to recycle, so callers
 * can apply this unconditionally.
 */
function replenishStock(stock, discard, random = Math.random) {
    if (stock.length > 0 || discard.length <= 1)
        return { stock, discard };
    const top = discard[discard.length - 1];
    return { stock: shuffle(discard.slice(0, -1), random), discard: [top] };
}
/**
 * Scores a completed hand. Only ever called once a player's ten cards have
 * been verified as a 4+3+3 layout, so there is no losing branch here.
 */
function scoreGin(winner, layout, loserHand) {
    const loserDeadwood = bestMeldArrangement(loserHand).deadwoodValue;
    return { winner, layout, loserDeadwood, score: 25 + loserDeadwood };
}
/** Simple heuristic AI: prefers the discard-pile card only if it directly helps, else draws from stock. */
function botChooseDraw(hand, topDiscard) {
    if (!topDiscard)
        return "stock";
    // Taking the face-up card is only worth it if it leads somewhere: either it
    // completes a winning layout outright, or it lowers deadwood.
    const withDiscard = [...hand, topDiscard];
    if (winningDiscard(withDiscard))
        return "discard";
    return bestMeldArrangement(withDiscard).deadwoodValue < bestMeldArrangement(hand).deadwoodValue
        ? "discard"
        : "stock";
}
/**
 * The card to throw away that leaves a winning 4+3+3 behind, or null.
 * Shared by the bots and by the clients, which use it to detect that a human
 * player's discard has just won the hand.
 */
function winningDiscard(hand) {
    if (hand.length !== 11)
        return null;
    for (const candidate of hand) {
        const rest = hand.filter((card) => ginRummyEngine_cardId(card) !== ginRummyEngine_cardId(candidate));
        if (isWinningGin(rest))
            return candidate;
    }
    return null;
}
/**
 * Chooses a discard. Winning ends the hand, so it outranks every heuristic;
 * otherwise this minimises resulting deadwood, breaking ties by throwing the
 * highest-value card.
 *
 * Note the deadwood heuristic does not aim at 4+3+3 directly - it is a rough
 * proxy that keeps the bot collecting melds. Without the winning check above
 * the bots would almost never actually go out.
 */
function botChooseDiscard(hand) {
    const winner = winningDiscard(hand);
    if (winner)
        return winner;
    let best = hand[0];
    let bestValue = Infinity;
    for (const candidate of hand) {
        const rest = hand.filter((c) => ginRummyEngine_cardId(c) !== ginRummyEngine_cardId(candidate));
        const { deadwoodValue } = bestMeldArrangement(rest);
        if (deadwoodValue < bestValue ||
            (deadwoodValue === bestValue && cardValue(candidate.rank) > cardValue(best.rank))) {
            best = candidate;
            bestValue = deadwoodValue;
        }
    }
    return best;
}
/**
 * The discard used when a player's 15 seconds run out. Deliberately random,
 * as specified - it does not protect a hand that was about to win, which is
 * the cost of letting the clock run down.
 */
function randomDiscard(hand) {
    return hand[Math.floor(Math.random() * hand.length)];
}

;// CONCATENATED MODULE: ./server/matchAuthority.ts



function secureRandom() {
    return crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
}
function createState(game, players, random = secureRandom) {
    if (new Set(players).size !== players.length || ![2, 4].includes(players.length) || (game === "gin_rummy" && players.length !== 2)) {
        throw new Error("Invalid table configuration");
    }
    if (game === "mindi") {
        const { deal, draw } = players.length === 2 ? openMindiHandFFA1v1(1, random) : openMindiHand(3, random);
        return {
            handsByUid: Object.fromEntries(players.map((uid, seat) => [uid, deal.hands[seat]])),
            numPlayers: players.length, firstDraw: draw, trumpSuit: null, turnSeat: draw.winner,
            trick: [], tensCaptured: { A: 0, B: 0 }, tricksWon: { A: 0, B: 0 }, tricksPlayed: 0, outcome: null,
        };
    }
    const cut = cutForFirstPlay(players, random);
    const deal = dealGinHand(random);
    return { hands: { [players[0]]: deal.playerHand, [players[1]]: deal.opponentHand }, stock: deal.stock,
        discard: deal.discard, turn: cut.winner, phase: "draw", firstCut: cut, result: null };
}
function activePlayer(match) {
    return match.game === "mindi" ? match.players[match.state.turnSeat] : match.state.turn;
}
/** Reuses the product's engines; the caller cannot supply a replacement state. */
function applyMove(match, actor, move, now, random = secureRandom) {
    if (!match.players.includes(actor))
        throw new Error("You are not a player at this table");
    if (match.completed)
        throw new Error("This match has finished");
    const next = structuredClone(match);
    if (move.type === "timeout") {
        if (now < match.deadline)
            throw new Error("The turn has not expired");
        actor = activePlayer(match);
    }
    else if (move.type !== "forfeit") {
        if (actor !== activePlayer(match))
            throw new Error("It is not your turn");
        if (now >= match.deadline)
            throw new Error("The turn has expired. Refresh the table.");
    }
    if (match.game === "mindi") {
        const s = next.state;
        const seat = next.players.indexOf(actor);
        if (move.type === "forfeit") {
            s.outcome = { winner: teamOf(seat) === "A" ? "B" : "A", tensCaptured: s.tensCaptured,
                tricksWon: s.tricksWon, special: "forfeit" };
        }
        else {
            const hand = s.handsByUid[actor];
            const led = s.trick[0]?.card.suit ?? null;
            const legal = getLegalPlays(hand, led);
            const card = move.type === "timeout" ? legal[0] : move.type === "play"
                ? legal.find(c => c.suit === move.card.suit && c.rank === move.card.rank) : undefined;
            if (!card)
                throw new Error("That card cannot be played");
            s.handsByUid[actor] = hand.filter(c => cardId(c) !== cardId(card));
            s.trumpSuit = establishTrump(s.trumpSuit, led, card);
            s.trick.push({ seat, card });
            if (s.trick.length === next.players.length) {
                const winner = resolveTrick(s.trick, s.trumpSuit), team = teamOf(winner);
                s.tensCaptured[team] += s.trick.filter(p => isTen(p.card)).length;
                s.tricksWon[team]++;
                s.tricksPlayed++;
                s.lastTrick = { plays: s.trick, winner, number: s.tricksPlayed };
                s.tenCaptures = [...(s.tenCaptures ?? []), ...tensFromTrick(s.trick, winner, s.tricksPlayed)];
                s.trick = [];
                s.turnSeat = winner;
                s.outcome = checkHandOutcome(s.tensCaptured, s.tricksWon, s.tricksPlayed, next.players.length === 2 ? 26 : 13);
            }
            else
                s.turnSeat = ((seat + 1) % next.players.length);
        }
        next.completed = !!s.outcome;
        next.deadline = now + 30000;
    }
    else {
        const s = next.state;
        const opponent = next.players.find(uid => uid !== actor);
        if (move.type === "forfeit") {
            s.result = { winnerUid: opponent, layout: [], loserDeadwood: bestMeldArrangement(s.hands[actor]).deadwoodValue,
                score: 0, forfeitedBy: actor };
        }
        else {
            if (move.type === "draw" || (move.type === "timeout" && s.phase === "draw")) {
                if (s.phase !== "draw")
                    throw new Error("Discard before drawing again");
                if (move.type === "draw" && move.source === "discard") {
                    if (!s.discard.length)
                        throw new Error("The discard pile is empty");
                    s.hands[actor].push(s.discard.pop());
                }
                else {
                    if (!s.stock.length) {
                        const refilled = replenishStock(s.stock, s.discard, random);
                        s.stock = refilled.stock;
                        s.discard = refilled.discard;
                        s.reshuffles = (s.reshuffles ?? 0) + 1;
                    }
                    if (!s.stock.length)
                        throw new Error("No card is available to draw");
                    s.hands[actor].push(s.stock.pop());
                }
                s.phase = "discard";
            }
            if (move.type === "discard" || move.type === "timeout") {
                if (s.phase !== "discard")
                    throw new Error("Draw before discarding");
                const hand = s.hands[actor];
                const card = move.type === "timeout" ? hand[Math.floor(random() * hand.length)]
                    : hand.find(c => c.suit === move.card.suit && c.rank === move.card.rank);
                if (!card)
                    throw new Error("That card is not in your hand");
                s.hands[actor] = hand.filter(c => ginRummyEngine_cardId(c) !== ginRummyEngine_cardId(card));
                s.discard.push(card);
                const layout = findGinLayout(s.hands[actor]);
                if (layout) {
                    const score = scoreGin("player", layout, s.hands[opponent]);
                    s.result = { winnerUid: actor, layout, loserDeadwood: score.loserDeadwood, score: score.score };
                }
                else {
                    s.turn = opponent;
                    s.phase = "draw";
                }
                next.deadline = now + TURN_SECONDS * 1000;
            }
            else if (move.type !== "draw")
                throw new Error("Invalid Gin move");
        }
        next.completed = !!s.result;
        s.turnDeadline = next.completed ? null : next.deadline;
    }
    return next;
}
function projectMatch(match) {
    const hands = match.game === "mindi" ? match.state.handsByUid : match.state.hands;
    const handCounts = Object.fromEntries(match.players.map(uid => [uid, hands[uid].length]));
    const publicState = match.game === "mindi"
        ? { ...match.state, handsByUid: {}, handCounts, turnDeadline: match.completed ? null : match.deadline }
        : { ...match.state, hands: match.completed ? hands : {}, stock: [],
            stockCount: match.state.stock.length, handCounts, turnDeadline: match.completed ? null : match.deadline };
    return { publicState, privateStates: Object.fromEntries(match.players.map(uid => [uid, { hand: hands[uid] }])) };
}
function winners(match) {
    if (!match.completed)
        return [];
    if (match.game === "gin_rummy")
        return [match.state.result.winnerUid];
    const team = match.state.outcome.winner;
    return match.players.filter((_, seat) => teamOf(seat) === team);
}

;// CONCATENATED MODULE: ./server/matchCommandHandler.ts

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class RequestError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}
function createMatchHandler(config, requestFetch = fetch) {
    return async (request) => {
        const origin = request.headers.get("origin");
        const headers = { "Content-Type": "application/json", "Cache-Control": "no-store", Vary: "Origin" };
        if (origin && config.origins.includes(origin)) {
            headers["Access-Control-Allow-Origin"] = origin;
            headers["Access-Control-Allow-Headers"] = "authorization, apikey, content-type, x-client-info";
            headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
        }
        const respond = (body, status = 200) => new Response(JSON.stringify(body), { status, headers });
        if (origin && !config.origins.includes(origin))
            return respond({ error: "Origin is not allowed" }, 403);
        if (request.method === "OPTIONS")
            return new Response(null, { status: 204, headers });
        if (request.method !== "POST")
            return respond({ error: "POST required" }, 405);
        try {
            if (!config.url || !config.serviceKey)
                throw new RequestError("Game server is not configured", 503);
            const authorization = request.headers.get("authorization");
            if (!authorization?.startsWith("Bearer "))
                throw new RequestError("Sign in to play", 401);
            const auth = await requestFetch(`${config.url}/auth/v1/user`, {
                headers: { Authorization: authorization, apikey: config.serviceKey }, signal: AbortSignal.timeout(10000),
            });
            if (!auth.ok)
                throw new RequestError("Your session expired. Sign in again.", 401);
            const user = await auth.json();
            if (!uuid.test(user.id) || user.is_anonymous)
                throw new RequestError("A permanent account is required", 403);
            const text = await request.text();
            if (text.length > 4096)
                throw new RequestError("Command is too large", 413);
            const command = JSON.parse(text);
            if (!command || typeof command !== "object" || Array.isArray(command))
                throw new RequestError("Invalid command");
            const rpc = async (name, args) => {
                const response = await requestFetch(`${config.url}/rest/v1/rpc/${name}`, {
                    method: "POST", headers: { Authorization: `Bearer ${config.serviceKey}`, apikey: config.serviceKey, "Content-Type": "application/json" },
                    body: JSON.stringify(args), signal: AbortSignal.timeout(15000),
                });
                const result = await response.json();
                if (!response.ok) {
                    // Database validation messages are useful; don't expose SQL details or internals.
                    if (result.code === "P0001" || result.code === "42501")
                        throw new RequestError(result.message, result.code === "42501" ? 403 : 400);
                    console.error("Match command database failure", name, result.code);
                    throw new RequestError("The game could not be saved. Please retry.", 503);
                }
                return result;
            };
            if (command.type === "form" || command.type === "start-room") {
                const room = command.type === "start-room" ? command.code : null;
                if (room !== null && (typeof room !== "string" || !/^[A-Z0-9]{6}$/.test(room)))
                    throw new RequestError("Invalid room code");
                const game = room ? "mindi" : command.game;
                const pool = room ? "casual" : command.pool;
                if (!["mindi", "gin_rummy"].includes(game) || !["casual", "ranked", "weekend"].includes(pool))
                    throw new RequestError("Invalid game mode");
                const party = command.party ?? null;
                if (party !== null && (typeof party !== "string" || !/^[A-Z0-9]{6}$/.test(party)))
                    throw new RequestError("Invalid party");
                const candidate = await rpc("authority_candidates", { p_actor: user.id, p_game: game, p_pool: pool, p_party: party, p_room: room });
                if (!candidate)
                    return respond({ result: null });
                const groups = candidate.game === "gin_rummy" && candidate.players.length === 4
                    ? [candidate.players.slice(0, 2), candidate.players.slice(2, 4)] : [candidate.players];
                const tables = groups.map(players => {
                    const match = { game: candidate.game, players, state: createState(candidate.game, players),
                        completed: false, deadline: Date.now() + 60000 };
                    return { players, state: match.state, deadline: match.deadline, ...projectMatch(match) };
                });
                return respond({ result: await rpc("authority_start", { p_actor: user.id, p_game: candidate.game, p_pool: candidate.pool,
                        p_players: candidate.players, p_tables: tables, p_room: candidate.room, p_party: candidate.party }) });
            }
            if (command.type !== "move" || !uuid.test(command.matchId) || !Number.isSafeInteger(command.revision) || command.revision < 0)
                throw new RequestError("Invalid move command");
            const move = command.move;
            if (!move || !["play", "draw", "discard", "forfeit", "timeout"].includes(move.type))
                throw new RequestError("Unknown move");
            if ((move.type === "play" || move.type === "discard") && (!move.card || !["S", "H", "D", "C"].includes(move.card.suit) || !Number.isInteger(move.card.rank)))
                throw new RequestError("Invalid card");
            if (move.type === "draw" && !["stock", "discard"].includes(move.source))
                throw new RequestError("Invalid draw source");
            const current = await rpc("authority_load", { p_actor: user.id, p_match: command.matchId });
            if (current.revision !== command.revision)
                throw new RequestError("The table changed. Please try your move again.", 409);
            let next;
            try {
                next = applyMove(current, user.id, move, Date.now());
            }
            catch (error) {
                throw new RequestError(error instanceof Error ? error.message : "Invalid move");
            }
            const projection = projectMatch(next);
            const saved = await rpc("authority_commit", { p_actor: user.id, p_match: command.matchId, p_revision: current.revision,
                p_state: next.state, p_public: projection.publicState, p_private: projection.privateStates, p_deadline: next.deadline, p_winners: winners(next) });
            if (!saved)
                throw new RequestError("The table changed. Please try your move again.", 409);
            return respond({ result: true });
        }
        catch (error) {
            if (error instanceof RequestError)
                return respond({ error: error.message }, error.status);
            if (error instanceof SyntaxError)
                return respond({ error: "Invalid JSON" }, 400);
            console.error("Match command failed", error instanceof Error ? error.name : "unknown");
            return respond({ error: "The game server is unavailable. Please retry." }, 503);
        }
    };
}

;// CONCATENATED MODULE: ./server/matchCommandEntry.ts

Deno.serve(createMatchHandler({
    url: Deno.env.get("SUPABASE_URL") ?? "",
    serviceKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    origins: (Deno.env.get("GAME_ALLOWED_ORIGINS") ?? "").split(",").map(value => value.trim()).filter(Boolean),
}));

/******/ })()
;