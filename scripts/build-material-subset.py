"""Regenerate public/fonts/material-symbols-subset.woff2 + the icon manifest.

Scans src/ for every Material Symbol name that can reach a
`material-symbols-outlined` element, keeps only those glyphs (plus a safety
margin), and preserves all four variable axes (FILL / GRAD / opsz / wght).

Usage (needs fontTools + brotli):   pip install fonttools brotli
                                    npm run icons:build
Then run:                           npm run icons:audit

The font is loaded through next/font/local in src/app/layout.tsx, so Next
content-hashes its URL on every build - there is no cache-busting query to bump.
"""
import json
import os
import re
import sys

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "src")
FONT_SRC = os.path.join(ROOT, "public", "fonts", "material-symbols-outlined.woff2")
FONT_OUT = os.path.join(ROOT, "public", "fonts", "material-symbols-subset.woff2")
MANIFEST = os.path.join(ROOT, "scripts", "material-symbols-manifest.json")

# Replacements for names that are NOT in the upstream font build. Keep in sync
# with the mapping documented in AGENTS.md.
SAFETY_MARGIN = [
    "add", "add_circle", "apartment", "arrow_back", "arrow_downward",
    "arrow_forward", "arrow_upward", "calendar_month", "check", "check_circle",
    "chevron_left", "chevron_right", "close", "credit_card", "delete",
    "download", "edit", "error", "expand_less", "expand_more", "favorite",
    "filter_list", "help", "home", "hourglass_empty", "info", "link", "lock",
    "logout", "mail", "map", "menu", "more_vert", "notifications", "open_in_new",
    "pending", "person", "place", "play_arrow", "receipt_long", "redeem", "refresh",
    "remove", "replay", "save", "schedule", "search", "security", "sell",
    "settings", "share", "shield_person", "shopping_bag", "shopping_cart", "sort",
    "star", "storage", "support_agent", "tune", "undo", "update", "upload",
    "verified_user", "wallet", "warning", "wifi", "work", "call",
    # Found by scripts/audit-icons.mjs LAYER 2 (rendered HTML) because they
    # live in multi-key object literals on about-us / contact-us.
    "bedroom_parent", "clean_hands", "corporate_fare", "countertops",
    "diversity_3", "layers", "manage_accounts", "package_2", "person_celebrate",
    "bathtub", "chair", "phone_android",
]

LITERAL = re.compile(
    r"material-symbols-outlined[^>]*>\s*([a-z0-9_]+)\s*<", re.I | re.S
)
# A JSX expression rendered inside a material span, e.g. {x ? "a" : "b"}.
# Restricted to one line: allowing newlines lets the pattern run past the
# closing tag and pick up unrelated object literals.
DYNAMIC = re.compile(
    r"material-symbols-outlined[^>]*>\s*\{([^{}\n]*(?:\{[^{}\n]*\}[^{}\n]*)*)\}\s*<",
    re.I,
)
QUOTED = re.compile(r"['\"]([a-z][a-z0-9_]*)['\"]")
# A whole line that is nothing but an icon-map entry:   pending: "hourglass_top",
MAP_LINE = re.compile(
    r"""^\s*(?:[A-Za-z_$][\w$]*|"[a-z_]+"|'[^']+')\s*:\s*['"]([a-z][a-z0-9_]*)['"]\s*,?\s*$"""
)
# Icon key anywhere in a file:   { text: "...", icon: "clean_hands" },
# MAP_LINE misses multi-key object literals, which is how about-us and
# contact-us store their icons while rendering them through {item.icon}.
# Unlike the validator this is deliberately permissive: membership in the
# upstream font filters the noise, and an extra glyph costs ~900 bytes while a
# missing one renders as raw text in front of a user.
ICON_KEY = re.compile(
    r"""\b(?:icon|iconName|icon_name)\s*[:=]\s*['"]([a-z][a-z0-9_]*)['"]"""
)
# Keys named `icon` that are not Material Symbols. Keep in sync with
# NON_MATERIAL_ICON_KEYS in scripts/check-material-icons.mjs.
NON_MATERIAL_ICON_KEYS = {
    "ic_notification",  # FCM Android payload field (src/lib/notifications.ts)
}
# Same two strippers the validator uses, so both tools agree on what a JSX
# expression actually contains: `{status === "cancelled" ? "close" : "check"}`
# renders close/check, while "cancelled" is a comparison operand.
COMPARISON = re.compile(r"""\s*[!=]==?\s*['"][a-z0-9_]*['"]""")
METHOD_ARG = re.compile(
    r"""\.(?:includes|startsWith|endsWith|match|replace|split|replaceAll)\("""
    r"""\s*['"][^'"]*['"]\s*\)"""
)
# Icon names handed to a local helper that renders a material span, e.g.
#   const renderSlotsGroup = (slots, title, icon) => <span ...>{icon}</span>
#   renderSlotsGroup(morningSlots, "Morning Slots", "wb_sunny")
# No span literal, no ``icon:`` key and no JSX expression sees this - it is the
# shape that shipped raw "wb_sunny" text on the checkout schedule page.
HELPER_DEF = re.compile(
    r"(?:function\s+([A-Za-z_$][\w$]*)\s*\(([^)]*)\)"
    r"|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>)"
)
HELPER_SPAN = re.compile(
    r"<span\b[^>]*material-symbols-outlined[^>]*>([\s\S]*?)</span>"
)
SNAKE_STRING = re.compile(r"""['"]([a-z][a-z0-9_]{2,})['"]""")


def helper_body(text, start):
    """Body of a block-bodied helper; None for expression-bodied ones."""
    i = start
    while i < len(text) and text[i] in " \t\r\n":
        i += 1
    if i >= len(text) or text[i] != "{":
        return None
    depth = 0
    quote = None
    j = i
    while j < len(text):
        ch = text[j]
        if quote:
            if ch == "\\":
                j += 2
                continue
            if ch == quote:
                quote = None
        elif ch in "\"'`":
            quote = ch
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[i: j + 1]
        j += 1
    return None


def call_arg_texts(text, name):
    """Argument-list text of every ``name(...)`` call in the file."""
    out = []
    pattern = re.compile(r"(?<![\w$])" + re.escape(name) + r"\s*\(")
    for m in pattern.finditer(text):
        i = m.end()
        depth = 1
        quote = None
        while i < len(text) and depth:
            ch = text[i]
            if quote:
                if ch == quote:
                    quote = None
            elif ch in "\"'`":
                quote = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            i += 1
        out.append(text[m.end(): i - 1])
    return out


def call_arg_icons(text):
    """String arguments passed to a helper whose body feeds a material span."""
    found = set()
    helpers = set()
    for m in HELPER_DEF.finditer(text):
        name = m.group(1) or m.group(3)
        params = m.group(2) if m.group(1) else m.group(4)
        if not name or not params:
            continue
        body = helper_body(text, m.end())
        if not body:
            continue
        param_names = [
            p.strip().split(":")[0].strip()
            for p in params.split(",")
            if p.strip()
        ]
        for sp in HELPER_SPAN.finditer(body):
            inner = sp.group(1)
            if any(
                re.search(r"\{" + re.escape(p) + r"\}", inner)
                for p in param_names
            ):
                helpers.add(name)
                break
    for name in helpers:
        for args in call_arg_texts(text, name):
            found.update(SNAKE_STRING.findall(args))
    return found


def scan_source():
    """Candidate icon names in files that render material-symbols spans.

    Returns two sets:
      ``confident`` - literal span text, same-line JSX expressions,
        ``icon: "..."`` object properties and string arguments passed to a
        local helper that renders a material span. Every one of these is meant
        to be typed into a material span, so a name the upstream font does not
        have is a hard error.
      ``map_only``  - whole-line icon-map entries (``pending: "hourglass_top"``).
        These also match status/form keys such as ``status: "active"``, so they
        stay advisory.

    Membership in the upstream font is the further filter for both, so local
    SVG file names and hyphenated identifiers drop out on their own.
    """
    confident = set()
    map_only = set()
    for base, dirs, files in os.walk(SRC):
        dirs[:] = [d for d in dirs if d not in ("node_modules", ".next")]
        for fn in files:
            if not fn.endswith((".tsx", ".ts")):
                continue
            path = os.path.join(base, fn)
            with open(path, encoding="utf-8", errors="ignore") as fh:
                text = fh.read()
            # strip comments so commented-out markup is ignored
            text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
            text = re.sub(r"//[^\n]*", "", text)

            # Icon keys are scanned in every file: a nav array or config object
            # stores its icons in a file that never mentions the span class and
            # is rendered through {link.icon} elsewhere. This is how
            # sports_motorsports / home_pin escaped the subset.
            confident.update(
                n for n in ICON_KEY.findall(text)
                if n not in NON_MATERIAL_ICON_KEYS
            )

            if "material-symbols-outlined" not in text:
                continue
            confident.update(call_arg_icons(text))
            for m in LITERAL.finditer(text):
                confident.add(m.group(1))
            for m in DYNAMIC.finditer(text):
                expr = COMPARISON.sub(" ", METHOD_ARG.sub(" ", m.group(1)))
                confident.update(QUOTED.findall(expr))
            for line in text.splitlines():
                m = MAP_LINE.match(line)
                if m and m.group(1) not in confident:
                    map_only.add(m.group(1))
    return confident, map_only


def font_icon_index(path):
    """Resolve what the browser types into a span to the glyph the font draws.

    Material Symbols are reached through GSUB ligatures, and the output glyph
    is not always named after its input text: typing ``phone_android`` draws
    the glyph called ``mobile_2``. Indexing ``LigGlyph`` names therefore
    reports renderable icons as missing and drops them from the subset, so
    this indexes the ligature's component sequence instead.

    Returns three helpers: ``exists(name)``, ``outputs(name)`` (glyphs the
    subset must retain so the icon actually draws) and ``letters(name)``
    (the component glyphs the ligature is built from).
    """
    font = TTFont(path)
    cmap = font.getBestCmap()
    glyph_order = set(font.getGlyphOrder())
    gsub = font["GSUB"].table if "GSUB" in font else None

    rules = {}
    output_names = set()
    if gsub is not None:
        for lookup in gsub.LookupList.Lookup:
            for sub in lookup.SubTable:
                inner = getattr(sub, "ExtSubTable", sub)
                for _first, ligs in (getattr(inner, "ligatures", None) or {}).items():
                    for lig in ligs:
                        if lig.LigGlyph:
                            rules.setdefault(
                                (_first, tuple(lig.Component)), lig.LigGlyph
                            )
                            output_names.add(lig.LigGlyph)

    def key(name):
        try:
            glyphs = [cmap[ord(ch)] for ch in name]
        except KeyError:
            return None
        if len(glyphs) < 2:
            return None
        return (glyphs[0], tuple(glyphs[1:]))

    def exists(name):
        k = key(name)
        if k is not None and k in rules:
            return True
        # Either a plain glyph name or an alias that ligates.
        return name in output_names or name in glyph_order

    def outputs(name):
        k = key(name)
        if k is not None and k in rules:
            return {rules[k]}
        if name in glyph_order:
            return {name}
        return set()

    def letters(name):
        chosen = {cmap[ord(ch)] for ch in name if ord(ch) in cmap}
        return chosen & glyph_order

    return exists, outputs, letters


def main():
    exists, output_glyphs, letter_glyphs = font_icon_index(FONT_SRC)
    confident, map_only = scan_source()

    # A name written straight into a span (or stored as `icon: "..."`) that the
    # upstream font cannot draw is a guaranteed raw-text icon in the browser, so
    # it stops the build before anything is written. Map-line entries stay
    # advisory because that pattern also matches status and form keys.
    fatal = sorted(n for n in confident if not exists(n))
    if fatal:
        print("ERROR - referenced in src/ but MISSING from the upstream font:")
        print("  " + " ".join(fatal))
        print("  These render as literal text in front of a user. Replace them")
        print("  with a name that exists, then re-run `npm run icons:build`.")
        sys.exit(1)

    candidates = confident | map_only
    used = candidates | set(SAFETY_MARGIN)
    keep = sorted(n for n in used if exists(n))
    unknown = sorted(n for n in map_only if not exists(n))

    # Every glyph the subset has to retain: the drawing glyph for each kept
    # icon plus the letters its ligature is assembled from. With
    # layout_closure off, nothing outside this set survives subsetting.
    wanted = set()
    for name in keep:
        wanted |= output_glyphs(name) | letter_glyphs(name)
    wanted &= set(TTFont(FONT_SRC).getGlyphOrder())

    opts = subset.Options()
    opts.layout_features = ["rlig", "rclt"]
    opts.name_IDs = ["*"]
    opts.name_legacy = True
    opts.name_languages = ["*"]
    opts.notdef_outline = True
    opts.drop_tables = ["DSIG"]
    opts.recalc_bounds = True
    opts.glyph_names = True
    # fontTools >= 4.6 defaults this to True, which re-closes every ligature whose
    # component letters (a-z, 0-9) are retained and defeats the subset entirely.
    opts.layout_closure = False

    result = subset.load_font(FONT_SRC, opts)
    subsetter = subset.Subsetter(options=opts)
    subsetter.populate(glyphs=sorted(wanted))
    subsetter.subset(result)
    result.flavor = "woff2"
    result.save(FONT_OUT)

    before = os.path.getsize(FONT_SRC)
    after = os.path.getsize(FONT_OUT)

    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    with open(MANIFEST, "w", encoding="utf-8") as fh:
        json.dump(
            {
                "source": os.path.relpath(FONT_SRC, ROOT).replace("\\", "/"),
                "output": os.path.relpath(FONT_OUT, ROOT).replace("\\", "/"),
                "sourceBytes": before,
                "outputBytes": after,
                "icons": keep,
            },
            fh,
            indent=2,
        )
        fh.write("\n")

    print("icons kept: %d" % len(keep))
    print(
        "size: %d -> %d bytes (%.1f%% smaller)"
        % (before, after, (1 - after / before) * 100)
    )
    if unknown:
        print("\nWARNING - map entries that are not Material Symbols (ignored):")
        print("  " + " ".join(unknown))
        print("  These come from status/form maps picked up by MAP_LINE, not from")
        print("  real icon usage. If one is an icon, give it a name that exists.")


if __name__ == "__main__":
    main()
