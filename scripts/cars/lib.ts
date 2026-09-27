/**
 * Geometry helpers for the build-time car models.
 *
 * Everything here runs in Bun at build time (never in the browser). The car
 * bodies are lofted from parametric cross-sections into closed meshes, handed
 * to Manifold (WASM) as solids, and then cut with Manifold CSG: wheel arches,
 * pickup beds, and the panel regions that give each paint panel its own mesh.
 */
import Module from 'manifold-3d';
import type { CrossSection as CS, Manifold as M, ManifoldToplevel, Vec2, Vec3 } from 'manifold-3d';

export type { CS, M, Vec2, Vec3 };

let wasm: ManifoldToplevel | undefined;
export async function initManifold(): Promise<ManifoldToplevel> {
  if (!wasm) {
    wasm = await Module();
    wasm.setup();
  }
  return wasm;
}
export function mf(): ManifoldToplevel {
  if (!wasm) throw new Error('call initManifold() first');
  return wasm;
}

// ─── 1D curves ────────────────────────────────────────────────────────────

export type Key = readonly [number, number];
export type Curve = (x: number) => number;

/**
 * Monotone cubic (Fritsch–Carlson) interpolation through keyframes, clamped at
 * the ends. Monotone so profile lines never overshoot between keys.
 */
export function curve(keys: readonly Key[]): Curve {
  const k = [...keys].sort((a, b) => a[0] - b[0]);
  const n = k.length;
  if (n === 1) return () => k[0][1];
  const xs = k.map((p) => p[0]);
  const ys = k.map((p) => p[1]);
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]));
  const m: number[] = new Array(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i++;
    const h = xs[i + 1] - xs[i];
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h * m[i + 1]
    );
  };
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const spow = (v: number, p: number) => Math.sign(v) * Math.pow(Math.abs(v), p);

/**
 * How far an extent retreats near a rounded end: 0 far from the end, `r` at
 * the very tip, following a quarter ellipse of length `len`.
 */
export function endRetreat(dist: number, len: number, r: number): number {
  if (dist >= len) return 0;
  const u = 1 - clamp(dist / len, 0, 1);
  return r * (1 - Math.sqrt(Math.max(0, 1 - u * u)));
}

// ─── 2D rings ─────────────────────────────────────────────────────────────

/** A closed polyline in the (z, y) plane of a station. */
export type Ring = Vec2[];

/**
 * Resample a closed polyline to `n` points, spaced by arc length weighted
 * towards curvature so tight corners keep their shape at low counts.
 */
export function resampleRing(pts: Ring, n: number, curvatureWeight = 0.6): Ring {
  const m = pts.length;
  const w: number[] = [];
  let total = 0;
  for (let i = 0; i < m; i++) {
    const a = pts[(i - 1 + m) % m];
    const b = pts[i];
    const c = pts[(i + 1) % m];
    const len = Math.hypot(c[0] - b[0], c[1] - b[1]);
    const ang = Math.abs(
      Math.atan2(
        (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]),
        (b[0] - a[0]) * (c[0] - b[0]) + (b[1] - a[1]) * (c[1] - b[1]),
      ),
    );
    const seg = len * (1 - curvatureWeight) + ang * curvatureWeight * 0.05;
    w.push(seg);
    total += seg;
  }
  const out: Ring = [];
  let acc = 0;
  let i = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total;
    while (acc + w[i] < target && i < m - 1) {
      acc += w[i];
      i++;
    }
    const t = w[i] > 0 ? (target - acc) / w[i] : 0;
    const b = pts[i];
    const c = pts[(i + 1) % m];
    out.push([lerp(b[0], c[0], t), lerp(b[1], c[1], t)]);
  }
  return out;
}

/**
 * Car-body section: a superellipse whose widest point (the shoulder) sits at
 * `yMid`, with separate exponents above and below. Starts at the bottom centre
 * and runs counter-clockwise when viewed from the front (+x).
 */
export function bodySection(zHalf: number, yBot: number, yMid: number, yTop: number, nTop: number, nBot: number, dense = 160): Ring {
  const pts: Ring = [];
  for (let i = 0; i < dense; i++) {
    const t = -Math.PI / 2 + (i / dense) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const top = s >= 0;
    const n = top ? nTop : nBot;
    const z = zHalf * spow(c, 2 / n);
    const y = top ? yMid + (yTop - yMid) * spow(s, 2 / n) : yMid + (yMid - yBot) * spow(s, 2 / n);
    pts.push([z, y]);
  }
  return pts;
}

/**
 * Glasshouse section: vertical sides from `yLow` (buried inside the lower
 * body) up to `yBase`, then a superellipse crown to `yRoof`, narrowed towards
 * the top by `tumble` (fraction of half-width lost per metre of height).
 */
export function cabinSection(zHalf: number, yLow: number, yBase: number, yRoof: number, n: number, tumble: number, dense = 140): Ring {
  const h = Math.max(yRoof - yBase, 0.004);
  const pts: Ring = [];
  const nb = Math.round(dense * 0.3);
  const nt = dense - 2 * nb;
  // bottom centre → bottom right → up right side
  for (let i = 0; i < nb; i++) {
    const u = i / nb;
    if (u < 0.5) pts.push([zHalf * (u * 2), yLow]);
    else pts.push([zHalf, lerp(yLow, yBase, (u - 0.5) * 2)]);
  }
  // crown, right → left
  for (let i = 0; i <= nt; i++) {
    const t = (i / nt) * Math.PI;
    const y = yBase + h * spow(Math.sin(t), 2 / n);
    const narrow = 1 - tumble * (y - yBase);
    pts.push([zHalf * spow(Math.cos(t), 2 / n) * narrow, y]);
  }
  // down left side → bottom centre
  for (let i = 1; i < nb; i++) {
    const u = i / nb;
    if (u < 0.5) pts.push([-zHalf, lerp(yBase, yLow, u * 2)]);
    else pts.push([-zHalf * (1 - (u - 0.5) * 2), yLow]);
  }
  return pts;
}

/** Height of the crown curve of cabinSection at ring angle t (0 = side, π/2 = top). */
export function superY(yBase: number, yRoof: number, n: number, t: number) {
  return yBase + Math.max(yRoof - yBase, 0.004) * Math.pow(Math.sin(t), 2 / n);
}

// ─── Loft ─────────────────────────────────────────────────────────────────

/** Station x positions, denser towards both ends where the body rounds off. */
export function stations(x0: number, x1: number, count: number, endBias = 0.55): number[] {
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    const u = i / (count - 1);
    const c = (1 - Math.cos(Math.PI * u)) / 2;
    out.push(x0 + (x1 - x0) * lerp(u, c, endBias));
  }
  return out;
}

/**
 * Loft rings (all with the same point count) placed at x stations into a
 * closed, outward-facing Manifold solid. The ends are capped with a fan.
 */
export function loft(xs: number[], rings: Ring[]): M {
  const { Manifold, Mesh } = mf();
  const S = xs.length;
  const N = rings[0].length;
  const verts: number[] = [];
  for (let s = 0; s < S; s++) for (const [z, y] of rings[s]) verts.push(xs[s], y, z);
  const capA = S * N;
  const capB = capA + 1;
  const centroid = (r: Ring) => r.reduce((a, p) => [a[0] + p[0] / r.length, a[1] + p[1] / r.length], [0, 0]);
  const ca = centroid(rings[0]);
  const cb = centroid(rings[S - 1]);
  verts.push(xs[0], ca[1], ca[0], xs[S - 1], cb[1], cb[0]);
  const tris: number[] = [];
  for (let s = 0; s < S - 1; s++) {
    for (let i = 0; i < N; i++) {
      const a = s * N + i;
      const b = s * N + ((i + 1) % N);
      const c = (s + 1) * N + ((i + 1) % N);
      const d = (s + 1) * N + i;
      tris.push(a, b, c, a, c, d);
    }
  }
  for (let i = 0; i < N; i++) {
    tris.push(capA, (i + 1) % N, i);
    tris.push(capB, (S - 1) * N + i, (S - 1) * N + ((i + 1) % N));
  }
  // Orient outward: flip if the signed volume is negative.
  let vol = 0;
  for (let t = 0; t < tris.length; t += 3) {
    const p = (k: number) => [verts[k * 3], verts[k * 3 + 1], verts[k * 3 + 2]];
    const [a, b, c] = [p(tris[t]), p(tris[t + 1]), p(tris[t + 2])];
    vol += a[0] * (b[1] * c[2] - b[2] * c[1]) - a[1] * (b[0] * c[2] - b[2] * c[0]) + a[2] * (b[0] * c[1] - b[1] * c[0]);
  }
  if (vol < 0) for (let t = 0; t < tris.length; t += 3) [tris[t + 1], tris[t + 2]] = [tris[t + 2], tris[t + 1]];
  const mesh = new Mesh({ numProp: 3, vertProperties: new Float32Array(verts), triVerts: new Uint32Array(tris) });
  mesh.merge();
  const out = new Manifold(mesh);
  if (out.status() !== 'NoError') throw new Error('loft is not manifold: ' + out.status());
  return out;
}

// ─── Regions (extruded 2D shapes used as CSG cutters) ─────────────────────

export type Poly = Vec2[];

function ccw(p: Poly): Poly {
  let a = 0;
  for (let i = 0; i < p.length; i++) {
    const [x0, y0] = p[i];
    const [x1, y1] = p[(i + 1) % p.length];
    a += x0 * y1 - x1 * y0;
  }
  return a < 0 ? [...p].reverse() : p;
}

export function cs(polys: Poly | Poly[]): CS {
  const list = (Array.isArray(polys[0]?.[0]) ? polys : [polys]) as Poly[];
  return new (mf().CrossSection)(list.map(ccw), 'Positive');
}

export function rect(x0: number, y0: number, x1: number, y1: number): Poly {
  return [
    [Math.min(x0, x1), Math.min(y0, y1)],
    [Math.max(x0, x1), Math.min(y0, y1)],
    [Math.max(x0, x1), Math.max(y0, y1)],
    [Math.min(x0, x1), Math.max(y0, y1)],
  ];
}

/** Polygon between two curves y = lo(x) and y = hi(x), for x in [x0, x1]. */
export function band(x0: number, x1: number, lo: Curve, hi: Curve, steps = 48): Poly {
  const top: Poly = [];
  const bot: Poly = [];
  for (let i = 0; i <= steps; i++) {
    const x = lerp(x0, x1, i / steps);
    top.push([x, hi(x)]);
    bot.push([x, lo(x)]);
  }
  return [...bot, ...top.reverse()];
}

const BIG = 20;

/**
 * A panel region: the intersection of a side-view shape (x, y) extruded across
 * the car, and an optional plan-view shape (x, z) extruded vertically.
 */
export interface Region {
  side: CS;
  plan?: CS;
}

export function regionSolid(r: Region, grow: number): M {
  const g = (c: CS) => (grow === 0 ? c : c.offset(grow, 'Miter', 4));
  let solid = g(r.side).extrude(BIG * 2, 0, 0, [1, 1], true);
  if (r.plan) {
    // plan (u = x, v = z) extruded along w → rotate so v becomes world z.
    const p = g(r.plan).extrude(BIG * 2, 0, 0, [1, 1], true).rotate([90, 0, 0]);
    // rotate([90,0,0]) maps (u, v, w) → (u, -w, v): world z = v as intended.
    solid = solid.intersect(p);
  }
  return solid;
}

/** Plan-view helpers (x, z). */
export const planLeft = (): CS => cs(rect(-BIG, -BIG, BIG, 0));
export const planRight = (): CS => cs(rect(-BIG, 0, BIG, BIG));
export const sideAll = (): CS => cs(rect(-BIG, -BIG, BIG, BIG));
export const sideRect = (x0: number, y0: number, x1: number, y1: number) => cs(rect(x0, y0, x1, y1));
export const BIGV = BIG;

/** Plan polygon |z| < w(x) for x in [x0, x1]. */
export function planWithin(x0: number, x1: number, w: Curve, steps = 48): CS {
  return cs(band(x0, x1, (x) => -w(x), w, steps));
}
/** Plan polygon |z| > w(x) (both sides) for x in [x0, x1]. */
export function planOutside(x0: number, x1: number, w: Curve, steps = 48): CS {
  return cs([band(x0, x1, w, () => BIG, steps), band(x0, x1, () => -BIG, (x) => -w(x), steps)]);
}

// ─── Mesh extraction ──────────────────────────────────────────────────────

export interface Part {
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
}

/**
 * Pull the triangles of `solid` that came from one of `ids` (Manifold keeps
 * the original mesh id of every triangle through booleans) into a compact
 * indexed part with normals read from property channels 3..5.
 */
export function extract(name: string, solid: M, ids: number[], flip = false): Part | null {
  const mesh = solid.getMesh();
  const np = mesh.numProp;
  const runIndex = mesh.runIndex;
  const runIds = mesh.runOriginalID;
  const remap = new Map<number, number>();
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  for (let r = 0; r < runIds.length; r++) {
    if (!ids.includes(runIds[r])) continue;
    for (let t = runIndex[r]; t < runIndex[r + 1]; t += 3) {
      const tri = [mesh.triVerts[t], mesh.triVerts[t + 1], mesh.triVerts[t + 2]];
      if (flip) [tri[1], tri[2]] = [tri[2], tri[1]];
      for (const v of tri) {
        let k = remap.get(v);
        if (k === undefined) {
          k = pos.length / 3;
          remap.set(v, k);
          pos.push(mesh.vertProperties[v * np], mesh.vertProperties[v * np + 1], mesh.vertProperties[v * np + 2]);
          if (np >= 6) {
            const s = flip ? -1 : 1;
            nor.push(s * mesh.vertProperties[v * np + 3], s * mesh.vertProperties[v * np + 4], s * mesh.vertProperties[v * np + 5]);
          } else nor.push(0, 0, 0);
        }
        idx.push(k);
      }
    }
  }
  if (idx.length === 0) return null;
  return { name, positions: new Float32Array(pos), normals: new Float32Array(nor), indices: new Uint32Array(idx) };
}

/** Whole solid as a part (all triangles), normals computed with a sharp-edge angle. */
export function whole(name: string, solid: M, sharp = 50): Part {
  const s = solid.asOriginal().calculateNormals(0, sharp);
  const p = extract(name, s, [s.originalID()]);
  if (!p) throw new Error('empty part ' + name);
  return p;
}

export function mergeParts(name: string, parts: (Part | null)[]): Part | null {
  const ps = parts.filter((p): p is Part => !!p);
  if (!ps.length) return null;
  let nv = 0;
  let ni = 0;
  for (const p of ps) {
    nv += p.positions.length;
    ni += p.indices.length;
  }
  const positions = new Float32Array(nv);
  const normals = new Float32Array(nv);
  const indices = new Uint32Array(ni);
  let ov = 0;
  let oi = 0;
  for (const p of ps) {
    positions.set(p.positions, ov);
    normals.set(p.normals, ov);
    for (let i = 0; i < p.indices.length; i++) indices[oi + i] = p.indices[i] + ov / 3;
    ov += p.positions.length;
    oi += p.indices.length;
  }
  return { name, positions, normals, indices };
}
