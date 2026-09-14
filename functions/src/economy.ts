import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { FieldValue, type Transaction } from 'firebase-admin/firestore';
import { db } from './admin';
import { ALL_COSMETICS, ROOM_CARD_PRICES } from '../../data/cosmetics';
import type { RoomCardType } from '../../types/economy';

/**
 * Server-authoritative economy.
 *
 * The rule every function here follows: the client may only say WHAT it
 * wants ("buy item cb_ocean"), never what it is worth. Prices come from the
 * shared catalogue compiled into this bundle, balances are read inside the
 * transaction that spends them, and nothing trusts a number from the caller.
 *
 * Before this existed, `playerEconomy/{uid}` was directly writable by its
 * owner and the entire client reducer state was persisted verbatim, so a
 * player could set their own balance from devtools. These functions plus the
 * rules lockdown are what close that.
 *
 * Every mutation runs in a Firestore transaction. Without one, two
 * simultaneous purchase calls could both read the same balance and both
 * succeed - the classic double-spend.
 */

/**
 * App Check enforcement.
 *
 * Deliberately OFF until App Check is actually configured and has run in
 * monitoring mode. Turning it on before the clients are issuing tokens
 * rejects every call and takes the economy offline. Flip to true as the last
 * step of the App Check task, after the console shows clean traffic.
 */
const ENFORCE_APP_CHECK = false;

const callable = { enforceAppCheck: ENFORCE_APP_CHECK } as const;

/** Every cosmetic keyed by id - the server's own price list. */
const CATALOGUE = new Map(ALL_COSMETICS.map((item) => [item.id, item]));

/** Which collection array a cosmetic category is stored under in
 *  `playerEconomy/{uid}.profile.collection`. */
const COLLECTION_KEY: Record<string, string> = {
  cardBack: 'cardBacks',
  tableTheme: 'tableThemes',
  profileFrame: 'profileFrames',
  emote: 'emotes',
  victoryAnimation: 'victoryAnimations',
  sticker: 'stickers',
  banner: 'banners',
};

function requireAuth(request: CallableRequest): string {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to continue.');
  return uid;
}

interface EconomyDoc {
  economy?: { coins?: number; totalEarned?: number; totalSpent?: number };
  profile?: {
    collection?: Record<string, string[]>;
    roomCards?: unknown[];
  };
}

/** Reads the economy doc inside a transaction and returns the canonical
 *  balance. `economy.coins` is the single source of truth since the
 *  single-balance migration - `profile.coins` is a dead legacy field. */
async function readBalance(tx: Transaction, uid: string): Promise<{ ref: FirebaseFirestore.DocumentReference; data: EconomyDoc; coins: number }> {
  const ref = db.collection('playerEconomy').doc(uid);
  const snap = await tx.get(ref);
  if (!snap.exists) throw new HttpsError('failed-precondition', 'No economy profile yet. Play a match first.');
  const data = snap.data() as EconomyDoc;
  return { ref, data, coins: data.economy?.coins ?? 0 };
}

// ─── Cosmetic purchase ────────────────────────────────────────────────

/**
 * Buy a cosmetic.
 *
 * The caller supplies only an item id. Price is looked up server-side, so
 * the previous client-side flow (which computed the price in the browser and
 * wrote the resulting balance) can no longer be talked into a discount.
 */
export const purchaseCosmetic = onCall(callable, async (request) => {
  const uid = requireAuth(request);
  const itemId = String(request.data?.itemId ?? '');

  const item = CATALOGUE.get(itemId);
  if (!item) throw new HttpsError('not-found', 'That item does not exist.');

  const collectionKey = COLLECTION_KEY[item.category];
  if (!collectionKey) throw new HttpsError('failed-precondition', 'That item cannot be purchased.');

  return db.runTransaction(async (tx) => {
    const { ref, data, coins } = await readBalance(tx, uid);
    const owned: string[] = data.profile?.collection?.[collectionKey] ?? [];

    // Idempotent: re-buying something you own is a no-op, not a second charge.
    if (owned.includes(itemId)) {
      return { ok: true, alreadyOwned: true, coins };
    }
    if (coins < item.price) {
      throw new HttpsError('failed-precondition', 'Not enough coins.');
    }

    tx.update(ref, {
      'economy.coins': FieldValue.increment(-item.price),
      'economy.totalSpent': FieldValue.increment(item.price),
      [`profile.collection.${collectionKey}`]: FieldValue.arrayUnion(itemId),
    });

    return { ok: true, alreadyOwned: false, coins: coins - item.price, spent: item.price };
  });
});

// ─── Room card purchase ───────────────────────────────────────────────

/**
 * Buy a room card.
 *
 * The old client action took `price` IN ITS PAYLOAD, so a modified client
 * could buy any duration for zero. The duration is now the only input and
 * the price comes from ROOM_CARD_PRICES.
 */
export const purchaseRoomCard = onCall(callable, async (request) => {
  const uid = requireAuth(request);
  const type = String(request.data?.type ?? '') as RoomCardType;

  const price = ROOM_CARD_PRICES[type];
  if (typeof price !== 'number') throw new HttpsError('not-found', 'Unknown room card type.');

  return db.runTransaction(async (tx) => {
    const { ref, coins } = await readBalance(tx, uid);
    if (coins < price) throw new HttpsError('failed-precondition', 'Not enough coins.');

    const card = {
      id: `rc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      type,
      purchasedAt: Date.now(),
      activatedAt: null,
      expiresAt: null,
    };

    tx.update(ref, {
      'economy.coins': FieldValue.increment(-price),
      'economy.totalSpent': FieldValue.increment(price),
      'profile.roomCards': FieldValue.arrayUnion(card),
    });

    return { ok: true, coins: coins - price, card };
  });
});

// ─── Coin top-up crediting ────────────────────────────────────────────

/**
 * Credit an approved top-up.
 *
 * Previously the player's own client flipped the request to 'credited' and
 * added the coins to its own document. The approval gate was sound but
 * irrelevant, because the balance was directly writable anyway.
 *
 * Now the transaction is the gate: it re-reads the request, refuses anything
 * that is not both owned by the caller and in 'approved' state, and flips it
 * to 'credited' in the same atomic write that adds the coins. Replaying the
 * call cannot pay twice, because the second attempt sees 'credited'.
 */
export const creditTopup = onCall(callable, async (request) => {
  const uid = requireAuth(request);
  const requestId = String(request.data?.requestId ?? '');
  if (!requestId) throw new HttpsError('invalid-argument', 'Missing request id.');

  return db.runTransaction(async (tx) => {
    const topupRef = db.collection('coinTopupRequests').doc(requestId);
    const topupSnap = await tx.get(topupRef);
    if (!topupSnap.exists) throw new HttpsError('not-found', 'Top-up request not found.');

    const topup = topupSnap.data() as { uid?: string; status?: string; coins?: number };
    if (topup.uid !== uid) throw new HttpsError('permission-denied', 'That request belongs to someone else.');
    if (topup.status !== 'approved') {
      // Covers both "not approved yet" and "already credited".
      throw new HttpsError('failed-precondition', `Request is ${topup.status ?? 'unknown'}, not approved.`);
    }

    const amount = Number(topup.coins);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpsError('failed-precondition', 'Request has no valid coin amount.');
    }

    const { ref, coins } = await readBalance(tx, uid);

    tx.update(ref, {
      'economy.coins': FieldValue.increment(amount),
      'economy.totalEarned': FieldValue.increment(amount),
    });
    tx.update(topupRef, { status: 'credited', creditedAt: Date.now() });

    return { ok: true, credited: amount, coins: coins + amount };
  });
});
