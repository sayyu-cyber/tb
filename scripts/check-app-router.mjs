#!/usr/bin/env node
/**
 * Static validation of the Next.js App Router rules that `next build`
 * enforces but `tsc` and `next lint` do not.
 *
 * Why this exists: a change once shipped that added "use client" to a page
 * which also exported generateStaticParams(). Typecheck passed, lint
 * passed, and the failure only appeared in CI as:
 *
 *   Error: Page "/(main)/play/[game]/casual/online/live/page" cannot use
 *   both "use client" and export function "generateStaticParams()".
 *
 * These checks are cheap and catch that class of mistake before pushing.
 * Run via `npm run check`.
 */
import { readFileSync } from "node:fs";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const APP_DIR = "app";
const errors = [];
const warnings = [];

/** Recursively collect .tsx/.ts files under a directory. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(APP_DIR);

// Exports that only make sense in a server component.
const SERVER_ONLY = [
  { re: /export\s+(async\s+)?function\s+generateStaticParams\b/, name: "generateStaticParams()" },
  { re: /export\s+const\s+metadata\b/, name: "metadata" },
  { re: /export\s+(async\s+)?function\s+generateMetadata\b/, name: "generateMetadata()" },
  { re: /export\s+const\s+revalidate\b/, name: "revalidate" },
  { re: /export\s+const\s+dynamicParams\b/, name: "dynamicParams" },
];

for (const file of files) {
  const src = readFileSync(file, "utf8");
  // "use client" only counts as a directive when it's at the very top of
  // the module (ignoring comments and blank lines).
  const head = src
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("//") && !l.trim().startsWith("*") && !l.trim().startsWith("/*"))
    .slice(0, 1)
    .join("");
  const isClient = /^["']use client["']/.test(head.trim());

  if (!isClient) continue;

  for (const { re, name } of SERVER_ONLY) {
    if (re.test(src)) {
      errors.push(
        `${file}: is a client component ("use client") but exports ${name}. ` +
          `Next refuses to build this. Move the export to a server component ` +
          `(e.g. keep the page a server component and extract the interactive ` +
          `part into its own client component).`
      );
    }
  }
}

// With output:'export' every dynamic segment must be enumerable at build
// time, so each page under a [param] directory needs generateStaticParams.
const usesStaticExport = /output:\s*['"]export['"]/.test(
  readFileSync("next.config.js", "utf8")
);
if (usesStaticExport) {
  for (const file of files) {
    if (!/[/\\]page\.tsx?$/.test(file)) continue;
    if (!file.includes("[")) continue;
    const src = readFileSync(file, "utf8");
    if (!/generateStaticParams/.test(src)) {
      errors.push(
        `${file}: dynamic route is missing generateStaticParams(), which ` +
          `output:'export' requires in order to pre-render it.`
      );
    }
  }
}

// Referenced-but-missing public assets - the icon 404s that shipped once.
const manifestRefs = [];
try {
  const manifest = JSON.parse(readFileSync("public/manifest.json", "utf8"));
  for (const icon of manifest.icons ?? []) manifestRefs.push(icon.src);
} catch {
  /* no manifest is fine */
}
const layoutSrc = readFileSync(join(APP_DIR, "layout.tsx"), "utf8");
for (const m of layoutSrc.matchAll(/["'](\/[\w.-]+\.(png|ico|svg|webp|jpg))["']/g)) {
  manifestRefs.push(m[1]);
}
for (const ref of [...new Set(manifestRefs)]) {
  try {
    statSync(join("public", ref.replace(/^\//, "")));
  } catch {
    errors.push(`public${ref} is referenced (layout.tsx or manifest.json) but does not exist.`);
  }
}

for (const w of warnings) console.warn(`warn  ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} App Router problem(s) found:\n`);
  for (const e of errors) console.error(`  ✗ ${e}\n`);
  process.exit(1);
}
console.log(`✓ App Router checks passed (${files.length} files scanned).`);
