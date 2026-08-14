"use client";

/**
 * Last-resort boundary for errors thrown by the ROOT LAYOUT itself
 * (app/layout.tsx) - most plausibly a provider failing to initialise, e.g.
 * Firebase misconfigured at boot. When this renders, Next has replaced the
 * whole document, so it must supply its own <html>/<body>.
 *
 * Two consequences worth knowing before editing this file:
 *  - No providers exist here, so useTranslation() is unavailable and the
 *    copy is deliberately English-only. Don't "fix" that by importing the
 *    hook; it would throw inside the error handler itself.
 *  - Tailwind classes still apply, but the CSS custom properties from
 *    globals.css may not have been applied yet, so colours are hardcoded
 *    to the brand values rather than read from var(--c1) etc.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F0F0F",
          color: "#FFFFFF",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "22rem" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "9999px",
              margin: "0 auto 1.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.2)",
              fontSize: 28,
            }}
            aria-hidden="true"
          >
            ⚠
          </div>

          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            Thaasbai couldn&apos;t start
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#888888", lineHeight: 1.6, marginBottom: "1.5rem" }}>
            Something went wrong while loading the app. Please try again — if it keeps happening,
            reload the page or check your connection.
          </p>

          {error.digest && (
            <p
              style={{
                fontSize: "0.625rem",
                color: "#3A3A3A",
                fontFamily: "monospace",
                wordBreak: "break-all",
                marginBottom: "1.5rem",
              }}
            >
              {error.digest}
            </p>
          )}

          <button
            onClick={reset}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "0.75rem",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "#0F0F0F",
              background: "linear-gradient(to right, #B8962E, #D4AF37)",
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
