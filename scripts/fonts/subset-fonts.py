#!/usr/bin/env python3
"""Cut the site's web fonts down to what the site uses. Run by hand; never part of the build.

    bun run build                                   # the scan reads dist/client
    python3 -m venv .venv-fonts && .venv-fonts/bin/pip install -r scripts/fonts/requirements.txt
    .venv-fonts/bin/python scripts/fonts/subset-fonts.py           # writes src/assets/fonts/
    .venv-fonts/bin/python scripts/fonts/subset-fonts.py --check   # only reports, writes nothing

Commit what it writes (src/assets/fonts/*.woff2 and manifest.json). astro.config.mjs
reads manifest.json and serves the files with Astro's local font provider.

Rerun it when:
  - content starts using a character the fonts do not have yet. `--check` lists every
    character in dist/client that a web font would draw but no subset contains;
  - a page starts using an OpenType feature not kept in FEATURES below (e.g.
    `font-variant-numeric: oldstyle-nums`), or a weight outside an axis range in FONTS
    (the @font-face weights themselves live in src/assets/fonts/subsets.mjs);
  - you move to a newer upstream font (bump GOOGLE_FONTS_COMMIT and the hashes).

Each font becomes two files. The *core* file holds ASCII plus the punctuation most pages
use and is preloaded. The *extended* file holds everything else we keep (Latin-1,
Latin Extended-A and any other character the site uses) behind `unicode-range`, so a
browser only downloads it on a page that contains one of its characters. Both files
are faces of the same CSS family, so the generated fallback face sits after both of them
in the font stack and never draws a character the extended file has.

What is kept is chosen to render exactly like the Google Fonts files the site used to
load, which were cut from the same upstream versions pinned here:
  - a font only claims characters it drew before (Google's subset) plus the rest of
    Latin-1 and Latin Extended-A, which no page uses yet;
  - only OpenType features that were in Google's file AND are on by default in browsers
    or turned on by the site's CSS;
  - axis ranges start at the lowest weight the site's @font-face rules use; Inter's
    optical size axis stays pinned at 14 like Google's file, because with
    `font-optical-sizing: auto` a live opsz axis would change large headings;
  - no hinting, like Google's files (the `gasp` table stays as it was).
"""
import argparse
import hashlib
import html
import json
import os
import re
import sys
import urllib.request
from html.parser import HTMLParser
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[2]
CACHE = Path(__file__).resolve().parent / '.cache'
OUT = ROOT / 'src' / 'assets' / 'fonts'
DIST = ROOT / 'dist' / 'client'

GOOGLE_FONTS_COMMIT = '6c1dbe27dcf7d817d4b62cec033ba77fa8e2a5ec'
SOURCES = {
    'Inter[opsz,wght].ttf': ('ofl/inter/Inter%5Bopsz,wght%5D.ttf', '29160a80ff49ddcab2c97711247e08b1fab27a484a329ce8b813d820dc559031'),
    'Oswald[wght].ttf': ('ofl/oswald/Oswald%5Bwght%5D.ttf', '5b38c246e255a12f5712d640d56bcced0472466fc68983d2d0410ec0457c2817'),
    'Montserrat-Italic[wght].ttf': ('ofl/montserrat/Montserrat-Italic%5Bwght%5D.ttf', '51607f316bc020e59f03cbf51543eecffbea501c0b31d73e5b82927c5cca442c'),
    'IBMPlexSansArabic-Regular.ttf': ('ofl/ibmplexsansarabic/IBMPlexSansArabic-Regular.ttf', '6f611412270a132bbac838da9259d4c68569b4175f3b3b8fa3fa36a30b56dab9'),
    'IBMPlexSansArabic-Medium.ttf': ('ofl/ibmplexsansarabic/IBMPlexSansArabic-Medium.ttf', 'b8363ab9f733dfa4f8e96b8b2102c24b5cf4110fb96d1d3d9a9412f6fb49cf74'),
    'IBMPlexSansArabic-SemiBold.ttf': ('ofl/ibmplexsansarabic/IBMPlexSansArabic-SemiBold.ttf', '597bd5502e5997be4414e4c9c88834b30ff3784250c84f20bce2b20e53ebd467'),
    'IBMPlexSansArabic-Bold.ttf': ('ofl/ibmplexsansarabic/IBMPlexSansArabic-Bold.ttf', '691e0c891a38637ae6bbdb69700f8042cb0724a137bee615068ffdb92244f61f'),
}


def ranges(*spans):
    out = set()
    for s in spans:
        if isinstance(s, tuple):
            out.update(range(s[0], s[1] + 1))
        else:
            out.add(s)
    return out


# What the Google Fonts files the site loaded before could draw: Google's "latin" glyph set
# (U+2011, for one, is in Inter but was never served, so it still falls back) and the
# unicode-range of its "arabic" subset (that file holds every Plex glyph in the range).
GOOGLE_LATIN = ranges((0x0020, 0x007E), (0x00A0, 0x00AC), (0x00AE, 0x00FF), 0x0131, (0x0152, 0x0153),
                      (0x02BB, 0x02BC), 0x02C6, 0x02DA, 0x02DC, 0x0304, 0x0308, 0x0329, 0x2002, 0x2009, 0x200B,
                      (0x2013, 0x2014), (0x2018, 0x201A), (0x201C, 0x201E), 0x2022, 0x2026, (0x2032, 0x2033),
                      (0x2039, 0x203A), 0x2044, 0x20AC, 0x2122, 0x2191, 0x2193, 0x2212, 0x2215, 0xFEFF)
GOOGLE_ARABIC = ranges((0x0600, 0x06FF), (0x0750, 0x077F), (0x0870, 0x088E), (0x0890, 0x0891), (0x0897, 0x08E1),
                       (0x08E3, 0x08FF), (0x200C, 0x200E), (0x2010, 0x2011), 0x204F, 0x2E41, (0xFB50, 0xFDFF),
                       (0xFE70, 0xFE74), (0xFE76, 0xFEFC), (0x102E0, 0x102FB), (0x10E60, 0x10E7E),
                       (0x10EC2, 0x10EC4), (0x10EFC, 0x10EFF), (0x1EE00, 0x1EEF1))
LATIN_1 = ranges((0x00A0, 0x00FF))
LATIN_EXT_A = ranges((0x0100, 0x017F))
ARABIC_BLOCK = ranges((0x0600, 0x06FF))

ASCII = ranges((0x0020, 0x007E))
# Curly quotes, dashes and the ellipsis: the punctuation most pages use.
PUNCTUATION = ranges(0x2018, 0x2019, 0x201C, 0x201D, 0x2013, 0x2014, 0x2026)
# Arabic letters, harakat, tatweel, Arabic-Indic digits and separators, Arabic comma,
# semicolon and question mark, plus the joiners. Every Arabic page uses nearly all of
# these, and marks or lam-alef pairs split across two files would not combine.
ARABIC_CORE = ranges(0x060C, 0x061B, 0x061F, (0x0621, 0x063A), (0x0640, 0x0652), (0x0660, 0x066C),
                     (0x200C, 0x200F))

# Features browsers turn on by default for these scripts (plus the ones the site's CSS
# turns on: `font-variant-numeric: tabular-nums` -> tnum), intersected with what each
# Google file had. Google's Plex file had no `liga`, so it must stay off here.
DEFAULT_ON = {'ccmp', 'locl', 'rlig', 'rclt', 'calt', 'clig', 'liga', 'kern', 'mark', 'mkmk', 'curs', 'rvrn',
              'abvm', 'blwm', 'dist', 'isol', 'init', 'medi', 'fina', 'fin2', 'fin3', 'med2', 'mset'}
FEATURES = {
    # Google's Inter: calt ccmp dnom frac locl numr pnum tnum + kern mark mkmk
    'inter': {'calt', 'ccmp', 'locl', 'tnum', 'kern', 'mark', 'mkmk'},
    # Google's Oswald: ccmp frac liga locl + kern mark mkmk
    'oswald': {'ccmp', 'liga', 'locl', 'kern', 'mark', 'mkmk'},
    # Google's Montserrat 900 italic: ccmp dnom frac liga locl numr pnum rvrn tnum + kern mark mkmk.
    # Only the WRP wordmark uses it, with no numeric settings. rvrn stays: pinning the
    # weight at 900 turns the font's heavy-weight glyph swaps (e.g. the dollar sign)
    # into an rvrn lookup.
    'montserrat': {'ccmp', 'liga', 'locl', 'rvrn', 'kern', 'mark', 'mkmk'},
    # Google's Plex Sans Arabic: calt ccmp fina init locl medi rlig + kern mark mkmk
    'arabic': {'calt', 'ccmp', 'fina', 'init', 'locl', 'medi', 'rlig', 'kern', 'mark', 'mkmk'},
}

# Astro sizes each family's generated fallback face (size-adjust etc.) from the first font
# file, by measuring the widths of Latin letters and the space. Google's Arabic file had
# a space glyph outside its unicode-range, and the space weighs 15% of that measure, so
# the Arabic core files carry it too (not listed in unicode-range, as before). Without it
# the fallback face that draws Latin text on Arabic pages would change size.
ARABIC_METRICS_ONLY = ranges(0x0020)

# Plex is OFL with Reserved Font Name "Plex": a subset is a Modified Version, so it gets
# a name without it (OFL 1.1, condition 3).
ARABIC_NAME = 'WRP Sans Arabic'

FONTS = [
    # axes: instancer limits. claim: what the font may draw (else it falls back, as before).
    # keep: kept even if unused. core / core_extra: what goes in the preloaded file.
    # The site uses Inter at 400-700, but the range stops at 900: cutting the top would
    # re-quantise every 700 delta (up to 0.9/2048 em of drift at 500-700) for ~1.3 KB.
    # Starting at 400, the default, drops the thin master exactly.
    dict(id='inter', source='Inter[opsz,wght].ttf', axes={'opsz': 14, 'wght': (400, 900)},
         # © and · sit in every page's footer. ° is on two blog pages only, but in the
         # extended file "45°C" lost its kerning and shifted the rest of the line. á is
         # "Lamborghini Huracán" in the quote form's car list, drawn once picked.
         core_extra=ranges(0x00A9, 0x00B7, 0x00B0, 0x00E1),
         claim=GOOGLE_LATIN | LATIN_1 | LATIN_EXT_A, keep=LATIN_1 | LATIN_EXT_A, features='inter'),
    dict(id='oswald', source='Oswald[wght].ttf', axes={'wght': (400, 700)},
         core_extra=set(), claim=GOOGLE_LATIN | LATIN_1 | LATIN_EXT_A, keep=LATIN_1 | LATIN_EXT_A, features='oswald'),
    dict(id='montserrat-900-italic', source='Montserrat-Italic[wght].ttf', axes={'wght': 900},
         core_extra=set(), claim=GOOGLE_LATIN | LATIN_1 | LATIN_EXT_A, keep=LATIN_1 | LATIN_EXT_A, features='montserrat'),
] + [
    dict(id=f'wrp-sans-arabic-{w}', source=f'IBMPlexSansArabic-{n}.ttf', axes={},
         core=ARABIC_CORE, metrics_only=ARABIC_METRICS_ONLY, claim=GOOGLE_ARABIC, keep=ARABIC_BLOCK, features='arabic',
         rename=(ARABIC_NAME, style))
    for w, n, style in ((400, 'Regular', 'Regular'), (500, 'Medium', 'Medium'), (600, 'SemiBold', 'SemiBold'),
                        (700, 'Bold', 'Bold'))
]


def fetch_sources():
    CACHE.mkdir(exist_ok=True)
    for name, (path, sha) in SOURCES.items():
        dest = CACHE / name
        if not dest.exists():
            url = f'https://raw.githubusercontent.com/google/fonts/{GOOGLE_FONTS_COMMIT}/{path}'
            print(f'  downloading {url}')
            with urllib.request.urlopen(url) as r:
                dest.write_bytes(r.read())
        got = hashlib.sha256(dest.read_bytes()).hexdigest()
        if got != sha:
            sys.exit(f'{name}: sha256 {got} does not match the pinned {sha}; delete {dest} and retry')


class TextCollector(HTMLParser):
    """Text the browser can draw: text nodes, script strings (UI text added at runtime), and
    attribute values that render (placeholder, value, alt, title, aria-label, content)."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.runs = []

    def handle_data(self, data):
        if data.strip():
            self.runs.append(data)

    def handle_starttag(self, tag, attrs):
        for k, v in attrs:
            if v and k in ('placeholder', 'value', 'alt', 'title', 'aria-label', 'content', 'label', 'data-text'):
                self.runs.append(html.unescape(v))


def scan_site():
    if not DIST.exists():
        sys.exit('dist/client is missing: run `bun run build` first, the character scan reads the built pages')
    runs, pages = [], {}
    for p in sorted(DIST.rglob('*.html')):
        c = TextCollector()
        c.feed(p.read_text(encoding='utf-8'))
        runs += c.runs
        pages[str(p.relative_to(DIST))] = {ord(ch) for r in c.runs for ch in r}
    for p in sorted(DIST.rglob('_astro/*.js')):
        # String literals in client scripts, with \uXXXX escapes decoded.
        for m in re.finditer(r'"((?:[^"\\\n]|\\.)*)"|\'((?:[^\'\\\n]|\\.)*)\'|`((?:[^`\\]|\\.)*)`', p.read_text(encoding='utf-8')):
            s = next(g for g in m.groups() if g is not None)
            runs.append(re.sub(r'\\u\{?([0-9a-fA-F]{4,5})\}?', lambda x: chr(int(x.group(1), 16)), s))
    for p in sorted(DIST.rglob('_astro/*.css')):
        for m in re.finditer(r'content:\s*"((?:[^"\\]|\\.)*)"', p.read_text(encoding='utf-8')):
            runs.append(re.sub(r'\\([0-9a-fA-F]{1,6}) ?', lambda x: chr(int(x.group(1), 16)), m.group(1)))
    used = set()
    for r in runs:
        used.update(ord(c) for c in r)
    return used, runs, pages


def to_unicode_range(cps):
    cps = sorted(cps)
    out, i = [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        out.append(f'U+{cps[i]:04X}' if i == j else f'U+{cps[i]:04X}-{cps[j]:04X}')
        i = j + 1
    return out


def instance(spec):
    # recalcTimestamp off throughout: head.modified stays the source's, so the same input
    # gives the same bytes.
    font = TTFont(CACHE / spec['source'])
    if spec['axes']:
        font = instancer.instantiateVariableFont(font, spec['axes'], updateFontNames=False)
    font.recalcTimestamp = False
    return font


def cut(full, cps, features, rename, extra=frozenset()):
    opts = subset.Options()
    opts.layout_features = sorted(features)
    opts.hinting = False                  # Google's files were unhinted
    opts.notdef_outline = False
    opts.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14, 16, 17]  # keep copyright + licence
    opts.name_languages = [0x409]
    opts.drop_tables += ['STAT', 'DSIG', 'meta']
    opts.glyph_names = False
    opts.flavor = 'woff2'
    font = _clone(full)
    sub = subset.Subsetter(opts)
    sub.populate(unicodes=set(cps) | set(extra))
    sub.subset(font)
    if rename:
        family, style = rename
        name = font['name']
        for rec in list(name.names):
            if rec.nameID in (16, 17):
                name.removeNames(nameID=rec.nameID)
        ribbi = style in ('Regular', 'Bold')
        name.setName(family if ribbi else f'{family} {style}', 1, 3, 1, 0x409)
        name.setName(style if ribbi else 'Regular', 2, 3, 1, 0x409)
        if not ribbi:
            name.setName(family, 16, 3, 1, 0x409)
            name.setName(style, 17, 3, 1, 0x409)
        name.setName(f'{family} {style}', 4, 3, 1, 0x409)
        name.setName(f'{family.replace(" ", "")}-{style}', 6, 3, 1, 0x409)
        ver = name.getDebugName(5)
        name.setName(f'{ver};{family.replace(" ", "")}-{style}', 3, 3, 1, 0x409)
        leftovers = [r.toUnicode() for r in name.names if r.nameID not in (0, 13, 14) and 'plex' in r.toUnicode().lower()]
        assert not leftovers, f'Reserved Font Name still in name table: {leftovers}'
    font.flavor = 'woff2'
    return font


def _clone(font):
    from io import BytesIO
    buf = BytesIO()
    font.save(buf)
    buf.seek(0)
    return TTFont(buf, recalcTimestamp=False)


def shape_check(full, part, texts):
    """Shape every text through the full instance and through the subset: same glyphs
    (outlines), same advances and offsets, or the subset is wrong."""
    import uharfbuzz as hb
    from io import BytesIO
    from fontTools.pens.recordingPen import DecomposingRecordingPen

    def hbfont(tt):
        buf = BytesIO()
        f = _clone(tt)
        f.flavor = None
        f.save(buf)
        return hb.Font(hb.Face(hb.Blob(buf.getvalue()))), f

    (fa, ta), (fb, tb) = hbfont(full), hbfont(part)
    axes = [a for a in ta['fvar'].axes] if 'fvar' in ta else []
    locs = [{}]
    if axes:
        locs = [{'wght': w} for w in (400, 500, 600, 700)]
    ga, gb = ta.getGlyphOrder(), tb.getGlyphOrder()
    outline_cache = {}
    bad = []
    for loc in locs:
        sa, sb = ta.getGlyphSet(location=loc or None), tb.getGlyphSet(location=loc or None)
        if loc:
            fa.set_variations(loc)
            fb.set_variations(loc)
        for text in texts:
            res = []
            for f, order in ((fa, ga), (fb, gb)):
                buf = hb.Buffer()
                buf.add_str(text)
                buf.guess_segment_properties()
                hb.shape(f, buf, {})
                res.append([(order[i.codepoint], p.x_advance, p.x_offset, p.y_offset) for i, p in
                            zip(buf.glyph_infos, buf.glyph_positions)])
            a, b = res
            if [x[1:] for x in a] != [x[1:] for x in b]:
                bad.append(f'positions differ at {loc} for {text[:40]!r}')
                continue
            for x, y in zip(a, b):
                key = (x[0], y[0], tuple(loc.items()))
                if key not in outline_cache:
                    pa, pb = DecomposingRecordingPen(sa), DecomposingRecordingPen(sb)
                    sa[x[0]].draw(pa)
                    sb[y[0]].draw(pb)
                    outline_cache[key] = pa.value == pb.value
                    if not outline_cache[key]:
                        bad.append(f'outline differs at {loc}: {x[0]} vs {y[0]}')
    return bad, len(outline_cache)


def runs_in(texts, cps):
    """Maximal stretches of each text made only of characters in cps (what one file shapes)."""
    out = set()
    for t in texts:
        for m in re.finditer('[' + ''.join(re.escape(chr(c)) for c in sorted(cps) if c > 0x1F) + ']+', t):
            out.add(m.group(0))
    return sorted(out)


def print_boundary_warnings(manifest, pages):
    """Kerning and contextual forms don't work between two font files, so text next to an
    extended-file character can shift. List the extended characters pages use, so they can
    be moved to the core if the shift shows."""
    lines = []
    for fid, parts in manifest.items():
        ext = set()
        for r in parts.get('ext', {}).get('unicodeRange', []):
            a, _, b = r[2:].partition('-')
            ext.update(range(int(a, 16), int(b or a, 16) + 1))
        for c in sorted(ext):
            on = [p for p, chars in pages.items() if c in chars]
            if on:
                lines.append(f'  {fid}: U+{c:04X} {chr(c)} on {len(on)} page(s), e.g. {on[0]}')
    if lines:
        print('\nExtended-file characters in page text (pages that use one download the extended file,'
              '\nand kerning between it and its neighbours is lost; pixel-diff those pages, and move a'
              '\ncharacter into the core if text shifts). Only fonts that actually draw it matter:')
        print('\n'.join(lines))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true',
                    help='only list characters the site uses that the committed subsets lack; write nothing')
    args = ap.parse_args()

    fetch_sources()
    used, texts, pages = scan_site()

    if args.check:
        committed = json.loads((OUT / 'manifest.json').read_text())['fonts']
        lacking = {}
        for spec in FONTS:
            cmap = set(instance(spec).getBestCmap())
            have = set()
            for part in committed.get(spec['id'], {}).values():
                for r in part['unicodeRange']:
                    a, _, b = r[2:].partition('-')
                    have.update(range(int(a, 16), int(b or a, 16) + 1))
            need = sorted(used & spec['claim'] & cmap - have)
            if need:
                lacking[spec['id']] = need
        for k, v in lacking.items():
            print(f'{k}: the site uses ' + ' '.join(f'U+{c:04X} {chr(c)}' for c in v) + ', not in the subsets')
        print('rerun without --check to add them' if lacking else 'subsets cover every character the site uses')
        return 1 if lacking else 0

    manifest, report = {}, []
    for spec in FONTS:
        full = instance(spec)
        cmap = set(full.getBestCmap())
        claim = spec['claim'] & cmap
        core_set = spec.get('core') or (ASCII | PUNCTUATION | spec['core_extra'])
        keep = (spec['keep'] | core_set | used) & claim
        core = core_set & keep
        ext = keep - core
        manifest[spec['id']] = {}
        for kind, cps in (('core', core), ('ext', ext)):
            if not cps:
                continue
            extra = spec.get('metrics_only', set()) if kind == 'core' else set()
            font = cut(full, cps, FEATURES[spec['features']] & (DEFAULT_ON | {'tnum'}), spec.get('rename'), extra)
            got = set(font.getBestCmap())
            assert got == cps | extra, f'{spec["id"]} {kind}: cmap differs from the plan by {sorted(got ^ cps)[:10]}'
            got = cps
            assert not any(t in font for t in ('fpgm', 'prep', 'cvt ', 'cvar', 'hdmx', 'VDMX')), 'hinting left'
            assert 'gasp' in font, 'gasp table dropped'
            if 'fvar' in font:
                axes = {a.axisTag: (a.minValue, a.maxValue) for a in font['fvar'].axes}
                assert axes == {'wght': spec['axes']['wght']}, f'{spec["id"]}: unexpected axes {axes}'
            for t, attrs in (('hhea', ('ascent', 'descent', 'lineGap')), ('head', ('unitsPerEm',)),
                             ('OS/2', ('sTypoAscender', 'sTypoDescender', 'sTypoLineGap', 'usWinAscent', 'usWinDescent'))):
                for attr in attrs:
                    assert getattr(font[t], attr) == getattr(full[t], attr), f'{spec["id"]}: {t}.{attr} changed'
            bad, n = shape_check(full, font, runs_in(texts, cps) + [''.join(chr(c) for c in sorted(cps))])
            if bad:
                sys.exit(f'{spec["id"]} {kind}: subset shapes differently from the full font:\n  ' + '\n  '.join(bad[:10]))
            file = f'{spec["id"]}-{kind}.woff2'
            OUT.mkdir(parents=True, exist_ok=True)
            font.save(OUT / file)
            manifest[spec['id']][kind] = {'file': file, 'unicodeRange': to_unicode_range(got)}
            report.append(f'  {file:34} {len(got):4} chars {font["maxp"].numGlyphs:4} glyphs '
                          f'{(OUT / file).stat().st_size:6} B  shaping checked ({n} glyph outlines)')
    (OUT / 'manifest.json').write_text(json.dumps({
        '//': 'Generated by scripts/fonts/subset-fonts.py from dist/client. Do not edit; rerun the script.',
        'source': f'github.com/google/fonts@{GOOGLE_FONTS_COMMIT}',
        'fonts': manifest,
    }, indent=2, ensure_ascii=False) + '\n')
    print('\n'.join(report))
    print(f'wrote {OUT.relative_to(ROOT)}/')
    print_boundary_warnings(manifest, pages)
    return 0


if __name__ == '__main__':
    # fontTools walks sets of glyph names; a fixed hash seed keeps the output byte-identical
    # between runs, so a rerun with unchanged inputs leaves git clean.
    if os.environ.get('PYTHONHASHSEED') != '0':
        os.execve(sys.executable, [sys.executable, *sys.argv], {**os.environ, 'PYTHONHASHSEED': '0'})
    sys.exit(main())
