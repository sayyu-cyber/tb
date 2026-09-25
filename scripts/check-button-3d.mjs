// Enforces the hard constraint on styles/buttons.css: the 3D button treatment
// may add depth, never size.
//
// The brief for that file was "make the buttons 3D, do not change the layout".
// Every property below is one that does not participate in layout, so a button
// can gain a bevel, a lip and a press without its box moving or anything
// around it reflowing. If someone later adds a padding or min-height to make a
// button "feel" chunkier, this fails instead of silently shifting every screen
// in the app.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const file = join(root, "styles", "buttons.css");
const css = readFileSync(file, "utf8");

// Properties that cannot move anything: they paint, they don't lay out.
const SAFE = new Set([
  "box-shadow", "text-shadow", "transform", "filter", "transition",
  "transition-property", "transition-duration", "transition-timing-function",
  "opacity", "color", "background", "background-color", "background-image",
  "border-color", "outline", "outline-color", "outline-offset", "cursor",
]);

// Anything that resizes a box, moves it in flow, or re-parents its children.
const BANNED = /^(width|height|min-|max-|padding|margin|border(?!-color)|inset|top|right|bottom|left|position|display|flex|grid|gap|font|line-height|letter-spacing|zoom|contain|translate|scale|rotate)/;

const problems = [];

// Strip comments, then read every declaration outside of a custom property.
const body = css.replace(/\/\*[\s\S]*?\*\//g, "");
for (const [, , rawProperty] of body.matchAll(/(^|[;{])\s*([-a-zA-Z]+)\s*:/g)) {
  const property = rawProperty.toLowerCase();
  if (property.startsWith("--")) continue;
  if (SAFE.has(property)) continue;
  problems.push(`"${property}" is not a paint-only property`);
  if (BANNED.test(property)) problems[problems.length - 1] += " — it changes layout";
}

// Custom properties are fine, but a --btn3d-* one that carries a layout value
// would smuggle the same problem through var().
for (const [, , name, value] of body.matchAll(/(^|[;{])\s*(--btn3d-[-a-zA-Z]*)\s*:\s*([^;}]+)/g)) {
  if (/\d+(px|rem|em|%)\s*(;|$)/.test(value) && !/(shadow|translate)/i.test(value)) {
    problems.push(`${name} looks like a bare length (${value.trim()}) rather than a shadow or transform`);
  }
}

// The opt-out list and the base rule have to agree on the variable names, or a
// playing card would keep the treatment on hover after losing it at rest.
const declared = new Set([...body.matchAll(/--btn3d-([-a-zA-Z]+)\s*:/g)].map(match => match[1]));
const consumed = new Set([...body.matchAll(/var\(--btn3d-([-a-zA-Z]+)/g)].map(match => match[1]));
for (const name of consumed) {
  if (!declared.has(name)) problems.push(`var(--btn3d-${name}) is used but never declared`);
}
// Every variable the base rules consume must also be switched off by the
// opt-out block, or excluded elements keep part of the effect.
const optOut = body.slice(body.indexOf("[data-flat]"), body.indexOf("button {"));
for (const name of consumed) {
  if (!new RegExp(`--btn3d-${name}\\s*:\\s*none`).test(optOut)) {
    problems.push(`--btn3d-${name} is consumed but the opt-out block never sets it to none`);
  }
}

// The generic bevel hovers at `button:hover:not(:disabled)`, which outranks a
// single class. The Arena sheets re-assert their own lips at that specificity,
// but several rules only tie - so buttons.css has to load FIRST for the later
// sheet to win. Reorder the imports and every Arena button silently loses its
// coloured lip on hover.
const layout = readFileSync(join(root, "app", "layout.tsx"), "utf8");
const order = ["buttons.css", "arena.css", "mindi.css", "gin.css"]
  .map(name => ({ name, at: layout.indexOf(`styles/${name}`) }))
  .filter(entry => entry.at !== -1);
for (let i = 1; i < order.length; i++) {
  if (order[i].at < order[0].at) {
    problems.push(`styles/${order[i].name} is imported before styles/buttons.css in app/layout.tsx — the generic bevel will win on hover`);
  }
}

if (problems.length) {
  console.error("✗ styles/buttons.css must only add depth, never size:");
  for (const problem of problems) console.error(`    ${problem}`);
  process.exit(1);
}
console.log(`✓ 3D buttons add depth only (${declared.size} tokens, ${consumed.size} consumed, all opt-out-able).`);
