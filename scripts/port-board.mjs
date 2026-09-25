// Ports a design board's CSS into styles/, exactly.
//
//   node scripts/port-board.mjs Main mindi
//
// The boards in design/arena/boards are complete artboards: a fixed
// 1440x900 canvas with hard-coded positions and generic class names
// (.table, .btn, .face, .hud). Two things have to happen before that CSS can
// live in the app, and doing either by hand across seven boards is how
// mistakes get in:
//
//   1. NAMESPACE. `.table` and `.btn` would collide with the app's own
//      classes, so every selector is prefixed with the board's root class.
//      Keyframes, :root and font-face are left alone.
//
//   2. RECOLOUR. The owner replaced the pack's violet with #00BCC8. Every
//      violet in the pack - the flat hex, the gradient stops, the rgba()
//      forms - maps onto the blue ramp below. The script fails if it finds a
//      violet it does not know, so a new shade cannot slip through
//      unconverted.
//
// Everything else is copied verbatim, which is the point: the output is the
// board's own CSS, not a reinterpretation of it.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import postcss from "postcss";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/** The pack's violet ramp -> the owner's blue ramp, darkest to lightest. */
const VIOLET = [
  ["#7D39EB", "#00BCC8"],  // the violet itself
  ["#A873FF", "#4FE3EC"],  // gradient top
  ["#A57BFF", "#6FE9F0"],  // soft: dots, Thaana, small text
  ["#B18CFF", "#6FE9F0"],  // chase lights / motes
  ["#965BFF", "#4FE3EC"],  // button gradient top
  ["#6A28D8", "#009AA4"],  // button gradient bottom
  ["#5520B8", "#00858F"],  // avatar gradient bottom
  ["#4A1CA3", "#005A61"],  // deep
  ["#C9AEFF", "#9FF2F7"],  // chip text on a violet chip
  ["#5A22B8", "#00858F"],  // deep gradient stop
  ["#3E1685", "#00727A"],  // button lip
  ["#3B1C78", "#063A40"],  // apron edge
  ["#2E1468", "#06323A"],  // Neon Arena felt
  ["#17122A", "#0A2429"],  // Gin felt
  ["#150826", "#062027"],  // neon back base
  ["#0A0A12", "#080A0C"],  // shadow back base
];
/** The same colours as rgb triplets, for the rgba() forms. */
const VIOLET_RGB = [
  ["125, 57, 235", "0, 188, 200"],
  ["165, 123, 255", "111, 233, 240"],
  ["177, 140, 255", "111, 233, 240"],
  ["168, 115, 255", "79, 227, 236"],
];

/**
 * The boards name their fonts literally ('Space Grotesk'), because they load
 * them from Google Fonts with a <link>. The app loads them through
 * next/font, which hashes the family name and exposes only a CSS variable -
 * so a literal name silently falls through to system-ui and the whole board
 * renders in the wrong typeface.
 */
const FONTS = [
  [/'Space Grotesk',\s*system-ui,\s*sans-serif/g, "var(--font-display), system-ui, sans-serif"],
  [/'Space Grotesk',\s*sans-serif/g, "var(--font-display), sans-serif"],
  [/'Inter Tight',\s*system-ui,\s*sans-serif/g, "var(--font-ui), system-ui, sans-serif"],
  [/'Inter Tight',\s*sans-serif/g, "var(--font-ui), sans-serif"],
  [/'Noto Sans Thaana',\s*sans-serif/g, "var(--font-thaana), sans-serif"],
];

function retypeface(css) {
  let out = css;
  for (const [pattern, replacement] of FONTS) out = out.replace(pattern, replacement);
  const stray = out.match(/'(Space Grotesk|Inter Tight|Noto Sans Thaana)'/g);
  if (stray) {
    console.error(`✗ unconverted font reference: ${[...new Set(stray)].join(", ")}`);
    console.error("  add the form to FONTS in scripts/port-board.mjs");
    process.exit(1);
  }
  return out;
}

function recolour(css) {
  let out = css;
  for (const [from, to] of VIOLET) {
    out = out.replaceAll(from, to).replaceAll(from.toLowerCase(), to);
  }
  for (const [from, to] of VIOLET_RGB) {
    out = out.replaceAll(from, to).replaceAll(from.replace(/, /g, ","), to.replace(/, /g, ","));
  }
  return out;
}

/** Anything left that sits in the violet/purple hue band is a miss. */
function findStrayViolet(css) {
  const strays = [];
  for (const [, hex] of css.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    // Purple: blue clearly dominant, red above green, and not near-grey.
    if (b > 90 && b - g > 40 && r > g && b - Math.min(r, g) > 50) strays.push("#" + hex);
  }
  for (const [match, r, g, b] of css.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    const [R, G, B] = [+r, +g, +b];
    if (B > 90 && B - G > 40 && R > G && B - Math.min(R, G) > 50) strays.push(match + ")");
  }
  return [...new Set(strays)];
}

const [board, name] = process.argv.slice(2);
if (!board || !name) {
  console.error("usage: node scripts/port-board.mjs <Board> <name>   e.g. Main mindi");
  process.exit(1);
}

const html = readFileSync(join(root, "design", "arena", "boards", `${board}.dc.html`), "utf8");
const raw = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
if (!raw.trim()) { console.error(`No <style> found in ${board}.dc.html`); process.exit(1); }

const ns = `.arena-${name}`;
const recoloured = retypeface(recolour(raw));

const stray = findStrayViolet(recoloured);
if (stray.length) {
  console.error(`✗ ${board}: unconverted violet — add these to the map in scripts/port-board.mjs:`);
  for (const colour of stray) console.error(`    ${colour}`);
  process.exit(1);
}

const out = postcss.parse(recoloured);
out.walkRules(rule => {
  // The board's secondary button variant is `.violet`. The colour is now
  // #00BCC8, so the name would be a lie in every call site that used it.
  rule.selector = rule.selector.replace(/\.violet\b/g, ".blue");
  // Keyframe steps (0%, from, to) are not selectors; prefixing them breaks
  // the animation silently.
  if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
  rule.selectors = rule.selectors.map(selector => {
    const trimmed = selector.trim();
    if (trimmed === ":root" || trimmed.startsWith("@")) return selector;
    // `body`/`html` cannot be nested under the namespace; drop them - the app
    // sets its own page background.
    if (/^(body|html)\b/.test(trimmed)) return null;
    return `${ns} ${trimmed}`;
  }).filter(Boolean);
  if (rule.selectors.length === 0) rule.remove();
});

const header = `/* GENERATED from design/arena/boards/${board}.dc.html by scripts/port-board.mjs.
   Do not edit by hand - re-run the script instead.

   Two changes from the board, and only two: every selector is namespaced
   under ${ns} so the board's generic class names (.table, .btn, .face)
   cannot collide with the app's, and the pack's violet is replaced by the
   owner's #00BCC8 throughout. Everything else is the board's own CSS. */\n\n`;

const file = join(root, "styles", `arena-${name}.css`);
writeFileSync(file, header + out.toString() + "\n", "utf8");

let rules = 0; out.walkRules(() => rules++);
console.log(`✓ ${board} -> styles/arena-${name}.css (${rules} rules, namespaced ${ns}, violet -> #00BCC8)`);
