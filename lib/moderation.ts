import {
  arrayRemove,
  arrayUnion,
  addDoc,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "./firebase";

/**
 * Blocking and abuse reporting.
 *
 * Both stores require a way for players to report and block each other
 * before an app carrying user-to-user chat will pass review, and the app
 * carries private DMs, club chat and self-chosen display names.
 *
 * Design note on where blocking is enforced: the block list is not merely a
 * client-side filter. `firestore.rules` reads the recipient's block list when
 * a direct message is created and rejects the write if the sender is on it.
 * That means a modified client cannot message someone who has blocked them -
 * the refusal happens in the database, not in the UI. Client-side filtering
 * on top of that is for presentation (hiding existing messages and players),
 * not for security.
 *
 * Reports are write-only for players: anyone signed in may file one, only an
 * admin may read or resolve them. A reporter cannot see, edit or withdraw
 * another player's report, and cannot tell whether a report was actioned.
 */

const BLOCKS_COLLECTION = "userBlocks";
const REPORTS_COLLECTION = "reports";

/** Why a player was reported. Kept short and concrete - free-text-only
 *  reporting produces piles of "he cheated" with no way to triage. */
export type ReportReason =
  | "harassment"
  | "hate"
  | "sexual"
  | "spam"
  | "cheating"
  | "impersonation"
  | "other";

export const REPORT_REASONS: { id: ReportReason; label: string }[] = [
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate speech" },
  { id: "sexual", label: "Sexual or inappropriate content" },
  { id: "spam", label: "Spam or advertising" },
  { id: "cheating", label: "Cheating" },
  { id: "impersonation", label: "Impersonation" },
  { id: "other", label: "Something else" },
];

export type ReportContext = "message" | "club" | "profile" | "match";
export type ReportStatus = "open" | "actioned" | "dismissed";

export interface ReportDoc {
  id: string;
  reporterUid: string;
  reporterName: string;
  targetUid: string;
  targetName: string;
  reason: ReportReason;
  context: ReportContext;
  /** Optional snapshot of the offending text. Captured at report time
   *  because the original can be deleted, and a report with no evidence is
   *  not actionable. */
  evidence?: string;
  details?: string;
  status: ReportStatus;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface BlockList {
  /** uids this player has blocked. */
  blocked: string[];
}

// ─── Blocking ─────────────────────────────────────────────────────────

/** Live view of the signed-in player's own block list. */
export function watchBlocks(
  uid: string,
  onUpdate: (blocked: string[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, BLOCKS_COLLECTION, uid),
    (snap) => onUpdate(snap.exists() ? (snap.data().blocked as string[]) ?? [] : []),
    onError
  );
}

/** One-shot read, for code paths that only need the list once. */
export async function getBlocks(uid: string): Promise<string[]> {
  const snap = await getDoc(doc(db, BLOCKS_COLLECTION, uid));
  return snap.exists() ? ((snap.data().blocked as string[]) ?? []) : [];
}

export async function blockUser(uid: string, targetUid: string): Promise<void> {
  if (uid === targetUid) throw new Error("You cannot block yourself.");
  // setDoc with merge rather than updateDoc: the document may not exist yet
  // for a player who has never blocked anyone, and updateDoc would fail.
  await setDoc(
    doc(db, BLOCKS_COLLECTION, uid),
    { blocked: arrayUnion(targetUid), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function unblockUser(uid: string, targetUid: string): Promise<void> {
  await setDoc(
    doc(db, BLOCKS_COLLECTION, uid),
    { blocked: arrayRemove(targetUid), updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Whether EITHER party has blocked the other.
 *
 * Blocking is deliberately symmetric in effect: if A blocks B, neither can
 * message the other. A one-way block would let the blocker keep messaging
 * someone who cannot reply, which is a harassment vector rather than a
 * safety feature.
 */
export async function isBlockedEitherWay(uid: string, otherUid: string): Promise<boolean> {
  const [mine, theirs] = await Promise.all([getBlocks(uid), getBlocks(otherUid)]);
  return mine.includes(otherUid) || theirs.includes(uid);
}

// ─── Reporting ────────────────────────────────────────────────────────

export async function reportUser(input: {
  reporterUid: string;
  reporterName: string;
  targetUid: string;
  targetName: string;
  reason: ReportReason;
  context: ReportContext;
  evidence?: string;
  details?: string;
}): Promise<void> {
  if (input.reporterUid === input.targetUid) throw new Error("You cannot report yourself.");
  await addDoc(collection(db, REPORTS_COLLECTION), {
    ...input,
    // Trim rather than store unbounded text - these are written by
    // untrusted clients and end up in an admin list.
    evidence: input.evidence?.slice(0, 500) ?? null,
    details: input.details?.slice(0, 500) ?? null,
    status: "open" as ReportStatus,
    createdAt: Date.now(),
  });
}

// ─── Admin ────────────────────────────────────────────────────────────

/** Open reports, newest first. Admin-only by firestore.rules. */
export function watchOpenReports(
  onUpdate: (reports: ReportDoc[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  return onSnapshot(
    query(
      collection(db, REPORTS_COLLECTION),
      where("status", "==", "open"),
      orderBy("createdAt", "desc"),
      limit(100)
    ),
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReportDoc, "id">) }))),
    onError
  );
}

export async function resolveReport(
  reportId: string,
  status: Exclude<ReportStatus, "open">,
  adminUid: string
): Promise<void> {
  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    status,
    resolvedAt: Date.now(),
    resolvedBy: adminUid,
  });
}
