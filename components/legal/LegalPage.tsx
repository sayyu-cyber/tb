import Link from "next/link";

/**
 * Shared shell for the legal pages.
 *
 * These render OUTSIDE ProtectedRoute (see AppShell's PUBLIC_PATHS): Google
 * Play and the App Store both require a privacy policy reachable at a plain
 * URL by a reviewer who is not signed in, and a policy behind a login wall
 * fails that check.
 *
 * Deliberately plain typography rather than the app's gaming chrome - these
 * are documents, and reviewers skim them.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** ISO date, rendered verbatim so it cannot drift with locale. */
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="legal-page">
      <Link href="/" className="legal-back">
        ← Thaasbai
      </Link>
      <h1>{title}</h1>
      <p className="legal-updated">Last updated: {updated}</p>
      <div className="legal-body">{children}</div>
      <footer className="legal-footer">
        <Link href="/privacy/">Privacy Policy</Link>
        <Link href="/terms/">Terms of Service</Link>
      </footer>
    </main>
  );
}
