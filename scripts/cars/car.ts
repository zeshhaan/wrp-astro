/**
 * Parametric car builder: one CarSpec in, a list of named parts out.
 *
 * 1. Loft the lower body and the glasshouse from superellipse sections.
 * 2. Manifold CSG: cut wheel arches (and the pickup bed) from the lower body,
 *    union the glasshouse on, compute smooth normals with sharp creases.
 * 3. Split the skin into panels by intersecting with region solids (side-view
 *    shapes extruded across the car, optionally intersected with plan-view
 *    shapes). Regions are claimed in priority order; each later region
 *    subtracts the earlier ones grown by the shut-line gap, so every seam is a
 *    small real gap. Only skin triangles are kept (the cut faces are dropped),
 *    and a dark inset "core" behind the skin makes the gaps read as shut lines.
 */
import type { BodyType } from '../../src/designs/studio/quote/panels';
import {
  band, bodySection, cabinSection, clamp, cs, curve, endRetreat, extract, lerp, loft, mergeParts, mf, planLeft, planOutside,
  planRight, planWithin, rect, regionSolid, resampleRing, sideAll, stations, superY, whole, BIGV,
  type CS, type Curve, type Key, type M, type Part, type Poly, type Region,
} from './lib';

export interface EndSpec {
  /** Length over which the end rounds off. */
  len: number;
  /** Retreat of the half-width, top and bottom at the tip. */
  rz: number;
  ryT: number;
  ryB: number;
}

export interface CarSpec {
  id: BodyType;
  /** Overall length; x runs 0 (rear) → L (front) while building, recentred on export. */
  L: number;
  rearAxle: number;
  frontAxle: number;
  wheelR: number;
  rimR: number;
  tyreW: number;
  /** Arch radius over the tyre. */
  archGap: number;
  lower: {
    top: Key[];
    bot: Key[];
    mid: Key[];
    half: Key[];
    nTop: number;
    nBot: number;
    front: EndSpec;
    rear: EndSpec;
  };
  cabin: {
    x0: number;
    x1: number;
    roof: Key[];
    half: Key[];
    n: number;
    tumble: number;
    front: { len: number; rz: number };
    rear: { len: number; rz: number };
    /** Fraction of the crown height where side glass turns into roof / windscreen. */
    corner: number;
  };
  /** x where the windscreen meets the roof, and where the roof meets the rear glass. */
  roofF: number;
  roofR: number;
  /** Half-height of the pillar / roof-rail band around the corner line. */
  pillar: number;
  /** Door shut lines (front door leading edge, B-pillar, rear door trailing edge). */
  doors: { front: number; b?: number; rear: number };
  bPillar: number;
  /** Side glass rear edge: slanted line from (xBot at belt) to (xTop at roof). */
  dloRear: { xBot: number; xTop: number };
  rockerY: number;
  bumperF: { seamX: number; splitDy: number; nose: number };
  bumperR: { seamX: number; splitY: number };
  bonnetK: number;
  cowlX: number;
  boot: { kind: 'deck' | 'tailgate'; x: number; k: number };
  head: { depth: number; dyTop: number; dyBot: number; zIn: number };
  tail: { depth: number; dyTop: number; dyBot: number; zIn: number; zOut?: number };
  grille: { y0: number; y1: number; z: number }[];
  mirror: { x: number; dy: number };
  spoiler: 'lip' | 'wing' | 'roof' | 'cap';
  /** Width of dark wheel-arch cladding (SUV / pickup), if any. */
  cladding?: number;
  bed?: { x0: number; x1: number; floor: number; wall: number };
  seats: { x: number; z: number; w: number }[];
}

const GAP = 0.0075; // shut line width (m)

export interface BuiltCar {
  parts: Part[];
  /** Wheel parts (one wheel, instanced at these centres; z < 0 wheels face left). */
  wheel: { tyre: Part; rim: Part; centres: [number, number, number][] };
  bounds: { min: [number, number, number]; max: [number, number, number] };
}

export function buildCar(s: CarSpec): BuiltCar {
  const { Manifold } = mf();
  const L = s.L;

  // ── Lower body profile ────────────────────────────────────────────────
  const top = curve(s.lower.top);
  const bot = curve(s.lower.bot);
  const mid = curve(s.lower.mid);
  const half = curve(s.lower.half);
  const lowerAt = (x: number, inset = 0) => {
    const dF = L - x;
    const dR = x;
    const f = s.lower.front;
    const r = s.lower.rear;
    const zH = half(x) - endRetreat(dF, f.len, f.rz) - endRetreat(dR, r.len, r.rz) - inset;
    const yT = top(x) - endRetreat(dF, f.len, f.ryT) - endRetreat(dR, r.len, r.ryT) - inset;
    const yB = bot(x) + endRetreat(dF, f.len, f.ryB) + endRetreat(dR, r.len, r.ryB) + inset;
    const yM = clamp(mid(x), yB + 0.05, yT - 0.05);
    return { zH, yT, yB, yM };
  };
  /** Height of the lower-body surface at lateral offset z. */
  const surfY = (x: number, z: number) => {
    const { zH, yT, yM } = lowerAt(x);
    const u = clamp(Math.abs(z) / zH, 0, 1);
    return yM + (yT - yM) * Math.pow(1 - Math.pow(u, s.lower.nTop), 1 / s.lower.nTop);
  };
  const topAt = (x: number) => lowerAt(x).yT;

  const lowerLoft = (inset: number, ring = 52, count = 60) => {
    // Inset copies are shortened too, so their end caps never sit coplanar with the skin's.
    const xs = stations(inset, L - inset, count);
    const rings = xs.map((x) => {
      const { zH, yT, yB, yM } = lowerAt(x, inset);
      return resampleRing(bodySection(zH, yB, yM, yT, s.lower.nTop, s.lower.nBot), ring);
    });
    return loft(xs, rings);
  };

  // ── Cabin profile ─────────────────────────────────────────────────────
  const c = s.cabin;
  const roof = curve(c.roof);
  const chalf = curve(c.half);
  const cabinAt = (x: number, inset = 0) => {
    const zH = chalf(x) - endRetreat(c.x1 - x, c.front.len, c.front.rz) - endRetreat(x - c.x0, c.rear.len, c.rear.rz) - inset;
    const yBase = surfY(x, zH) - 0.012;
    const yRoof = Math.max(roof(x) - inset, yBase + 0.004);
    return { zH, yBase, yRoof };
  };
  const cornerY = (x: number) => {
    const { yBase, yRoof } = cabinAt(clamp(x, c.x0, c.x1));
    return lerp(yBase, yRoof, c.corner);
  };
  const cabinLoft = (inset: number, ring = 48, count = 42) => {
    const xs = stations(c.x0 + inset, c.x1 - inset, count, 0.4);
    const rings = xs.map((x) => {
      const { zH, yBase, yRoof } = cabinAt(x, inset);
      return resampleRing(cabinSection(zH, yBase - 0.22, yBase, yRoof, c.n, c.tumble), ring, 0.5);
    });
    return loft(xs, rings);
  };

  // ── Wheels & arches ───────────────────────────────────────────────────
  const archR = s.wheelR + s.archGap;
  const axles = [s.rearAxle, s.frontAxle];
  const archCutter = (grow: number) => {
    const list: M[] = [];
    for (const ax of axles) {
      const zIn = half(ax) - 0.3;
      const cyl = Manifold.cylinder(2, archR + grow, archR + grow, 48);
      list.push(cyl.translate([ax, s.wheelR, zIn - grow]));
      list.push(cyl.translate([ax, s.wheelR, -zIn + grow - 2]));
    }
    return Manifold.union(list);
  };

  // ── Solids ────────────────────────────────────────────────────────────
  const lower0 = lowerLoft(0).asOriginal();
  const lowerId = lower0.originalID();
  const arches = archCutter(0).asOriginal();
  const archId = arches.originalID();
  let lower = lower0.subtract(arches);
  const bedCutter = (grow: number): M | null => {
    if (!s.bed) return null;
    const b = s.bed;
    const zw = half((b.x0 + b.x1) / 2) - b.wall + grow;
    return Manifold.cube([b.x1 - b.x0 + 2 * grow, 2, zw * 2]).translate([b.x0 - grow, b.floor - grow, -zw]);
  };
  // Pickup bed: a box cut from the lower body, leaving wheel-well humps over the rear arches.
  const bedIds: number[] = [];
  const bedBox = bedCutter(0)?.asOriginal() ?? null;
  if (bedBox && s.bed) {
    const zw = half((s.bed.x0 + s.bed.x1) / 2) - s.bed.wall;
    const r = archR + 0.05;
    const humpR = Manifold.cylinder(1, r, r, 48).translate([s.rearAxle, s.wheelR, zw - 0.26]);
    const hump = Manifold.union([humpR, humpR.mirror([0, 0, 1])]).asOriginal();
    bedIds.push(bedBox.originalID(), hump.originalID());
    lower = lower.subtract(bedBox.subtract(hump));
  }
  const cabin0 = cabinLoft(0).asOriginal();
  const cabinId = cabin0.originalID();
  // Clip the cabin to the bed front so the pickup cab has a clean back wall.
  const body = lower.add(cabin0).calculateNormals(0, 48);

  const parts: Part[] = [];
  const claimed = new Map<number, M[]>();
  const take = (name: string, src: number, region: Region, extraGrow = 0): Part | null => {
    let solid = regionSolid(region, 0);
    const prev = claimed.get(src) ?? [];
    if (prev.length) solid = solid.subtract(Manifold.union(prev));
    prev.push(regionSolid(region, GAP + extraGrow));
    claimed.set(src, prev);
    return extract(name, body.intersect(solid), [src]);
  };
  const add = (p: Part | null) => {
    if (p) parts.push(p);
  };
  const addMerged = (name: string, ps: (Part | null)[]) => add(mergeParts(name, ps));

  const side = (poly: Poly | Poly[]) => cs(poly);
  const hi = BIGV;
  const all = sideAll();
  const L_ = planLeft();
  const R_ = planRight();
  const within = (x0: number, x1: number, w: Curve) => planWithin(x0, x1, w);

  // ── Glass (cabin source) ──────────────────────────────────────────────
  const aboveCorner = (x0: number, x1: number, dy: number) => side(band(x0, x1, (x) => cornerY(x) + dy, () => hi, 96));
  const belowCorner = (x0: number, x1: number, dy: number) => side(band(x0, x1, () => -hi, (x) => cornerY(x) - dy, 96));
  const m = s.pillar;
  add(take('windscreen', cabinId, { side: aboveCorner(s.roofF, hi, m) }));
  add(take('rear-glass', cabinId, { side: aboveCorner(-hi, s.roofR, m) }));
  {
    // Daylight opening: below the corner line, behind the slanted C-pillar,
    // with the B-pillar left as a strip of the doors.
    const d = s.dloRear;
    const yb = cabinAt((d.xBot + d.xTop) / 2).yBase;
    const ytop = cornerY(d.xTop);
    const k = (d.xTop - d.xBot) / Math.max(ytop - yb, 0.01);
    const cX = (y: number) => d.xBot + (y - yb) * k;
    const slant: Poly = [
      [cX(-2), -2], [hi, -2], [hi, 4], [cX(4), 4],
    ];
    let dlo = cs(band(-hi, hi, () => -hi, (x) => cornerY(x) - m, 160)).intersect(cs(slant));
    if (s.doors.b !== undefined) dlo = dlo.subtract(cs(rect(s.doors.b - s.bPillar, -hi, s.doors.b + s.bPillar, hi)));
    add(take('side-glass-l', cabinId, { side: dlo, plan: L_ }));
    add(take('side-glass-r', cabinId, { side: dlo, plan: R_ }));
  }
  add(take('roof', cabinId, { side: side(band(s.roofR, s.roofF, (x) => cornerY(x) - m, () => hi, 96)) }));
  // Whatever is left of the glasshouse ahead of the roof is the A-pillar band.
  add(take('a-pillar-l', cabinId, { side: side(rect(s.roofF, -hi, hi, hi)), plan: L_ }));
  add(take('a-pillar-r', cabinId, { side: side(rect(s.roofF, -hi, hi, hi)), plan: R_ }));

  // ── Lights & grille (lower source) ────────────────────────────────────
  const h = s.head;
  const headSide = side(band(L - h.depth, L + 1, (x) => topAt(x) - h.dyBot, (x) => topAt(x) - h.dyTop, 48));
  add(take('headlights', lowerId, { side: headSide, plan: planOutside(-hi, hi, () => h.zIn) }));
  const t = s.tail;
  const tailSide = side(band(-1, t.depth, (x) => topAt(x) - t.dyBot, (x) => topAt(x) - t.dyTop, 48));
  const tailPlan = t.zOut
    ? cs([rect(-hi, t.zIn, hi, t.zOut), rect(-hi, -t.zOut, hi, -t.zIn)])
    : planOutside(-hi, hi, () => t.zIn);
  add(take('taillights', lowerId, { side: tailSide, plan: tailPlan }));
  addMerged(
    'grille',
    s.grille.map((g) => {
      return take('grille', lowerId, { side: side(rect(L - 0.1, g.y0, L + 1, g.y1)), plan: cs(rect(-hi, -g.z, hi, g.z)) });
    }),
  );

  // ── Wheel-arch cladding (dark, non-selectable) ───────────────────────
  if (s.cladding) {
    const { CrossSection } = mf();
    const rings = axles.map((ax) => CrossSection.circle(archR + s.cladding!, 64).translate([ax, s.wheelR]));
    add(take('cladding', lowerId, { side: CrossSection.union(rings), plan: planOutside(-hi, hi, (x) => Math.max(lowerAt(x).zH - 0.3, 0.05)) }));
  }

  // ── Underbody (dark, non-selectable) ──────────────────────────────────
  // Claimed so rockers stop at the sill, but not exported: the black core's underside stands in for it.
  void take('underbody', lowerId, { side: side(band(-1, L + 1, () => -hi, (x) => lowerAt(x).yB + 0.07, 64)), plan: within(-1, L + 1, (x) => Math.max(lowerAt(x).zH - 0.2, 0.05)) });

  // ── Bumpers ───────────────────────────────────────────────────────────
  const bf = s.bumperF;
  const splitF = (x: number) => topAt(x) - bf.splitDy;
  add(take('front-bumper', lowerId, { side: side(band(bf.seamX, L - bf.nose + 0.01, () => -hi, splitF, 32)).add(side(rect(L - bf.nose, -hi, hi, hi))) }));
  const br = s.bumperR;
  add(take('rear-bumper', lowerId, { side: side(rect(-hi, -hi, br.seamX, br.splitY)) }));

  // ── Bonnet, boot ──────────────────────────────────────────────────────
  add(take('bonnet', lowerId, { side: side(rect(s.cowlX, -hi, hi, hi)), plan: within(-1, L + 1, (x) => lowerAt(x).zH * s.bonnetK) }));
  // Boot lid / tailgate: the rear deck and face above the bumper; a tailgate
  // also takes the cabin surround of the rear glass.
  add(take('boot', lowerId, { side: side(rect(-hi, br.splitY, s.boot.x, hi)), plan: within(-1, L + 1, (x) => Math.max(lowerAt(x).zH * s.boot.k, 0.05)) }));
  let bootCabin: Part | null = null;
  if (s.boot.kind === 'tailgate') {
    bootCabin = take('boot', cabinId, { side: side(rect(-hi, -hi, s.roofR, hi)), plan: within(-1, L + 1, (x) => Math.max(cabinAt(clamp(x, c.x0, c.x1)).zH * 0.86, 0.05)) });
  }

  // ── Rockers ───────────────────────────────────────────────────────────
  const archFront = (ax: number) => ax + archR;
  const archRear = (ax: number) => ax - archR;
  const rk = side(rect(archRear(s.frontAxle) - 0.02, -hi, archFront(s.rearAxle) + 0.02, s.rockerY));
  add(take('rocker-l', lowerId, { side: rk, plan: L_ }));
  add(take('rocker-r', lowerId, { side: rk, plan: R_ }));

  // ── Doors, fenders, quarters (lower + cabin sources) ─────────────────
  const dr = s.doors;
  const doorSpans: [string, number, number][] = dr.b !== undefined
    ? [['door-f', dr.b, dr.front], ['door-r', dr.rear, dr.b]]
    : [['door-f', dr.rear, dr.front]];
  for (const [nm, x0, x1] of doorSpans) {
    for (const [sfx, plan] of [['l', L_], ['r', R_]] as const) {
      const id = `${nm}${sfx}`;
      const reg: Region = { side: side(rect(x0, -hi, x1, hi)), plan };
      addMerged(id, [take(id, lowerId, reg), take(id, cabinId, reg)]);
    }
  }
  for (const [sfx, plan] of [['l', L_], ['r', R_]] as const) {
    add(take(`fender-${sfx}`, lowerId, { side: side(rect(dr.front, -hi, hi, hi)), plan }));
    const reg: Region = { side: side(rect(-hi, -hi, dr.rear, hi)), plan };
    addMerged(`quarter-${sfx}`, [take(`quarter-${sfx}`, lowerId, reg), take(`quarter-${sfx}`, cabinId, reg)]);
  }
  if (bootCabin) addMerged('boot', [parts.splice(parts.findIndex((p) => p.name === 'boot'), 1)[0], bootCabin]);

  // Anything unclaimed (should be tiny) becomes dark trim.
  addMerged('trim', [take('trim', lowerId, { side: all }), take('trim', cabinId, { side: all })]);

  // Arch liners and bed tub: the cutter faces left in the body.
  add(extract('arch-liners', body, [archId]));
  if (bedIds.length) add(extract('bed-liner', body, bedIds));

  // ── Core: dark inset body seen through the shut lines ─────────────────
  {
    let core = lowerLoft(0.014, 30, 36).asOriginal();
    const coreId = core.originalID();
    core = core.subtract(archCutter(0.014));
    const bc = bedCutter(0.014);
    if (bc) core = core.subtract(bc);
    const withN = core.calculateNormals(0, 50);
    // Inside the glasshouse the core is the dashboard / door-trim level seen
    // through the glass: give it the interior colour instead of shut-line black.
    const cabinFoot = regionSolid(
      { side: side(rect(c.x0 - 0.05, -hi, c.x1 + 0.05, hi)), plan: within(c.x0 - 0.05, c.x1 + 0.05, (x) => Math.max(cabinAt(clamp(x, c.x0, c.x1)).zH - 0.01, 0.02)) },
      0,
    );
    add(extract('core', withN.subtract(cabinFoot), [coreId]));
    add(extract('interior-floor', withN.intersect(cabinFoot), [coreId]));
  }
  // ── Headliner: the inside of the glasshouse, seen through the glass ──
  {
    const liner = cabinLoft(0.03, 28, 24).asOriginal();
    const linerId = liner.originalID();
    const cut = liner.subtract(lowerLoft(0.01, 30, 36)).calculateNormals(0, 50);
    add(extract('interior', cut, [linerId], true));
  }
  // ── Seats (tops of the backrests show above the belt) ─────────────────
  {
    const seats: M[] = [];
    for (const st of s.seats) {
      const x = st.x;
      const y0 = surfY(x, st.z) - 0.2;
      const back = Manifold.hull([
        Manifold.sphere(0.05, 12).scale([1, 1, st.w / 0.1]).translate([x, y0, st.z]),
        Manifold.sphere(0.05, 12).scale([1, 1, st.w / 0.1]).translate([x - 0.08, y0 + 0.36, st.z]),
      ]);
      seats.push(back);
      for (const hz of st.w > 0.4 ? [-st.w * 0.6, st.w * 0.6] : [0]) {
        seats.push(Manifold.sphere(0.06, 12).scale([0.75, 0.8, 1.6]).translate([x - 0.1, y0 + 0.47, st.z + hz]));
      }
    }
    add(whole('seats', Manifold.union(seats), 40));
  }

  // ── Mirrors ───────────────────────────────────────────────────────────
  {
    const mx = s.mirror.x;
    const zc = cabinAt(mx).zH;
    const yb = cabinAt(mx).yBase;
    for (const [sfx, sg] of [['l', -1], ['r', 1]] as const) {
      const housing = Manifold.hull([
        Manifold.sphere(0.06, 20).scale([1.1, 0.95, 1.9]).translate([mx - 0.1, yb + 0.1, sg * (zc + 0.13)]),
        Manifold.sphere(0.04, 16).scale([0.8, 1, 1]).translate([mx - 0.04, yb + 0.1, sg * (zc + 0.03)]),
      ]);
      const stalk = Manifold.hull([
        Manifold.sphere(0.03, 12).scale([2.4, 0.8, 1]).translate([mx + 0.0, yb + 0.02, sg * (zc - 0.03)]),
        Manifold.sphere(0.025, 12).scale([1.6, 1, 1]).translate([mx - 0.05, yb + 0.08, sg * (zc + 0.04)]),
      ]);
      add(whole(`mirror-${sfx}`, housing.add(stalk), 60));
    }
  }

  // ── Spoiler ───────────────────────────────────────────────────────────
  // Clip the spoiler to the body's plan outline so it never overhangs the rounded corners.
  const spoilerClip = regionSolid({ side: all, plan: within(-1, L + 1, (x) => Math.max(lowerAt(x).zH - 0.015, 0.05)) }, 0);
  add(whole('spoiler', spoiler(s, topAt, lowerAt, cabinAt, roof).intersect(spoilerClip), 55));

  // ── Wheel (one, instanced) ────────────────────────────────────────────
  const wheel = buildWheel(s);
  const centres: [number, number, number][] = [];
  for (const ax of axles) {
    const zc = half(ax) - 0.035 - s.tyreW / 2;
    centres.push([ax - L / 2, s.wheelR, zc], [ax - L / 2, s.wheelR, -zc]);
  }

  // Recentre on x.
  for (const p of parts) for (let i = 0; i < p.positions.length; i += 3) p.positions[i] -= L / 2;
  const min: [number, number, number] = [Infinity, Infinity, Infinity];
  const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (const p of parts) {
    for (let i = 0; i < p.positions.length; i += 3) {
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], p.positions[i + k]);
        max[k] = Math.max(max[k], p.positions[i + k]);
      }
    }
  }
  return { parts, wheel: { ...wheel, centres }, bounds: { min, max } };
}


function spoiler(
  s: CarSpec,
  topAt: (x: number) => number,
  lowerAt: (x: number) => { zH: number },
  cabinAt: (x: number) => { zH: number; yRoof: number },
  roof: Curve,
): M {
  const { Manifold, CrossSection } = mf();
  const round2 = (poly: Poly, r: number) => cs(poly).offset(-r, 'Round', 2, 16).offset(r, 'Round', 2, 16);
  const extrudeZ = (sec: CS, w: number) => sec.extrude(w * 2, 0, 0, [1, 1], true);
  // Round the tips in plan view: intersect with a rounded rectangle (x, z) extruded vertically.
  const endsRounded = (solid: M, x0: number, x1: number, w: number, r: number) =>
    solid.intersect(
      CrossSection.square([x1 - x0, w * 2]).translate([x0, -w]).offset(-r, 'Round', 2, 24).offset(r, 'Round', 2, 24)
        .extrude(8, 0, 0, [1, 1], true).rotate([90, 0, 0]),
    );
  if (s.spoiler === 'lip') {
    const x0 = 0.05;
    const x1 = 0.3;
    const y = topAt(0.16);
    const sec = round2([[x0, y - 0.03], [x1, y - 0.03], [x1, y - 0.005], [x0 + 0.02, y + 0.035], [x0, y + 0.03]], 0.01);
    const w = lowerAt(0.14).zH * 0.8;
    return endsRounded(extrudeZ(sec, w), x0, x1, w, 0.06);
  }
  if (s.spoiler === 'wing') {
    const xc = 0.3;
    const y = topAt(xc) + 0.2;
    const w = lowerAt(xc).zH * 0.84;
    const blade = round2([[xc - 0.2, y], [xc + 0.12, y + 0.015], [xc + 0.14, y + 0.04], [xc - 0.18, y + 0.055], [xc - 0.22, y + 0.03]], 0.012);
    let wing = endsRounded(extrudeZ(blade, w), xc - 0.3, xc + 0.2, w, 0.05);
    for (const zs of [-1, 1]) {
      const post = round2([[xc - 0.05, topAt(xc) - 0.05], [xc + 0.07, topAt(xc) - 0.05], [xc + 0.02, y + 0.02], [xc - 0.08, y + 0.02]], 0.01)
        .extrude(0.03, 0, 0, [1, 1], true)
        .translate([0, 0, zs * w * 0.62]);
      wing = wing.add(post);
    }
    return wing;
  }
  if (s.spoiler === 'roof') {
    // A short roof spoiler over the tailgate glass, sitting on the roof's rear edge.
    const xr = s.roofR + 0.02;
    const y = roof(xr + 0.12);
    const w = cabinAt(xr + 0.2).zH * 0.8;
    const sec = round2([[xr - 0.2, y - 0.035], [xr + 0.26, y - 0.02], [xr + 0.26, y + 0.012], [xr - 0.18, y + 0.0]], 0.01);
    return endsRounded(extrudeZ(sec, w), xr - 0.25, xr + 0.3, w, 0.08);
  }
  // 'cap': a lip along the top of the pickup tailgate.
  const x0 = 0.0;
  const y = topAt(0.05);
  const w = lowerAt(0.05).zH * 0.94;
  const sec = round2([[x0 - 0.01, y - 0.02], [x0 + 0.1, y - 0.02], [x0 + 0.1, y + 0.03], [x0 - 0.01, y + 0.04]], 0.01);
  return endsRounded(extrudeZ(sec, w), x0 - 0.05, x0 + 0.15, w, 0.04);
}

function buildWheel(s: CarSpec): { tyre: Part; rim: Part } {
  const { Manifold, CrossSection } = mf();
  const R = s.wheelR;
  const r = s.rimR;
  const w = s.tyreW;
  // Tyre: rounded rectangle (radius × width) revolved around the axle (z).
  const round = Math.min(0.045, (R - r) * 0.4);
  const prof = CrossSection.square([R - r + 0.01, w])
    .translate([r - 0.01, -w / 2])
    .offset(-round, 'Round', 2, 16)
    .offset(round, 'Round', 2, 16);
  const tyre = prof.revolve(44).subtract(Manifold.cylinder(w + 0.1, r - 0.012, r - 0.012, 40, true));
  // Rim: dished disc with five spokes, outer face at +z.
  const face = w / 2 - 0.012;
  let rim = Manifold.cylinder(w - 0.03, r, r, 48, true);
  rim = rim.subtract(Manifold.cylinder(0.04, r - 0.022, r - 0.022, 48).translate([0, 0, face - 0.03]));
  rim = rim.add(Manifold.cylinder(0.03, r - 0.022, r * 0.36, 48).translate([0, 0, face - 0.045]));
  // spokes: cut five windows through the dish
  const win = CrossSection.circle(r * 0.26, 24).scale([1, 1.15]).translate([0, r * 0.56]);
  const windows: M[] = [];
  for (let i = 0; i < 5; i++) windows.push(win.rotate(i * 72 + 36).extrude(0.2).translate([0, 0, face - 0.12]));
  rim = rim.subtract(Manifold.union(windows));
  rim = rim.subtract(Manifold.cylinder(w, r - 0.04, r - 0.04, 40).translate([0, 0, -w / 2 - 0.02 - 0.04]));
  rim = rim.add(Manifold.cylinder(0.02, r * 0.14, r * 0.12, 24).translate([0, 0, face - 0.02]));
  return { tyre: whole('tyre', tyre, 40), rim: whole('rim', rim, 40) };
}
