/**
 * 2D fallback car viewer: an unfolded line drawing of the car.
 *
 *   ┌──────── left side profile ────────┐
 *   │           view from above          │   front always faces right →
 *   └──────── right side profile ───────┘
 *
 * Every PanelId is exactly one <path data-panel="…">; glass is <path data-glass="…">.
 * Same mount()/CarViewerHandle API as CarViewer3D. update() only touches
 * attributes on existing paths (cheap enough to run inside an input handler);
 * a body change re-renders the markup.
 *
 * The drawing is pointer-only by design: the host always renders an accessible
 * list of panel toggle buttons next to it, so nobody depends on precise taps.
 * No DOM access at module top level, so it is safe to import on the server.
 */
import { panels, wrapParts, type BodyType, type CarViewerHandle, type CarViewerOptions, type GlassId, type PanelId } from '../panels';

type Geo = {
  /** Side profile height (roof to ground). */
  sh: number;
  /** Width of the car seen from above. */
  tw: number;
  wheelR: number;
  xr: number;
  xf: number;
  roofY: number;
  beltY: number;
  hoodY: number;
  deckY: number;
  sillY: number;
  /** Side-view x of the roof's rear and front ends. */
  roofX0: number;
  roofX1: number;
  /** Base of the A-pillar (windscreen base) and C-pillar (rear glass base). */
  aX: number;
  cX: number;
  /** Door lines: rear edge of rear door, B-pillar, front edge of front door. */
  dRear: number;
  dMid: number;
  dFront: number;
  fb: number;
  rb: number;
  rearDoors: boolean;
  spoiler: boolean;
  bed?: boolean;
  /** Top-view glass/roof lines when they differ from the side view. */
  tRoof0?: number;
  tRoof1?: number;
  tC?: number;
};

const L = 440; // car length in drawing units
const PAD_X = 24;
const VIEW_W = PAD_X + L + 16;

const geos: Record<BodyType, Geo> = {
  sedan: {
    sh: 92, tw: 140, wheelR: 28, xr: 84, xf: 356,
    roofY: 8, beltY: 46, hoodY: 50, deckY: 44, sillY: 72,
    roofX0: 148, roofX1: 262, aX: 304, cX: 100,
    dRear: 142, dMid: 226, dFront: 312, fb: 18, rb: 16,
    rearDoors: true, spoiler: true,
  },
  coupe: {
    sh: 82, tw: 142, wheelR: 28, xr: 82, xf: 352,
    roofY: 10, beltY: 44, hoodY: 50, deckY: 42, sillY: 64,
    roofX0: 168, roofX1: 250, aX: 300, cX: 70,
    dRear: 168, dMid: 168, dFront: 300, fb: 18, rb: 16,
    rearDoors: false, spoiler: true,
  },
  suv: {
    sh: 110, tw: 150, wheelR: 32, xr: 82, xf: 352,
    roofY: 6, beltY: 52, hoodY: 54, deckY: 52, sillY: 84,
    roofX0: 40, roofX1: 286, aX: 326, cX: 22,
    dRear: 128, dMid: 220, dFront: 318, fb: 16, rb: 14,
    rearDoors: true, spoiler: true, tRoof0: 64, tC: 38,
  },
  pickup: {
    sh: 112, tw: 152, wheelR: 33, xr: 80, xf: 356,
    roofY: 6, beltY: 54, hoodY: 56, deckY: 58, sillY: 86,
    roofX0: 170, roofX1: 278, aX: 320, cX: 164,
    dRear: 170, dMid: 244, dFront: 322, fb: 16, rb: 12,
    rearDoors: true, spoiler: false, bed: true, tRoof0: 176, tC: 166,
  },
};

const GAP = 10;
const MIRROR = 12;

const n = (v: number) => Math.round(v * 10) / 10;
const poly = (pts: [number, number][]) => 'M' + pts.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L') + ' Z';
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${n(x + r)} ${n(y)} H${n(x + w - r)} Q${n(x + w)} ${n(y)} ${n(x + w)} ${n(y + r)} V${n(y + h - r)} Q${n(x + w)} ${n(y + h)} ${n(x + w - r)} ${n(y + h)} H${n(x + r)} Q${n(x)} ${n(y + h)} ${n(x)} ${n(y + h - r)} V${n(y + r)} Q${n(x)} ${n(y)} ${n(x + r)} ${n(y)} Z`;

/** Which panels exist on a body (coupes have no rear doors, pickups no spoiler). */
export function panelsFor(body: BodyType): PanelId[] {
  const g = geos[body];
  return panels
    .map((p) => p.id)
    .filter((id) => (g.rearDoors || !id.startsWith('door-r')) && (g.spoiler || id !== 'spoiler'));
}

type Piece = { panels: [PanelId | GlassId | 'base', string][]; deco: string };

/** One side profile; `side` picks the l/r ids. Local coords: x 0..L, y 0..sh. */
function sidePiece(g: Geo, side: 'l' | 'r'): Piece {
  const ground = g.sh;
  const bottom = g.sh - 9;
  const wy = g.sh - g.wheelR;
  const ar = g.wheelR + 5;
  const arch = (cx: number) =>
    // From the arch's rear foot, over the wheel, to its front foot (drawn front→rear when reversed).
    ({ from: [cx + ar, bottom] as [number, number], to: [cx - ar, bottom] as [number, number] });
  const fa = arch(g.xf);
  const ra = arch(g.xr);
  const arc = (to: [number, number]) => `A${ar} ${ar} 0 0 0 ${n(to[0])} ${n(to[1])}`;

  const out: [PanelId | GlassId | 'base', string][] = [];
  // Body silhouette (base, not a panel).
  const base = g.bed
    ? poly([[0, g.deckY], [g.cX, g.deckY], [g.cX, g.roofY + 4], [g.cX + 6, g.roofY], [g.roofX1, g.roofY], [g.aX, g.beltY], [L - g.fb, g.hoodY], [L - 2, g.hoodY + 6], [L, g.hoodY + 20], [L, bottom - 4], [L - 8, bottom], [0, bottom]])
    : poly([[0, g.deckY + 8], [g.rb, g.deckY], [g.cX, g.deckY - 2], [g.roofX0, g.roofY], [g.roofX1, g.roofY], [g.aX, g.beltY], [L - g.fb, g.hoodY], [L - 2, g.hoodY + 6], [L, g.hoodY + 20], [L, bottom - 4], [L - 8, bottom], [4, bottom], [0, bottom - 6]]);
  out.push(['base', base]);

  // Side glass (DLO): between the pillars, above the beltline.
  const glassRear = g.bed ? g.cX + 8 : g.cX + (g.roofX0 - g.cX) * 0.35;
  out.push([
    `side-glass-${side}` as GlassId,
    poly([[g.aX - 12, g.beltY - 2], [g.roofX1 - 4, g.roofY + 6], [Math.max(g.roofX0, g.cX) + (g.bed ? 10 : 6), g.roofY + 6], [glassRear, g.beltY - 2]]),
  ]);
  // A-pillar: a slim slanted strip along the windscreen edge.
  out.push([
    `a-pillar-${side}` as PanelId,
    poly([[g.aX - 11, g.beltY - 1], [g.aX, g.beltY], [g.roofX1 + 3, g.roofY + 1], [g.roofX1 - 5, g.roofY + 4]]),
  ]);
  // Front fender, with the front wheel arch cut out.
  out.push([
    `fender-${side}` as PanelId,
    `${poly([[g.dFront, g.beltY + 1], [g.aX, g.beltY], [L - g.fb, g.hoodY]]).slice(0, -2)} L${L - g.fb} ${bottom} L${n(fa.from[0])} ${bottom} ${arc(fa.to)} L${n(fa.to[0])} ${g.sillY} L${g.dFront} ${g.sillY} Z`,
  ]);
  // Front bumper (side view).
  out.push([
    'front-bumper',
    poly([[L - g.fb, g.hoodY], [L - 2, g.hoodY + 6], [L, g.hoodY + 20], [L, bottom - 4], [L - 8, bottom], [L - g.fb, bottom]]),
  ]);
  // Doors.
  const doorTop = (x: number) => g.beltY + (x > g.aX - 12 ? 1 : 0);
  out.push([`door-f${side}` as PanelId, poly([[g.dMid + 1, doorTop(g.dMid)], [g.dFront - 1, doorTop(g.dFront)], [g.dFront - 1, g.sillY], [g.dMid + 1, g.sillY]])]);
  if (g.rearDoors) {
    out.push([`door-r${side}` as PanelId, poly([[g.dRear + 1, g.beltY], [g.dMid - 1, g.beltY], [g.dMid - 1, g.sillY], [g.dRear + 1, g.sillY]])]);
  }
  // Rocker: between the arches, below the doors.
  out.push([`rocker-${side}` as PanelId, poly([[ra.from[0] + 2, g.sillY + 1], [fa.to[0] - 2, g.sillY + 1], [fa.to[0] - 2, bottom], [ra.from[0] + 2, bottom]])]);
  // Rear quarter, with the rear wheel arch cut out.
  const qTop = g.bed ? g.deckY : g.deckY - 1;
  out.push([
    `quarter-${side}` as PanelId,
    `M${g.dRear - 1} ${g.beltY} L${g.dRear - 1} ${g.sillY} L${n(ra.from[0])} ${g.sillY} L${n(ra.from[0])} ${bottom} ${arc(ra.to)} L${g.rb + 1} ${bottom} L${g.rb + 1} ${qTop + 6} L${g.rb + 4} ${qTop} L${g.bed ? g.cX - 1 : g.cX} ${g.bed ? qTop : qTop - 1} L${g.bed ? g.cX - 1 : glassRear} ${g.bed ? g.beltY : g.beltY - 2} Z`,
  ]);
  // Rear bumper (side view).
  out.push(['rear-bumper', poly([[0, g.deckY + 10], [g.rb, g.deckY + 6], [g.rb, bottom], [4, bottom], [0, bottom - 6]])]);

  // Decorative: wheels, B-pillar, handles.
  const wheel = (cx: number) =>
    `<circle cx="${cx}" cy="${wy}" r="${g.wheelR - 2}" class="cv-tyre"/><circle cx="${cx}" cy="${wy}" r="${n(g.wheelR * 0.58)}" class="cv-rim"/><circle cx="${cx}" cy="${wy}" r="3" class="cv-hub"/>`;
  const bPillar = g.rearDoors ? `<path class="cv-line" d="M${g.dMid} ${g.roofY + 6} L${g.dMid} ${g.beltY - 2}"/>` : '';
  const handle = (x: number) => `<path class="cv-handle" d="M${x - 14} ${g.beltY + 8} h12"/>`;
  const deco =
    wheel(g.xr) + wheel(g.xf) + bPillar + handle(g.dFront - 6) + (g.rearDoors ? handle(g.dMid - 6) : '') +
    `<path class="cv-ground" d="M-6 ${ground} H${L + 6}"/>`;
  return { panels: out, deco };
}

/** View from above. Local coords: x 0..L, y 0..tw + 2*MIRROR. */
function topPiece(g: Geo): Piece {
  const y0 = MIRROR;
  const y1 = MIRROR + g.tw;
  const inset = 11;
  const tC = g.tC ?? g.cX;
  const tR0 = g.tRoof0 ?? g.roofX0;
  const tR1 = g.tRoof1 ?? g.roofX1;
  const gIn = 15; // glass/roof inset from the body edge
  const out: [PanelId | GlassId | 'base', string][] = [];
  out.push(['base', rrect(0, y0, L, g.tw, 20)]);
  out.push(['rear-bumper', `M${g.rb} ${y0 + 1} L10 ${y0 + 1} Q1 ${y0 + 2} 1 ${y0 + 14} L1 ${y1 - 14} Q1 ${y1 - 2} 10 ${y1 - 1} L${g.rb} ${y1 - 1} Z`]);
  out.push(['boot', rrect(g.rb + 2, y0 + inset, tC - g.rb - 4, g.tw - inset * 2, 6)]);
  out.push(['rear-glass', poly([[tC, y0 + inset + 2], [tR0, y0 + gIn], [tR0, y1 - gIn], [tC, y1 - inset - 2]])]);
  out.push(['roof', rrect(tR0 + 2, y0 + gIn, tR1 - tR0 - 4, g.tw - gIn * 2, 8)]);
  out.push(['windscreen', poly([[tR1, y0 + gIn], [g.aX, y0 + inset - 3], [g.aX, y1 - inset + 3], [tR1, y1 - gIn]])]);
  out.push(['bonnet', `M${g.aX + 3} ${y0 + inset - 2} L${L - g.fb - 2} ${y0 + inset} L${L - g.fb - 2} ${y1 - inset} L${g.aX + 3} ${y1 - inset + 2} Z`]);
  out.push(['front-bumper', `M${L - g.fb} ${y0 + 1} L${L - 12} ${y0 + 1} Q${L - 1} ${y0 + 3} ${L - 1} ${y0 + 18} L${L - 1} ${y1 - 18} Q${L - 1} ${y1 - 3} ${L - 12} ${y1 - 1} L${L - g.fb} ${y1 - 1} Z`]);
  const hl = (top: boolean) => {
    const yA = top ? y0 + 3 : y1 - 3;
    const yB = top ? y0 + 22 : y1 - 22;
    return `M${L - g.fb - 26} ${yA} L${L - g.fb - 2} ${yA} L${L - g.fb - 2} ${yB} Q${L - g.fb - 18} ${top ? yB - 2 : yB + 2} ${L - g.fb - 26} ${n((yA + yB) / 2)} Z`;
  };
  out.push(['headlights', hl(true) + ' ' + hl(false)]);
  const mx = g.aX - 18;
  out.push(['mirror-l', `M${mx} ${y0} L${mx + 4} 1 Q${mx + 12} -1 ${mx + 18} 3 L${mx + 20} ${y0} Z`]);
  out.push(['mirror-r', `M${mx} ${y1} L${mx + 4} ${y1 + MIRROR - 1} Q${mx + 12} ${y1 + MIRROR + 1} ${mx + 18} ${y1 + MIRROR - 3} L${mx + 20} ${y1} Z`]);
  if (g.spoiler) {
    const sx = g.bed ? g.rb + 2 : g.tC !== undefined ? tR0 + 2 : g.rb + 4;
    out.push(['spoiler', rrect(sx, y0 + inset + 4, 9, g.tw - (inset + 4) * 2, 3)]);
  }
  const deco = g.bed
    ? `<path class="cv-line" d="${rrect(g.rb + 10, y0 + inset + 8, tC - g.rb - 22, g.tw - (inset + 8) * 2, 4)}"/>`
    : '';
  return { panels: out, deco };
}

const allPanelIds = new Set<string>(panels.map((p) => p.id));

function pieceMarkup(piece: Piece, dx: number, dy: number, interactive: ReadonlySet<PanelId>) {
  const body = piece.panels
    .map(([id, d]) => {
      if (id === 'base') return `<path class="cv-base" d="${d}"/>`;
      if (allPanelIds.has(id)) {
        const i = interactive.has(id as PanelId);
        return `<path class="cv-panel" data-panel="${id}" d="${d}"${i ? ' data-tap=""' : ''}/>`;
      }
      return `<path class="cv-glass" data-glass="${id}" d="${d}"/>`;
    })
    .join('');
  return `<g transform="translate(${dx} ${dy})">${body}${piece.deco}</g>`;
}

function layout(body: BodyType, profileOnly: boolean) {
  const g = geos[body];
  const topH = g.tw + MIRROR * 2;
  if (profileOnly) return { g, h: g.sh + 6, left: 4, top: -1, right: -1 };
  return { g, h: g.sh * 2 + topH + GAP * 2 + 4, left: 2, top: 2 + g.sh + GAP, right: 2 + g.sh + GAP + topH + GAP };
}

function svgMarkup(body: BodyType, mode: CarViewerOptions['mode'], uid: string) {
  const profileOnly = mode === 'look';
  const { g, h, left, top, right } = layout(body, profileOnly);
  const interactive: ReadonlySet<PanelId> =
    mode === 'ppf' ? new Set(panelsFor(body)) : mode === 'wrap' ? new Set(wrapParts.filter((p) => panelsFor(body).includes(p))) : new Set();
  let inner = pieceMarkup(sidePiece(g, 'l'), PAD_X, left, interactive);
  if (!profileOnly) {
    inner += pieceMarkup(topPiece(g), PAD_X, top, interactive);
    inner += pieceMarkup(sidePiece(g, 'r'), PAD_X, right, interactive);
    inner +=
      `<text class="cv-label" x="4" y="${left + g.sh / 2 + 5}">L</text>` +
      `<text class="cv-label" x="4" y="${right + g.sh / 2 + 5}">R</text>`;
  }
  const defs = `<defs>
    <pattern id="${uid}-film" patternUnits="userSpaceOnUse" width="7" height="7" patternTransform="rotate(45)">
      <rect width="7" height="7" class="cv-film-bg"/><path d="M0 0 V7" class="cv-film-line"/>
    </pattern>
    <pattern id="${uid}-part" patternUnits="userSpaceOnUse" width="12" height="12" patternTransform="rotate(45)">
      <rect width="12" height="12" class="cv-part-bg"/><path d="M0 0 V12" class="cv-film-line"/>
    </pattern>
    <linearGradient id="${uid}-sheen" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>`;
  return { markup: defs + inner, viewBox: `0 0 ${VIEW_W} ${h}` };
}

const STYLE_ID = 'cv2d-style';
const css = `
.cv2d{display:block;inline-size:100%;block-size:auto;touch-action:manipulation;-webkit-tap-highlight-color:transparent;user-select:none}
.cv2d .cv-base{fill:var(--cv-paint-deep);stroke:var(--cv-stroke);stroke-width:1.2}
.cv2d .cv-panel{fill:var(--cv-paint);stroke:var(--cv-stroke);stroke-width:1.1;stroke-linejoin:round;transition:fill .18s ease}
.cv2d .cv-panel[data-tap]{cursor:pointer}
@media (hover:hover){.cv2d .cv-panel[data-tap]:hover{stroke:var(--cv-accent);stroke-width:2}}
.cv2d .cv-panel[data-on]{stroke:var(--cv-accent);stroke-width:1.6}
.cv2d[data-mode=ppf] .cv-panel[data-on]{fill:url(#UID-film)}
.cv2d[data-mode=ppf] .cv-panel[data-part]:not([data-on]){fill:url(#UID-part);stroke:var(--cv-accent);stroke-dasharray:4 3}
.cv2d[data-mode=wrap] .cv-panel[data-on]{fill:var(--cv-wrap);stroke:var(--cv-accent)}
.cv2d[data-mode=wrap] .cv-panel:not([data-tap]),.cv2d[data-mode=tint] .cv-panel,.cv2d[data-mode=look] .cv-panel{opacity:.92}
.cv2d .cv-glass{fill:var(--cv-glass);stroke:var(--cv-stroke);stroke-width:1;transition:fill .25s ease}
.cv2d[data-mode=tint] .cv-glass[data-film]{fill:var(--cv-tint);stroke:var(--cv-accent);stroke-width:1.6}
.cv2d .cv-film-bg{fill:var(--cv-film-bg)}
.cv2d .cv-part-bg{fill:var(--cv-paint)}
.cv2d .cv-film-line{stroke:var(--cv-accent);stroke-width:2.2}
.cv2d .cv-tyre{fill:#0b0c0e;stroke:var(--cv-stroke);stroke-width:1}
.cv2d .cv-rim{fill:#3a3f46;stroke:#8d949c;stroke-width:1}
.cv2d .cv-hub{fill:#8d949c}
.cv2d .cv-line{fill:none;stroke:var(--cv-stroke);stroke-width:1.2}
.cv2d .cv-handle{stroke:var(--cv-stroke);stroke-width:2.2;stroke-linecap:round}
.cv2d .cv-ground{stroke:rgb(255 255 255 / .14);stroke-width:1}
.cv2d .cv-label{fill:#a3a8ae;font:600 15px/1 system-ui,sans-serif}
.cv2d .cv-front{fill:#c9a45c;font-size:26px}
.cv2d .cv-panel.cv-flash{animation:cv-flash .35s ease-out}
@keyframes cv-flash{from{stroke-width:5}}
@media (prefers-reduced-motion:reduce){.cv2d .cv-panel,.cv2d .cv-glass{transition:none}.cv2d .cv-panel.cv-flash{animation:none}}
`;

function ensureStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const s = document.createElement('style');
  s.id = STYLE_ID;
  // Pattern ids are per instance; attribute selectors keep the rules generic.
  s.textContent = css.replaceAll('url(#UID-film)', 'var(--cv-film)').replaceAll('url(#UID-part)', 'var(--cv-part)');
  document.head.appendChild(s);
}

/** Mix a hex colour toward black (amt < 0) or white (amt > 0). */
function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const v = parseInt(m[1], 16);
  const ch = [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) =>
    Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt),
  );
  return '#' + ch.map((c) => c.toString(16).padStart(2, '0')).join('');
}

function luminance(hex: string) {
  const v = parseInt(hex.replace('#', ''), 16);
  return (0.2126 * ((v >> 16) & 255) + 0.7152 * ((v >> 8) & 255) + 0.0722 * (v & 255)) / 255;
}

function glassColour(vlt: number | undefined) {
  // Clear glass reads as a pale sky reflection; film darkens it toward black.
  const t = vlt === undefined ? 0 : Math.min(1, Math.max(0, (100 - vlt) / 100));
  const from = [150, 172, 190];
  const to = [10, 12, 15];
  const c = from.map((f, i) => Math.round(f + (to[i] - f) * Math.min(1, t * 1.18)));
  return `rgb(${c.join(' ')})`;
}

let uidCounter = 0;
const DEFAULT_TINT_GLASS: ReadonlySet<GlassId> = new Set(['side-glass-l', 'side-glass-r', 'rear-glass']);

export async function mount(el: HTMLElement, initial: CarViewerOptions): Promise<CarViewerHandle> {
  ensureStyle();
  let opts: CarViewerOptions = { ...initial };
  const uid = `cv${++uidCounter}`;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.classList.add('cv2d');
  svg.setAttribute('role', 'img');
  svg.setAttribute('focusable', 'false');
  el.replaceChildren(svg);

  let renderedKey = '';
  const render = () => {
    const key = `${opts.body}|${opts.mode === 'look' ? 'look' : 'full'}|${opts.mode}`;
    if (key !== renderedKey) {
      const { markup, viewBox } = svgMarkup(opts.body, opts.mode, uid);
      svg.setAttribute('viewBox', viewBox);
      svg.innerHTML = markup;
      renderedKey = key;
    }
    svg.dataset.mode = opts.mode;
    const paint = opts.paint ?? '#d9dadc';
    const light = luminance(paint) > 0.55;
    svg.style.setProperty('--cv-paint', paint);
    svg.style.setProperty('--cv-paint-deep', shade(paint, light ? -0.22 : -0.35));
    svg.style.setProperty('--cv-stroke', light ? 'rgb(20 22 26 / .55)' : 'rgb(255 255 255 / .5)');
    svg.style.setProperty('--cv-accent', '#c9a45c');
    svg.style.setProperty('--cv-film-bg', light ? shade('#c9a45c', 0.45) : shade('#c9a45c', -0.45));
    svg.style.setProperty('--cv-film', `url(#${uid}-film)`);
    svg.style.setProperty('--cv-part', `url(#${uid}-part)`);
    svg.style.setProperty('--cv-wrap', opts.wrapColor ?? '#141516');
    svg.style.setProperty('--cv-glass', glassColour(undefined));
    svg.style.setProperty('--cv-tint', glassColour(opts.tintVlt));

    const partial = opts.partial ?? new Set<PanelId>();
    svg.querySelectorAll<SVGPathElement>('[data-panel]').forEach((p) => {
      const id = p.dataset.panel as PanelId;
      const on = opts.mode !== 'look' && opts.mode !== 'tint' && opts.selected.has(id);
      p.toggleAttribute('data-on', on);
      p.toggleAttribute('data-part', opts.mode === 'ppf' && partial.has(id));
    });
    const tintSet = opts.tintGlass ?? DEFAULT_TINT_GLASS;
    svg.querySelectorAll<SVGPathElement>('[data-glass]').forEach((p) => {
      p.toggleAttribute('data-film', opts.mode === 'tint' && opts.tintVlt !== undefined && tintSet.has(p.dataset.glass as GlassId));
    });
    svg.setAttribute('aria-label', describe(opts));
  };

  const onClick = (event: Event) => {
    const target = (event.target as Element | null)?.closest?.('[data-tap]') as SVGPathElement | null;
    if (!target || !opts.onToggle) return;
    const id = target.dataset.panel as PanelId;
    target.classList.remove('cv-flash');
    // Restart the tap flash without forcing a synchronous layout.
    requestAnimationFrame(() => target.classList.add('cv-flash'));
    opts.onToggle(id);
  };
  svg.addEventListener('click', onClick);
  render();

  return {
    update(next) {
      opts = { ...opts, ...next };
      render();
    },
    destroy() {
      svg.removeEventListener('click', onClick);
      svg.remove();
    },
  };
}

const bodyNames: Record<BodyType, string> = { sedan: 'sedan', coupe: 'coupe', suv: 'SUV', pickup: 'pickup' };

function describe(o: CarViewerOptions): string {
  const car = `Drawing of a ${bodyNames[o.body]}`;
  if (o.mode === 'look') return `${car}, side view.`;
  if (o.mode === 'tint') return `${car} from above and both sides, windows shaded to ${o.tintVlt ?? 'no'}% visible light.`;
  const names = panels.filter((p) => o.selected.has(p.id)).map((p) => p.label.toLowerCase());
  const verb = o.mode === 'wrap' ? 'wrapped' : 'covered with film';
  return names.length
    ? `${car} from above and both sides. ${names.length} ${names.length === 1 ? 'part' : 'parts'} ${verb}: ${names.join(', ')}.`
    : `${car} from above and both sides. Nothing ${verb} yet.`;
}
