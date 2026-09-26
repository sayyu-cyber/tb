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
  [/['"]Space Grotesk['"],\s*system-ui,\s*sans-serif/g, "var(--font-display), system-ui, sans-serif"],
  [/['"]Space Grotesk['"],\s*sans-serif/g, "var(--font-display), sans-serif"],
  [/['"]Inter Tight['"],\s*system-ui,\s*sans-serif/g, "var(--font-ui), system-ui, sans-serif"],
  [/['"]Inter Tight['"],\s*sans-serif/g, "var(--font-ui), sans-serif"],
  [/['"]Noto Sans Thaana['"],\s*sans-serif/g, "var(--font-thaana), sans-serif"],
];

function retypeface(css) {
  let out = css;
  for (const [pattern, replacement] of FONTS) out = out.replace(pattern, replacement);
  const stray = out.match(/['"](Space Grotesk|Inter Tight|Noto Sans Thaana)['"]/g);
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

/**
 * Purples that are artwork, not the pack's accent colour, and must survive
 * the recolour. The Sunset card back is a dusk gradient: orange to pink to a
 * deep purple night. Mapping its last stop onto the blue ramp would turn a
 * sunset into a teal smear. The allow-list is explicit so a real stray
 * violet still fails the build.
 */
const DELIBERATE_PURPLE = new Set([
  "#4A1F6B", // .cb.sunset - the night end of the dusk gradient
]);

/** Anything left that sits in the violet/purple hue band is a miss. */
function findStrayViolet(css) {
  const strays = [];
  for (const [, hex] of css.matchAll(/#([0-9a-fA-F]{6})\b/g)) {
    const r = parseInt(hex.slice(0, 2), 16), g = parseInt(hex.slice(2, 4), 16), b = parseInt(hex.slice(4, 6), 16);
    // Purple: blue clearly dominant, red above green, and not near-grey.
    if (DELIBERATE_PURPLE.has(("#" + hex).toUpperCase())) continue;
    if (b > 90 && b - g > 40 && r > g && b - Math.min(r, g) > 50) strays.push("#" + hex);
  }
  for (const [match, r, g, b] of css.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/g)) {
    const [R, G, B] = [+r, +g, +b];
    if (B > 90 && B - G > 40 && R > G && B - Math.min(R, G) > 50) strays.push(match + ")");
  }
  return [...new Set(strays)];
}

/** Keyed on the selector and the declarations together, so a board that
 *  restyles a shared class keeps its own version and only true duplicates
 *  are dropped. */
function fingerprint(rule) {
  const body = rule.nodes.map(node => node.toString().trim()).join(";");
  return `${rule.selector.replace(/\s+/g, " ").trim()}{${body.replace(/\s+/g, " ")}}`;
}

/**
 * The phone set. Unlike the desktop app boards, which all embed a copy of
 * design/arena/app-reference.css, the phone boards have no shared file to
 * point at - the layer they have in common only exists as the rules they
 * repeat. So it is computed: `--shared phone` writes the rules that appear
 * in at least half of these boards to styles/arena-phone.css, and
 * `--minus-shared` drops that same set from a board's own sheet.
 *
 * Both derive from one function over one list, so the shared sheet and the
 * subtraction can never disagree about what "shared" means.
 */
const PHONE_BOARDS = [
  "MHome", "MMore", "MPlay", "MPlayFind", "MRotate", "MProfile", "MInventory",
  "MFriends", "MMessages", "MChat", "MClubs", "MLeaderboard", "MAchievements",
  "MLeague", "MHallOfFame", "MShop", "MShopBuy", "MShopShort", "MShopVip",
  "MRewards", "MSettings",
];

/** A board's <style> blocks, recoloured and retypefaced but not namespaced. */
function boardCss(name) {
  const file = join(root, "design", "arena", "boards", `${name}.dc.html`);
  const text = readFileSync(file, "utf8");
  const raw = [...text.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
  return retypeface(recolour(raw));
}

/**
 * Fingerprints of the rules the phone boards have in common. A rule counts
 * as shared once at least half the boards carry it byte for byte; a board
 * that restyles one keeps its own version, exactly as `--minus` does.
 */
function sharedPhoneRules() {
  const seen = new Map();
  for (const name of PHONE_BOARDS) {
    const own = new Set();
    postcss.parse(boardCss(name)).walkRules(rule => {
      if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
      own.add(fingerprint(rule));
    });
    for (const print of own) seen.set(print, (seen.get(print) ?? 0) + 1);
  }
  const quorum = Math.ceil(PHONE_BOARDS.length / 2);
  return new Set([...seen].filter(([, count]) => count >= quorum).map(([print]) => print));
}

const args = process.argv.slice(2);

// `--css <file> <name>` ports a plain stylesheet that sits beside the boards
// instead of inside one. design/arena/app-reference.css is the shared shell
// (sidebar, top bar, panels, pills, card backs) that all fourteen app boards
// repeat; porting it once keeps a single copy in styles/ rather than the same
// rules duplicated through fourteen generated files.
const cssMode = args[0] === "--css";

// `--shared <name>` writes the phone set's common layer to
// styles/arena-<name>.css. The rules are taken in MHome's order so the
// sheet reads the way a board does rather than in hash order.
if (args[0] === "--shared") {
  const name = args[1];
  if (!name) { console.error("usage: node scripts/port-board.mjs --shared phone"); process.exit(1); }
  const keep = sharedPhoneRules();
  const sheet = postcss.parse(boardCss(PHONE_BOARDS[0]));
  const ns = `.arena-${name}`;

  // Every @keyframes in the set, declared once here. They are not
  // namespaced (an animation name is global), so leaving them in the board
  // sheets would put twenty copies of `drift` in the stylesheet and make
  // whichever loaded last the real one. A name defined two different ways
  // is a genuine conflict and stops the build rather than picking a winner.
  const frames = new Map();
  for (const other of PHONE_BOARDS) {
    postcss.parse(boardCss(other)).walkAtRules(at => {
      if (!/keyframes/.test(at.name)) return;
      const body = at.toString().replace(/\s+/g, " ");
      const had = frames.get(at.params);
      if (had && had.body !== body) {
        console.error(`✗ @keyframes ${at.params} differs between ${had.board} and ${other}`);
        process.exit(1);
      }
      if (!had) frames.set(at.params, { board: other, node: at.clone(), body });
    });
  }
  sheet.walkAtRules(at => { if (/keyframes/.test(at.name)) at.remove(); });
  for (const { node } of [...frames.values()].sort((a, b) => a.node.params.localeCompare(b.node.params))) {
    sheet.append(node);
  }
  sheet.walkRules(rule => {
    // A keyframe's steps (0%, from, to) are rules too. They are not part of
    // the shared SET - they belong to their @keyframes, which is copied
    // whole above - so testing them against it would empty every animation.
    if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
    if (!keep.has(fingerprint(rule))) { rule.remove(); return; }
    rule.selector = rule.selector.replace(/\.violet\b/g, ".blue").replace(/\.btn\b/g, ".ar-btn");
    rule.selectors = rule.selectors.map(selector => {
      const trimmed = selector.trim();
      if (trimmed === ":root" || trimmed.startsWith("@")) return selector;
      if (/^(body|html)\b/.test(trimmed)) return null;
      return `${ns} ${trimmed}`;
    }).filter(Boolean);
    if (rule.selectors.length === 0) rule.remove();
  });
  let count = 0; sheet.walkRules(rule => { if (rule.parent?.type !== "atrule") count++; });
  const head = `/* GENERATED by scripts/port-board.mjs --shared ${name}.
   Do not edit by hand - re-run the script instead.

   The layer the phone boards have in common. They have no shared file to
   point at the way the desktop boards have app-reference.css, so this is
   the set of rules at least half of them repeat byte for byte, namespaced
   under ${ns} and taken in ${PHONE_BOARDS[0]}'s order.

   Each board's own sheet is generated with --minus-shared, which drops
   this same set, so a board that restyles one of these keeps its version
   and only true duplicates are dropped. Board sheets are imported after
   this one, so where both define a selector the board wins. */\n\n`;
  writeFileSync(join(root, "styles", `arena-${name}.css`), head + sheet.toString() + "\n", "utf8");
  console.log(`✓ phone shared layer -> styles/arena-${name}.css (${count} rules and ${frames.size} keyframes from ${PHONE_BOARDS.length} boards)`);
  process.exit(0);
}

const positional = cssMode ? args.slice(1) : args;

// `--minus <file.css>` drops every rule the board shares, byte for byte,
// with that stylesheet. The fourteen app boards each embed the whole of
// app-reference.css before their own rules, so without this each board
// sheet would carry another namespaced copy of .panel, .pill, .ava and the
// thirteen card backs - about 1,300 duplicated lines across the set, and
// fourteen chances for a shared piece to be shadowed by a stale copy of
// itself. Only exact matches are dropped: a board that genuinely changes a
// shared rule keeps its version.
const minusAt = positional.indexOf("--minus");
const minusFile = minusAt === -1 ? null : positional[minusAt + 1];
if (minusAt !== -1) positional.splice(minusAt, 2);

// `--minus-shared` is the phone set's equivalent: it drops the computed
// common layer (styles/arena-phone.css) instead of a named file.
const minusSharedAt = positional.indexOf("--minus-shared");
const minusShared = minusSharedAt !== -1;
if (minusShared) positional.splice(minusSharedAt, 1);

const [board, name] = positional;
if (!board || !name) {
  console.error("usage: node scripts/port-board.mjs <Board> <name> [--minus <file.css>]");
  console.error("   e.g. node scripts/port-board.mjs Main mindi");
  console.error("        node scripts/port-board.mjs --css app-reference.css app");
  console.error("        node scripts/port-board.mjs Home home --minus app-reference.css");
  process.exit(1);
}

const source = cssMode
  ? join(root, "design", "arena", board)
  : join(root, "design", "arena", "boards", `${board}.dc.html`);
const text = readFileSync(source, "utf8");
const raw = cssMode
  ? text
  : [...text.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(m => m[1]).join("\n");
if (!raw.trim()) { console.error(`No CSS found in ${source}`); process.exit(1); }

const ns = `.arena-${name}`;
const recoloured = retypeface(recolour(raw));

const stray = findStrayViolet(recoloured);
if (stray.length) {
  console.error(`✗ ${board}: unconverted violet — add these to the map in scripts/port-board.mjs:`);
  for (const colour of stray) console.error(`    ${colour}`);
  process.exit(1);
}

const out = postcss.parse(recoloured);

// Rules the board shares verbatim with --minus's stylesheet. Keyed on the
// selector and the declarations together, so a board that restyles a shared
// class keeps its own version and only true duplicates are dropped.
let shared = null;
let dropped = 0;
if (minusFile) {
  shared = new Set();
  const minusCss = retypeface(recolour(readFileSync(join(root, "design", "arena", minusFile), "utf8")));
  postcss.parse(minusCss).walkRules(rule => shared.add(fingerprint(rule)));
} else if (minusShared) {
  shared = sharedPhoneRules();
  // styles/arena-phone.css declares every phone keyframe once; a second
  // copy here would be dead weight at best and a silent override at worst.
  out.walkAtRules(at => { if (/keyframes/.test(at.name)) at.remove(); });
}

out.walkRules(rule => {
  // Drop before renaming or namespacing, so both sides are compared in the
  // form they were written in.
  if (shared && rule.parent?.type !== "atrule" && shared.has(fingerprint(rule))) {
    rule.remove();
    dropped += 1;
    return;
  }
  // The board's secondary button variant is `.violet`. The colour is now
  // #00BCC8, so the name would be a lie in every call site that used it.
  rule.selector = rule.selector.replace(/\.violet\b/g, ".blue");
  // `.btn` is the app's `.ar-btn` (styles/arena.css). Renaming here rather
  // than leaving `.btn` namespaced keeps one button recipe in the app: a
  // board that tweaks a button lands as `.arena-<board> .ar-btn…` and wins
  // inside that screen, which is what "replace the old styling" asks for.
  rule.selector = rule.selector.replace(/\.btn\b/g, ".ar-btn");
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

const origin = cssMode ? `design/arena/${board}` : `design/arena/boards/${board}.dc.html`;
const header = `/* GENERATED from ${origin} by scripts/port-board.mjs.
   Do not edit by hand - re-run the script instead.

   Three changes from the board, and only three: every selector is
   namespaced under ${ns} so the board's generic class names (.table,
   .face, .panel) cannot collide with the app's; the pack's violet is
   replaced by the owner's #00BCC8 throughout; and .btn is renamed to
   .ar-btn, the app's own name for the same button recipe. Everything else
   is the board's own CSS.${
  cssMode
    ? `

   App-only geometry that the boards get free from their fixed 1440x900
   canvas lives in styles/arena-shell.css, alongside the boards' keyframes.`
    : ""
}${
  minusFile || minusShared
    ? `

   ${dropped} rules this board shares byte for byte with ${minusFile || "the phone set's common layer"}
   were dropped: they are already in ${minusFile ? "styles/arena-app.css" : "styles/arena-phone.css"},
   ported once. A rule the board changed, however slightly, was kept.`
    : ""
} */\n\n`;

const file = join(root, "styles", `arena-${name}.css`);
writeFileSync(file, header + out.toString() + "\n", "utf8");

let rules = 0; out.walkRules(() => rules++);
console.log(
  `✓ ${board} -> styles/arena-${name}.css (${rules} rules, namespaced ${ns}, violet -> #00BCC8` +
  (shared ? `, ${dropped} shared rules already in ${minusFile || "arena-phone.css"}` : "") + ")"
);
