/**
 * Validates that every Material Symbol name used in src/ actually exists in the
 * font we ship (public/fonts/material-symbols-subset.woff2, catalogued in
 * scripts/material-symbols-manifest.json).
 *
 * Why this exists: a `material-symbols-outlined` element renders its text content
 * as a glyph via the font's `rlig` ligature feature. If the name has no ligature
 * the browser silently renders the raw text, e.g. "local_offer" instead of a tag
 * icon. That failure is invisible in types, in lint, and in the build.
 *
 * Run:  npm run icons:check
 * Fix:  use a name listed in the manifest, or run `npm run icons:build`
 *       (needs Python with fontTools) to regenerate the subset. The font is
 *       served through next/font/local, so Next hashes its URL automatically -
 *       there is no cache-busting query to bump. Finish with
 *       `npm run icons:audit`.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const SRC = join(ROOT, "src");
const MANIFEST = join(ROOT, "scripts", "material-symbols-manifest.json");

/** @type {{ icons: string[] }} */
const manifest = JSON.parse(readFileSync(MANIFEST, "utf-8"));
const available = new Set(manifest.icons);

// Matches the icon name rendered inside a material-symbols element.
const SPAN = /material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*</gi;
// Matches a JSX expression rendered inside one, e.g. {cond ? "a" : "b"}.
// Deliberately restricted to a single line: allowing newlines lets the pattern
// run past the closing tag and pick up unrelated object literals.
const SPAN_EXPR =
  /material-symbols-outlined[^>]*>\s*\{([^{}\n]*(?:\{[^{}\n]*\}[^{}\n]*)*)\}\s*</gi;
const QUOTED = /['"]([a-z][a-z0-9_]*)['"]/g;
// A ternary looks like {x === "status" ? "some_icon" : "other_icon"}. The
// comparison operand and any string-argument method call are not icon names,
// so blank them out before collecting the quoted values.
const COMPARISON = /\s*[!=]==?\s*['"][a-z0-9_]*['"]/g;
const METHOD_ARG =
  /\.(?:includes|startsWith|endsWith|match|replace|split|replaceAll)\(\s*['"][^'"]*['"]\s*\)/g;
// An icon stored on an object that is rendered through an identifier
// expression, e.g. `icon: "dashboard"` in a nav array drawn as {link.icon}.
// Those files never mention the span class themselves, so the span patterns
// above cannot see them - this is how the admin sidebar, the partner bottom
// nav and the partner KYC document list broke.
const ICON_KEY =
  /\b(?:icon|iconName|icon_name)\s*[:=]\s*['"]([a-z][a-z0-9_]*)['"]/g;
// Keys named `icon` that are not Material Symbols. Keep in sync with
// NON_MATERIAL_ICON_KEYS in scripts/build-material-subset.py.
const NON_MATERIAL_ICON_KEYS = new Set([
  "ic_notification", // FCM Android payload field (src/lib/notifications.ts)
]);
// Icon names passed as plain string arguments to a local helper that renders a
// material span, e.g. checkout's TimeSelector:
//   const renderSlotsGroup = (slots, title, icon) => <span ...>{icon}</span>
//   renderSlotsGroup(morningSlots, "Morning Slots", "wb_sunny")
// No span literal, no `icon:` key and no JSX expression sees this - it is the
// one shape that shipped raw "wb_sunny" text on the schedule page.
const HELPER_DEF =
  /(?:function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>)/g;
const HELPER_SPAN =
  /<span\b[^>]*material-symbols-outlined[^>]*>([\s\S]*?)<\/span>/g;
const SNAKE_STRING = /['"]([a-z][a-z0-9_]{2,})['"]/g;

/** Body of a block-bodied helper starting at `start`; null for expression bodies. */
function helperBody(text, start) {
  let i = start;
  while (i < text.length && /\s/.test(text[i])) i++;
  if (text[i] !== "{") return null;
  let depth = 0;
  let quote = null;
  for (let j = i; j < text.length; j++) {
    const ch = text[j];
    if (quote) {
      if (ch === "\\") {
        j++;
        continue;
      }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(i, j + 1);
    }
  }
  return null;
}

/** Argument-list text of every `name(...)` call in the file. */
function callArgTexts(text, name) {
  const out = [];
  const re = new RegExp(
    "(?<![\\w$])" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\s*\\(",
    "g",
  );
  for (const m of text.matchAll(re)) {
    let i = m.index + m[0].length;
    let depth = 1;
    let quote = null;
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (quote) {
        if (ch === quote) quote = null;
      } else if (ch === '"' || ch === "'" || ch === "`") quote = ch;
      else if (ch === "(") depth++;
      else if (ch === ")") depth--;
      i++;
    }
    out.push(text.slice(m.index + m[0].length, i - 1));
  }
  return out;
}

/** String arguments handed to a helper whose body feeds a material span. */
function callArgIcons(text) {
  const found = new Set();
  const helpers = new Set();

  for (const m of text.matchAll(HELPER_DEF)) {
    const name = m[1] ?? m[3];
    const params = m[2] ?? m[4];
    if (!name || !params) continue;
    const body = helperBody(text, m.index + m[0].length);
    if (!body) continue;
    const paramNames = params
      .split(",")
      .map((p) => p.split(":")[0].trim())
      .filter(Boolean);
    for (const sp of body.matchAll(HELPER_SPAN)) {
      const inner = sp[1];
      if (paramNames.some((p) => inner.includes("{" + p + "}"))) {
        helpers.add(name);
        break;
      }
    }
  }

  for (const name of helpers) {
    for (const args of callArgTexts(text, name)) {
      for (const s of args.matchAll(SNAKE_STRING)) found.add(s[1]);
    }
  }
  return found;
}

/** Pull only the icon-valued strings out of a captured JSX expression. */
function iconValuesIn(expr) {
  const stripped = expr.replace(METHOD_ARG, " ").replace(COMPARISON, " ");
  return [...stripped.matchAll(QUOTED)].map((m) => m[1]);
}

const TEXT_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const SKIP_DIRS = new Set(["node_modules", ".next", ".git"]);

/** @type {string[]} */
const files = [];
/** @param {string} dir */
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (TEXT_EXT.has(extname(full))) files.push(full);
  }
}
walk(SRC);

/** @type {Map<string, Set<string>>} */
const offenders = new Map();
let checked = 0;

for (const file of files) {
  // ignore comments so commented-out markup is not flagged, and so this scan
  // agrees with scripts/build-material-subset.py, which strips both kinds too
  const text = readFileSync(file, "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "");
  const rel = relative(ROOT, file).replace(/\\/g, "/");

  /** @param {string} name */
  const check = (name) => {
    if (!name || name.length < 2) return;
    checked += 1;
    if (!available.has(name)) {
      if (!offenders.has(name)) offenders.set(name, new Set());
      offenders.get(name).add(rel);
    }
  };

  // Runs on every file: an icon can live in a config or nav array that never
  // mentions the span class, and be rendered by some other component.
  for (const m of text.matchAll(ICON_KEY)) {
    if (!NON_MATERIAL_ICON_KEYS.has(m[1])) check(m[1]);
  }

  if (!text.includes("material-symbols-outlined")) continue;
  for (const m of text.matchAll(SPAN)) check(m[1]);
  for (const m of text.matchAll(SPAN_EXPR)) {
    for (const name of iconValuesIn(m[1])) check(name);
  }
  for (const name of callArgIcons(text)) check(name);
}

console.log(
  `Checked ${checked} Material Symbol reference(s) against ${available.size} glyph(s) in the shipped font.`,
);

if (offenders.size === 0) {
  console.log("OK - every referenced icon exists in the subset font.");
  process.exit(0);
}

console.error(`\n${offenders.size} icon name(s) are NOT in the subset font:`);
for (const [name, where] of [...offenders].sort()) {
  console.error(`\n  ${name}`);
  for (const f of where) console.error(`      ${f}`);
}
console.error(
  "\nThese render as literal text in the browser. Either use a name that exists,\n" +
    "or run `npm run icons:build` (requires Python + fontTools) to regenerate the\n" +
    "subset, then `npm run icons:audit` to re-check every layer.",
);
process.exit(1);
