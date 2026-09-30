import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { realtimeChannelName, subscribe, toMillis, type Unsubscribe } from "@/lib/supabase/data";

export type ReportReason = "harassment" | "hate" | "sexual" | "spam" | "cheating" | "impersonation" | "other";

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
  evidence?: string;
  details?: string;
  status: ReportStatus;
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface BlockList {
  blocked: string[];
}

async function profileNames(ids: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return {};
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("profiles").select("id,display_name").in("id", unique);
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row: any) => [row.id, row.display_name || "Player"]));
}

export function watchBlocks(uid: string, onUpdate: (blocked: string[]) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      onUpdate(await getBlocks(uid));
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load blocks"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName(`blocks:${uid}`)).on("postgres_changes", { event: "*", schema: "public", table: "blocks", filter: `blocker_id=eq.${uid}` }, load), onError);
}

export async function getBlocks(uid: string): Promise<string[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.from("blocks").select("blocked_id").eq("blocker_id", uid);
  if (error) throw error;
  return (data ?? []).map((row: any) => row.blocked_id);
}

export async function blockUser(uid: string, targetUid: string): Promise<void> {
  if (uid === targetUid) throw new Error("You cannot block yourself.");
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("blocks").upsert({ blocker_id: uid, blocked_id: targetUid });
  if (error) throw error;
}

export async function unblockUser(uid: string, targetUid: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("blocks").delete().eq("blocker_id", uid).eq("blocked_id", targetUid);
  if (error) throw error;
}

export async function isBlockedEitherWay(uid: string, otherUid: string): Promise<boolean> {
  const [mine, theirs] = await Promise.all([getBlocks(uid), getBlocks(otherUid)]);
  return mine.includes(otherUid) || theirs.includes(uid);
}

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
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: input.reporterUid,
    target_id: input.targetUid,
    reason: input.reason,
    context: input.context,
    evidence: input.evidence?.slice(0, 500) ?? null,
    details: input.details?.slice(0, 500) ?? null,
  });
  if (error) throw error;
}

async function loadOpenReports(): Promise<ReportDoc[]> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id,reporter_id,target_id,reason,context,evidence,details,status,created_at,resolved_at,resolved_by")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const names = await profileNames((data ?? []).flatMap((row: any) => [row.reporter_id, row.target_id]));
  return (data ?? []).map((row: any) => ({
    id: row.id,
    reporterUid: row.reporter_id,
    reporterName: names[row.reporter_id] ?? "Player",
    targetUid: row.target_id,
    targetName: names[row.target_id] ?? "Player",
    reason: row.reason,
    context: row.context,
    evidence: row.evidence ?? undefined,
    details: row.details ?? undefined,
    status: row.status,
    createdAt: toMillis(row.created_at),
    resolvedAt: toMillis(row.resolved_at) || undefined,
    resolvedBy: row.resolved_by ?? undefined,
  }));
}

export function watchOpenReports(onUpdate: (reports: ReportDoc[]) => void, onError?: (err: Error) => void): Unsubscribe {
  const supabase = getSupabaseBrowserClient();
  const load = async () => {
    try {
      onUpdate(await loadOpenReports());
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error("Failed to load reports"));
    }
  };
  void load();
  return subscribe(supabase.channel(realtimeChannelName("open-reports")).on("postgres_changes", { event: "*", schema: "public", table: "reports" }, load), onError);
}

export async function resolveReport(reportId: string, status: Exclude<ReportStatus, "open">, adminUid: string): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("reports")
    .update({ status, resolved_at: new Date().toISOString(), resolved_by: adminUid })
    .eq("id", reportId);
  if (error) throw error;
}

