import { getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Single place the Admin SDK is initialised.
 *
 * This exists to remove an ordering hazard rather than for tidiness. When
 * index.ts both called `initializeApp()` and re-exported from another module
 * that called `getFirestore()` at its top level, the compiled CommonJS
 * hoisted the `require` above the `initializeApp()` call - so `getFirestore()`
 * ran first and threw "The default Firebase app does not exist" on every
 * cold start. Routing both through one module makes the order deterministic:
 * whichever file imports this first triggers initialisation, and the guard
 * keeps a second import from re-initialising.
 */
if (getApps().length === 0) {
  initializeApp();
}

export const db = getFirestore();
