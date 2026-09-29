#!/usr/bin/env node
/**
 * Multi-layer icon audit.
 *
 * Nobody should have to click through pages looking for missing icons. Each
 * layer covers a source of truth the others cannot see:
 *
 *   LAYER 1  source        Every Material Symbol name written in src/**.
 *                          Delegates to scripts/check-material-icons.mjs.
 *   LAYER 2  rendered      Every Material Symbol name that survives SSR and
 *                          actually lands in the HTML, read straight out of
 *                          .next/server/app/**.html. Caches the object-literal
 *                          blind spot (about-us/contact-us store icons as
 *                          { text: "...", icon: "clean_hands" } and render
 *                          them through {item.icon}, which source scanning
 *                          cannot link back to a span).
 *   LAYER 3a alias map     Every entry in serviceIcon.tsx must resolve in one
 *                          hop to an SVG that exists on disk.
 *   LAYER 3  database      Every stored subcategories.icon_name, resolved
 *                          through the same map/validFiles chain the component
 *                          uses. Values reaching the cleaning_services
 *                          fallback mean the customer sees a wrong icon.
 *   LAYER 4  font          The subset font itself is wired up correctly: one
 *                          next/font/local declaration, no competing
 *                          @font-face, the file on disk byte-identical to the
 *                          manifest, the built asset byte-identical too, and a
 *                          hashed preload in the HTML (the old hand-maintained
 *                          ?v= query is what let a 177 KB pre-session font
 *                          pin itself under an immutable cache).
 *
 * Scope note: LAYER 2 only reads the routes Next prerendered to HTML, so it
 * covers static pages and nothing rendered purely on the client or behind a
 * dynamic render. That is why LAYER 1 still runs — it sees all of src/**.
 *
 * Exits non-zero on any failure, so it can sit in CI next to `icons:check`.
 *
 * Usage:
 *   npm run icons:audit                   # all layers (this is the normal one)
 *   node scripts/audit-icons.mjs          # layers 2 + 3 + 4, skip the source scan
 *   node scripts/audit-icons.mjs --skip-db  # no Supabase round trip
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const ROOT = process.cwd();
const manifest = JSON.parse(
  fs.readFileSync(path.join(ROOT, "scripts/material-symbols-manifest.json"), "utf8"),
);
const glyphSet = new Set(manifest.icons);

const argSet = new Set(process.argv.slice(2));
const runSource = argSet.has("--source");
const skipDb = argSet.has("--skip-db");

let failures = 0;

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

// ── LAYER 2: names present in rendered (SSR) HTML ──────────────────────────

const SPAN_RE = /<span\b[^>]*\bclass=(["'])[^"']*\bmaterial-symbols-outlined\b[^"']*\1[^>]*>([\s\S]*?)<\/span>/g;

function layerRendered() {
  const htmlFiles = walk(path.join(ROOT, ".next", "server", "app")).filter(
    (f) => f.endsWith(".html"),
  );

  if (htmlFiles.length === 0) {
    console.log("LAYER 2 (rendered) - SKIP  no build output found; run `npm run build` first");
    return;
  }

  /** @type {Map<string, Set<string>>} */
  const rendered = new Map();
  /** @type {Map<string, Set<string>>} */
  const dynamic = new Map();

  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const route = path.relative(ROOT, file).replace(/\\/g, "/");
    let match;

    while ((match = SPAN_RE.exec(html)) !== null) {
      // Decode the few entities that can appear in a ligature name and strip
      // any whitespace React may have introduced between text nodes.
      const raw = match[2]
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/\s+/g, "")
        .trim();

      if (!raw) continue;

      // A span whose content still contains braces was never interpolated:
      // that is a literal placeholder reaching the browser.
      const isDynamic = /[{}]/.test(raw);
      const bucket = isDynamic ? dynamic : rendered;

      if (!bucket.has(raw)) bucket.set(raw, new Set());
      bucket.get(raw).add(route);
    }
  }

  const missing = [...rendered.entries()].filter(([name]) => !glyphSet.has(name));
  const placeholder = [...dynamic.entries()];

  console.log(`LAYER 2 (rendered HTML) - ${htmlFiles.length} file(s)`);
  console.log(`  distinct Material names rendered : ${rendered.size}`);
  console.log(`  names NOT in shipped font       : ${missing.length}`);

  for (const [name, routes] of missing) {
    failures++;
    console.log(`    x "${name}"  <- ${[...routes].join(", ")}`);
  }

  for (const [name, routes] of placeholder) {
    failures++;
    console.log(`    x unresolved expression "${name}"  <- ${[...routes].join(", ")}`);
  }

  if (missing.length === 0 && placeholder.length === 0) {
    console.log("    OK - every rendered Material Symbol resolves to a real glyph");
  }
}

// ── LAYER 3a: local alias integrity in serviceIcon.tsx ─────────────────────

/**
 * Parse normalizeIconName() out of serviceIcon.tsx so the local alias audit
 * and the database audit apply exactly the same rules as the component does.
 */
function parseServiceIcon() {
  const file = path.join(ROOT, "src", "utils", "serviceIcon.tsx");
  if (!fs.existsSync(file)) return null;

  const source = fs.readFileSync(file, "utf8");
  const mapBlock = source.match(/const map: Record<string, string> = \{([\s\S]*?)\n  \};/);
  const validBlock = source.match(/validFiles = new Set\(\[([\s\S]*?)\]\)/);

  const aliasMap = new Map();
  for (const m of (mapBlock?.[1] ?? "").matchAll(
    /(["']?)([a-z][a-z0-9_]*)\1\s*:\s*["']([^"']+)["']/g,
  )) {
    aliasMap.set(m[2], m[3]);
  }

  const validFiles = new Set(
    [...(validBlock?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]),
  );

  const onDisk = new Set(
    walk(path.join(ROOT, "public", "icons"))
      .filter((f) => f.endsWith(".svg"))
      .map((f) => path.basename(f, ".svg")),
  );

  return { aliasMap, validFiles, onDisk };
}

function layerAliases() {
  const parsed = parseServiceIcon();
  if (!parsed) {
    console.log("LAYER 3a (alias map) - SKIP  serviceIcon.tsx not found");
    return;
  }
  const { aliasMap, validFiles, onDisk } = parsed;

  // normalizeIconName applies the map exactly once, so an alias whose target
  // maps to something else again silently misses. Identity entries
  // (water_drop: "water_drop") are fine and must not be reported.
  const broken = [];
  for (const [key, target] of aliasMap) {
    const secondHop = aliasMap.get(target);
    if (secondHop !== undefined && secondHop !== target) {
      broken.push(
        `${key}: "${target}" -> the map is applied once, but "${target}" maps to "${secondHop}"`,
      );
    } else if (!validFiles.has(target)) {
      broken.push(`${key}: "${target}" -> not in validFiles`);
    } else if (!onDisk.has(target)) {
      broken.push(`${key}: "${target}" -> no public/icons/${target}.svg`);
    }
  }

  const orphanFiles = [...onDisk].filter((f) => !validFiles.has(f));
  const missingFiles = [...validFiles].filter((f) => !onDisk.has(f));

  console.log(`LAYER 3a (alias map)   - ${aliasMap.size} aliases, ${validFiles.size} validFiles, ${onDisk.size} SVGs on disk`);
  console.log(`  broken aliases                 : ${broken.length}`);
  console.log(`  validFiles without a file      : ${missingFiles.length}`);
  console.log(`  files not listed in validFiles : ${orphanFiles.length}`);

  for (const line of broken) {
    failures++;
    console.log(`    x ${line}`);
  }
  for (const f of missingFiles) {
    failures++;
    console.log(`    x validFiles lists "${f}" but public/icons/${f}.svg does not exist`);
  }
  // An unreferenced file is harmless (it just sits on disk), so report it
  // without failing the audit.
  for (const f of orphanFiles) {
    console.log(`    ~ public/icons/${f}.svg is unused by validFiles`);
  }

  if (broken.length === 0 && missingFiles.length === 0) {
    console.log("    OK - every alias resolves to an SVG that exists");
  }
}

// ── LAYER 4: the subset font is the one that actually gets delivered ───────

/**
 * Guards the delivery path, not the glyph list. Every failure here is a way
 * for a correctly built subset to still reach the browser as raw ligature
 * text: a second @font-face, a raw /fonts/ URL pinned by an immutable cache,
 * a public copy that drifted from the manifest, or a build that never picked
 * the file up.
 *
 * Comments are stripped first so prose mentioning `@font-face` does not fail
 * the check it is documenting.
 */
function layerFont() {
  const problems = [];
  const stripComments = (text) =>
    text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  const layoutPath = path.join(ROOT, "src", "app", "layout.tsx");
  const cssPath = path.join(ROOT, "src", "app", "globals.css");
  const publicPath = path.join(ROOT, "public", "fonts", "material-symbols-subset.woff2");
  const declaredBytes = manifest.outputBytes;

  const layout = fs.existsSync(layoutPath)
    ? stripComments(fs.readFileSync(layoutPath, "utf8"))
    : "";
  if (!/localFont\(\s*\{[\s\S]*?material-symbols-subset\.woff2/.test(layout)) {
    problems.push(
      "src/app/layout.tsx must declare localFont() for material-symbols-subset.woff2",
    );
  }

  const css = fs.existsSync(cssPath) ? stripComments(fs.readFileSync(cssPath, "utf8")) : "";
  if (/@font-face/.test(css)) {
    problems.push(
      "src/app/globals.css declares its own @font-face - next/font/local in layout.tsx owns it",
    );
  }
  if (/url\(\s*['"]?\/fonts\/material-symbols-subset/.test(css)) {
    problems.push(
      "src/app/globals.css loads /fonts/material-symbols-subset.woff2 - that URL is never hashed",
    );
  }
  if (!/font-family:\s*var\(--font-material-symbols\)/.test(css)) {
    problems.push(
      ".material-symbols-outlined must use font-family: var(--font-material-symbols)",
    );
  }

  if (!fs.existsSync(publicPath)) {
    problems.push("public/fonts/material-symbols-subset.woff2 is missing - run `npm run icons:build`");
  } else if (fs.statSync(publicPath).size !== declaredBytes) {
    problems.push(
      `public/fonts/material-symbols-subset.woff2 is ${fs.statSync(publicPath).size} bytes but the manifest says ${declaredBytes} - run \`npm run icons:build\``,
    );
  }

  const nextDir = path.join(ROOT, ".next");
  let builtFont = null;
  // `.next` also exists while only `next dev` has run, and that directory has
  // no prerendered HTML to preload from. BUILD_ID only appears after a
  // production build, which is the state these checks describe.
  const buildChecked = fs.existsSync(path.join(nextDir, "BUILD_ID"));

  if (buildChecked) {
    const woff2 = walk(path.join(nextDir, "static", "media")).filter((f) =>
      f.endsWith(".woff2"),
    );
    const matching = woff2.filter((f) => fs.statSync(f).size === declaredBytes);
    const named = matching.filter((f) =>
      /material-symbols-subset/i.test(path.basename(f)),
    );
    builtFont = (named[0] ?? matching[0]) ?? null;

    if (!builtFont) {
      problems.push(
        "no .next/static/media/*.woff2 matches the manifest byte count - run `npm run build`",
      );
    }

    const outputs = [
      ...walk(path.join(nextDir, "server", "app")).filter((f) => /\.(html|css)$/.test(f)),
      ...walk(path.join(nextDir, "static")).filter((f) => /\.(css|js)$/.test(f)),
    ];
    const base = builtFont ? path.basename(builtFont) : null;
    let referencing = 0;
    let hashedPreload = 0;
    let manualPreload = 0;

    for (const file of outputs) {
      const text = fs.readFileSync(file, "utf8");
      if (base && text.includes(base)) referencing++;
      for (const tag of text.match(/<link\b[^>]*>/g) ?? []) {
        const href = /href=(["'])([^"']+)\1/.exec(tag)?.[2] ?? "";
        if (!/\.woff2(\?|$)/.test(href)) continue;
        if (!/\brel=(["'])preload\1/.test(tag) || !/\bas=(["'])font\1/.test(tag)) continue;
        if (/^\/fonts\//.test(href)) manualPreload++;
        else if (base && href.includes(base)) hashedPreload++;
      }
    }

    if (manualPreload > 0) {
      problems.push(
        `${manualPreload} preload link(s) still point at the raw /fonts/ URL - remove the hand-written <link rel="preload">`,
      );
    }
    if (base && referencing === 0) {
      problems.push(`the build output never references ${base} - the font would never load`);
    }
    if (base && hashedPreload === 0) {
      problems.push(
        `no <link rel="preload"> for ${base} - next/font local preload is not reaching the HTML`,
      );
    }

    console.log(`LAYER 4 (font delivery)  - built asset: ${base ?? "MISSING"}`);
    console.log(`  files referencing the built font : ${referencing}`);
    console.log(`  hashed preload links in HTML     : ${hashedPreload}`);
    if (manualPreload === 0 && base && referencing > 0 && hashedPreload > 0) {
      console.log("    OK - next/font serves a hashed asset with no legacy /fonts/ URL");
    }
  } else {
    console.log("LAYER 4 (font delivery)  - SKIP  no production build in .next; run `npm run build` first");
  }

  console.log(`  layout.tsx localFont declaration : ${/localFont\(/.test(layout) ? "yes" : "MISSING"}`);
  console.log(`  globals.css @font-face           : ${/@font-face/.test(css) ? "FOUND (bad)" : "none"}`);

  for (const line of problems) {
    failures++;
    console.log(`    x ${line}`);
  }

  if (problems.length === 0) {
    console.log(
      buildChecked
        ? "    OK - source wiring matches the manifest and the build"
        : "    OK - source wiring matches the manifest (build checks skipped)",
    );
  }
}

// ── LAYER 3: database icon_name values -> local SVG files ──────────────────

function layerDatabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.log("LAYER 3 (database) - SKIP  .env.local not loaded / keys missing");
    return;
  }

  // Reproduce normalizeIconName() from src/utils/serviceIcon.tsx exactly:
  // lowercase + trim -> alias map -> validFiles membership, else the
  // cleaning_services fallback. Anything that reaches the fallback is an
  // icon the customer does not see as intended.
  const parsed = parseServiceIcon();
  if (!parsed) {
    console.log("LAYER 3 (database) - SKIP  serviceIcon.tsx not found");
    return;
  }
  const { aliasMap, validFiles, onDisk } = parsed;

  function resolve(raw) {
    const clean = String(raw).trim().toLowerCase();
    if (!clean) return null;
    return { clean, resolved: aliasMap.get(clean) ?? clean };
  }

  // Only subcategories carries an icon_name column; categories.category_name
  // has no icon counterpart (see AGENTS.md §11). Querying a column that does
  // not exist makes PostgREST answer 400, so it is deliberately not listed.
  const checks = [["subcategories", "id, subcategory_name, icon_name"]];

  return Promise.all(
    checks.map(([table, columns]) =>
      fetch(`${url}/rest/v1/${table}?select=${columns}&icon_name=not.is.null`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` },
      }      ).then(
        (res) => {
          if (!res.ok) {
            console.log(`LAYER 3 (database) - SKIP  ${table} returned HTTP ${res.status}`);
            return [];
          }
          return res.json();
        },
        (err) => {
          console.log(`LAYER 3 (database) - SKIP  ${table}: ${err.message}`);
          return [];
        },
      ),
    ),
  ).then((batches) => {
    const stored = [];
    checks.forEach(([table], i) => {
      for (const row of batches[i] ?? []) {
        stored.push({
          table,
          raw: row.icon_name,
          label: row.subcategory_name ?? row.id,
        });
      }
    });

    const broken = [];
    for (const { table, raw, label } of stored) {
      const out = resolve(raw);
      if (!out) {
        broken.push({ table, raw, label, note: "empty icon_name" });
        continue;
      }
      if (validFiles.has(out.resolved)) continue;

      // The distinction tells the reader whether to add a file or add a name.
      const note = onDisk.has(out.resolved)
        ? `resolves to "${out.resolved}" - SVG exists but validFiles omits it`
        : `resolves to "${out.resolved}" - no SVG in public/icons`;
      broken.push({ table, raw, label, note });
    }

    const resolvedOk = stored.length - broken.length;

    console.log(`LAYER 3 (database icons) - ${stored.length} stored icon_name value(s)`);
    console.log(`  resolved to a real SVG         : ${resolvedOk}`);
    console.log(`  falling back to default icon   : ${broken.length}`);

    for (const { table, raw, label, note } of broken) {
      failures++;
      console.log(`    x ${table}: ${JSON.stringify(String(raw))}  [${label}] -> ${note}`);
    }

    if (broken.length === 0) {
      console.log("    OK - every stored icon_name resolves to a real SVG");
    }
  });
}

// ── LAYER 1 (optional): re-run the source scanner in-process ───────────────

function layerSource() {
  const script = path.join(ROOT, "scripts", "check-material-icons.mjs");
  if (!fs.existsSync(script)) {
    failures++;
    console.log("LAYER 1 (source)   - FAIL  scripts/check-material-icons.mjs not found");
    return;
  }
  console.log("LAYER 1 (source)   - scanning src/** for Material Symbol names");
  const result = spawnSync(process.execPath, [script], { stdio: "inherit" });
  if (result.status !== 0) {
    failures++;
    console.log("    x source scan reported names missing from the shipped subset");
  }
}

// ── run ────────────────────────────────────────────────────────────────────

if (runSource) layerSource();
layerRendered();
layerAliases();
layerFont();

if (skipDb) {
  console.log("LAYER 3 (database icons) - SKIP  --skip-db");
} else {
  // Load .env.local manually so this works outside of the Next runtime.
  const envPath = path.join(ROOT, ".env.local");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
      if (m && process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
  await layerDatabase();
}

console.log("");
if (failures > 0) {
  console.log(`FAILED - ${failures} icon(s) could not be resolved`);
} else {
  console.log("OK - all audited icon references resolve");
}

// Let undici's keep-alive pool finish closing. Exiting while a socket is still
// draining makes Node assert on Windows (`UV_HANDLE_CLOSING`), which replaces
// the real exit code with -1073740791.
await new Promise((resolve) => setTimeout(resolve, 100));
process.exit(failures > 0 ? 1 : 0);
