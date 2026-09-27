/**
 * Import "Generic passenger car pack" by Comrade1280 (CC BY 4.0,
 * https://skfb.ly/6sUFy) for the quote viewer: `bun scripts/cars/import-pack.ts`.
 * Writes public/models/cars/pack/<body>.glb in the same shape as the Manifold
 * models (one node per panel / glass id, extras.part), so CarViewer3D can load
 * either set.
 *
 * Each body in the pack is one textured mesh. We bake it upright with the nose
 * at +x and the car's left at -z, then split the triangles into panels by
 * position relative to the wheels and glass, by face normal, and by texture
 * colour (dark texels are black trim; red lamp texels are taillights).
 * Source: assets-src/comrade1280/ (not served).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Document, Logger, NodeIO, type Node, type Primitive, type Texture } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import type { BodyType } from '../../src/designs/studio/quote/panels';

const SRC = fileURLToPath(new URL('../../assets-src/comrade1280/generic-passenger-car-pack.glb', import.meta.url));
const OUT = fileURLToPath(new URL('../../public/models/cars/pack/', import.meta.url));

/** Which pack body stands in for each of our body types, and how many side doors it has. */
const pick: Record<BodyType, { node: string; doors: 2 | 4 }> = {
  sedan: { node: 'Sedan Body', doors: 4 },
  coupe: { node: 'Sport body', doors: 2 },
  suv: { node: 'SUV Body', doors: 4 },
  pickup: { node: 'Pickup Body', doors: 4 },
};

type V3 = [number, number, number];
interface Tri {
  p: [V3, V3, V3];
  n: [V3, V3, V3];
  c: V3; // centroid
  f: V3; // face normal
  rgb: V3; // texture colour at the centroid, 0–1
  lmax: number; // brightest luma sampled across the triangle
}

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
const src = await io.read(SRC);
const nodes = src.getRoot().listNodes();

const texCache = new Map<Texture, Promise<{ w: number; h: number; px: Buffer }>>();
function pixels(t: Texture) {
  let p = texCache.get(t);
  if (!p) {
    p = sharp(Buffer.from(t.getImage()!))
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => ({ w: info.width, h: info.height, px: data }));
    texCache.set(t, p);
  }
  return p;
}

/** World-space triangles of one primitive, with texture colour sampled at each centroid. */
async function trianglesOf(node: Node, prim: Primitive): Promise<Tri[]> {
  const m = node.getWorldMatrix();
  const xf = (v: number[]): V3 => [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
  ];
  const xn = (v: number[]): V3 => {
    const r: V3 = [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]];
    return norm(r);
  };
  const pos = prim.getAttribute('POSITION')!;
  const nor = prim.getAttribute('NORMAL');
  const uv = prim.getAttribute('TEXCOORD_0');
  const idx = prim.getIndices()!.getArray()!;
  const tex = prim.getMaterial()?.getBaseColorTexture();
  const img = tex ? await pixels(tex) : null;
  const tris: Tri[] = [];
  const a: number[] = [];
  for (let i = 0; i < idx.length; i += 3) {
    const p = [0, 1, 2].map((k) => xf(pos.getElement(idx[i + k], a))) as Tri['p'];
    const f = norm(cross(sub(p[1], p[0]), sub(p[2], p[0])));
    const n = [0, 1, 2].map((k) => (nor ? xn(nor.getElement(idx[i + k], a)) : f)) as Tri['n'];
    const c: V3 = [(p[0][0] + p[1][0] + p[2][0]) / 3, (p[0][1] + p[1][1] + p[2][1]) / 3, (p[0][2] + p[1][2] + p[2][2]) / 3];
    let rgb: V3 = [0.5, 0.5, 0.5];
    let lo = 0.5;
    if (img && uv) {
      const t = [0, 1, 2].map((k) => uv.getElement(idx[i + k], a).slice());
      const at = (w0: number, w1: number, w2: number): V3 => {
        const u = t[0][0] * w0 + t[1][0] * w1 + t[2][0] * w2;
        const v = t[0][1] * w0 + t[1][1] * w1 + t[2][1] * w2;
        const x = Math.min(img.w - 1, Math.max(0, Math.floor((u - Math.floor(u)) * img.w)));
        const y = Math.min(img.h - 1, Math.max(0, Math.floor((v - Math.floor(v)) * img.h)));
        const o = (y * img.w + x) * 3;
        return [img.px[o] / 255, img.px[o + 1] / 255, img.px[o + 2] / 255];
      };
      rgb = at(1 / 3, 1 / 3, 1 / 3);
      // Brightest of seven samples: a big panel triangle whose centre lands on a
      // dark shut line is still paint; only triangles dark all over are trim.
      const W = [[0.8, 0.1, 0.1], [0.1, 0.8, 0.1], [0.1, 0.1, 0.8], [0.45, 0.45, 0.1], [0.1, 0.45, 0.45], [0.45, 0.1, 0.45]];
      lo = Math.max(luma(rgb), ...W.map(([w0, w1, w2]) => luma(at(w0, w1, w2))));
    }
    tris.push({ p, n, c, f, rgb, lmax: lo });
  }
  return tris;
}

const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
function norm(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}
const luma = (c: V3) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

/** Apply a rigid transform (rotation about y, then translation) to every triangle. */
function place(tris: Tri[], rot: (v: V3) => V3, off: V3) {
  for (const t of tris) {
    t.p = t.p.map((v) => {
      const r = rot(v);
      return [r[0] - off[0], r[1] - off[1], r[2] - off[2]] as V3;
    }) as Tri['p'];
    t.n = t.n.map(rot) as Tri['n'];
    t.f = rot(t.f);
    const r = rot(t.c);
    t.c = [r[0] - off[0], r[1] - off[1], r[2] - off[2]];
  }
}

function bounds(tris: Tri[]) {
  const min: V3 = [Infinity, Infinity, Infinity];
  const max: V3 = [-Infinity, -Infinity, -Infinity];
  for (const t of tris) for (const v of t.p) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], v[k]);
    max[k] = Math.max(max[k], v[k]);
  }
  return { min, max };
}

async function importBody(body: BodyType) {
  const cfg = pick[body];
  const bodyNodes = nodes.filter((n) => n.getName().startsWith(cfg.node + '_'));
  const parts: Record<string, Tri[]> = {};
  for (const n of bodyNodes) {
    for (const prim of n.getMesh()?.listPrimitives() ?? []) {
      const mat = prim.getMaterial()?.getName() ?? '';
      const kind = mat.startsWith('Glass') ? 'glass' : mat.startsWith('Optics') ? 'optics' : 'body';
      (parts[kind] ??= []).push(...(await trianglesOf(n, prim)));
    }
  }
  const all = [...parts.body, ...(parts.glass ?? []), ...(parts.optics ?? [])];
  const bb = bounds(all);

  // Wheels: every wheel node whose centre sits inside this body's footprint.
  const wheels: Tri[][] = [];
  const centres: [number, number][] = [];
  for (const n of nodes) {
    if (!n.getName().startsWith('Wheel') || !n.getMesh()) continue;
    const wt: Tri[] = [];
    for (const prim of n.getMesh()!.listPrimitives()) wt.push(...(await trianglesOf(n, prim)));
    const w = bounds(wt);
    const cx = (w.min[0] + w.max[0]) / 2;
    const cz = (w.min[2] + w.max[2]) / 2;
    const inside = cx > bb.min[0] && cx < bb.max[0] && cz > bb.min[2] && cz < bb.max[2];
    // The pack has a few near-duplicate wheel nodes stacked on the same spot.
    if (inside && !centres.some(([x, z]) => Math.hypot(x - cx, z - cz) < 0.3)) {
      centres.push([cx, cz]);
      wheels.push(wt);
    }
  }
  if (wheels.length !== 4) throw new Error(`${body}: found ${wheels.length} wheels`);

  // Length axis = principal direction of the four wheel centres (some bodies sit
  // at an angle in the pack's scene). Then the nose (white lamps) goes to +x.
  const mx = centres.reduce((s, c) => s + c[0], 0) / 4;
  const mz = centres.reduce((s, c) => s + c[1], 0) / 4;
  let sxx = 0, sxz = 0, szz = 0;
  for (const [x, z] of centres) {
    sxx += (x - mx) ** 2;
    sxz += (x - mx) * (z - mz);
    szz += (z - mz) ** 2;
  }
  let dir: [number, number] = [Math.cos(0.5 * Math.atan2(2 * sxz, sxx - szz)), Math.sin(0.5 * Math.atan2(2 * sxz, sxx - szz))];
  const tail = (parts.optics ?? []).filter((t) => t.rgb[0] > 0.45 && t.rgb[0] > t.rgb[1] * 1.8);
  const tailSide = tail.reduce((s, t) => s + (t.c[0] - mx) * dir[0] + (t.c[2] - mz) * dir[1], 0);
  if (tailSide > 0) dir = [-dir[0], -dir[1]];
  // Rotate about +y so `dir` (in xz) lands on +x; a proper rotation keeps left at -z.
  const [dx, dz] = dir;
  const rot = (v: V3): V3 => [v[0] * dx + v[2] * dz, v[1], -v[0] * dz + v[2] * dx];
  const everything = [...all, ...wheels.flat()];
  place(everything, rot, [0, 0, 0]);
  const b2 = bounds(everything);
  const off: V3 = [(b2.min[0] + b2.max[0]) / 2, b2.min[1], (b2.min[2] + b2.max[2]) / 2];
  place(everything, (v) => v, off);

  // Landmarks.
  const wb = wheels.map((w) => bounds(w));
  const wc = wb.map((w) => [(w.min[0] + w.max[0]) / 2, (w.min[1] + w.max[1]) / 2, (w.min[2] + w.max[2]) / 2] as V3);
  const r = Math.max(...wb.map((w) => (w.max[1] - w.min[1]) / 2));
  const xF = Math.max(...wc.map((c) => c[0]));
  const xR = Math.min(...wc.map((c) => c[0]));
  const bodyB = bounds(parts.body);
  const L = bodyB.max[0] - bodyB.min[0];
  const lowerAbsZ = parts.body.filter((t) => t.c[1] < r * 2.2).map((t) => Math.abs(t.c[2])).sort((a, b) => a - b);
  const halfW = lowerAbsZ[Math.floor(lowerAbsZ.length * 0.97)];
  // Some bodies use the glass material for lamp covers too; glass below the
  // wheel tops is a lamp lens, not a window.
  const lampGlass = (parts.glass ?? []).filter((t) => t.c[1] < 2 * r + 0.08);
  const glass = (parts.glass ?? []).filter((t) => t.c[1] >= 2 * r + 0.08);
  const sideGlass = glass.filter((t) => Math.abs(t.f[2]) > 0.6);
  const yBelt = sideGlass.length ? Math.min(...sideGlass.map((t) => t.c[1])) - 0.03 : bodyB.max[1] * 0.68;
  const ws = glass.filter((t) => t.f[0] > 0.35 && t.f[1] > 0.1);
  const wsMin = ws.length ? Math.min(...ws.flatMap((t) => t.p.map((v) => v[0]))) : xF - 1.2;
  const wsMax = ws.length ? Math.max(...ws.flatMap((t) => t.p.map((v) => v[0]))) : xF - 0.5;
  const cabinGlass = glass.filter((t) => t.f[0] < 0.35);
  const cabinRear = cabinGlass.length ? Math.min(...cabinGlass.flatMap((t) => t.p.map((v) => v[0]))) - 0.12 : xR;
  const wsBaseY = ws.length ? Math.min(...ws.flatMap((t) => t.p.map((v) => v[1]))) : yBelt;
  const yBumper = wc[0][1] + r * 0.55;
  const yRocker = Math.max(r * 0.8, 0.22);
  const frontEdge = xF - r * 1.35; // front door leading edge ≈ just behind the front arch
  const rearEdge = xR + r * 1.35;
  const doorSplit = cfg.doors === 4 ? frontEdge - (frontEdge - rearEdge) * 0.5 : -Infinity;
  const isPickup = body === 'pickup';
  const bedFront = isPickup ? Math.min(...glass.filter((t) => t.f[0] < -0.35).map((t) => t.c[0])) - 0.08 : 0;

  // Black trim is judged against this body's own paint colour (the median texel).
  const lumas = parts.body.map((t) => t.lmax).sort((a, b) => a - b);
  const paintLuma = lumas[Math.floor(lumas.length / 2)];
  const darkBelow = Math.min(0.1, paintLuma * 0.45);

  const out: Record<string, Tri[]> = {};
  const put = (id: string, t: Tri) => (out[id] ??= []).push(t);

  const LR = (t: Tri, id: string) => `${id}-${t.c[2] < 0 ? 'l' : 'r'}`;

  for (const t of parts.body) {
    const [x, y, z] = t.c;
    const f = t.f;
    const az = Math.abs(z);
    const dark = t.lmax < darkBelow;
    const inward = Math.abs(f[2]) > 0.5 && Math.sign(f[2]) !== Math.sign(z) && az > 0.05;
    if (f[1] < -0.6 && y < yBumper) { put('underbody', t); continue; }
    if (dark) { put(y < r * 1.3 && (x > xF + r * 0.9 || x < xR - r * 0.9) ? 'grille' : 'trim', t); continue; }
    // Mirrors stick out past the body sides near the base of the windscreen.
    if (az > halfW + 0.015 && y > yBelt - 0.15 && y < yBelt + 0.3 && x > wsMin - 0.45 && x < wsMax + 0.1) { put(`mirror-${z < 0 ? 'l' : 'r'}`, t); continue; }
    if (inward && y > r * 1.2 && az < halfW - 0.08) { put('interior', t); continue; }
    // Low cars put the bonnet and fender tops above the side-glass line; anything
    // ahead of and below the windscreen base is front bodywork, not cabin.
    const ahead = x > wsMin && y < wsBaseY + 0.03;
    if (y > yBelt && !ahead) {
      if (f[1] < -0.4) { put('interior', t); continue; }
      if (isPickup && x < bedFront) { put(LR(t, 'quarter'), t); continue; }
      if (!isPickup && x < cabinRear) {
        if (body === 'coupe' && x < xR - r * 0.3 && y > yBelt + 0.12) put('spoiler', t);
        else if (az < halfW * 0.7 && f[1] > 0.3) put('boot', t);
        else put(LR(t, 'quarter'), t);
        continue;
      }
      if (f[1] > 0.55 && x < wsMin + 0.05) { put('roof', t); continue; }
      if (x >= wsMin - 0.15 && x < wsMax + 0.05 && az > halfW * 0.55) { put(LR(t, 'a-pillar'), t); continue; }
      if (x >= wsMax) { put('bonnet', t); continue; }
      if (az < halfW * 0.6 && f[1] > 0.3) { put(x < rearEdge ? 'boot' : 'roof', t); continue; }
      put(x < rearEdge ? LR(t, 'quarter') : LR(t, x > doorSplit ? 'door-f' : 'door-r').replace('door-f-', 'door-f').replace('door-r-', 'door-r'), t);
      continue;
    }
    // Below the beltline.
    if (x > frontEdge) {
      if (x > xF + r * 0.95 && (y < yBumper || f[0] > 0.6)) put('front-bumper', t);
      else if (f[1] > 0.5 && az < halfW * 0.72) put('bonnet', t);
      else if (f[0] > 0.75 && az < halfW * 0.72) put('front-bumper', t);
      else put(LR(t, 'fender'), t);
      continue;
    }
    if (x < rearEdge) {
      if (isPickup && az < halfW - 0.1 && y < yBelt && f[1] > 0.5) put('bed-liner', t);
      else if (isPickup && inward) put('bed-liner', t);
      else if (x < xR - r * 0.95 && (y < yBumper || f[0] < -0.6)) put('rear-bumper', t);
      else if ((f[1] > 0.5 || f[0] < -0.6) && az < halfW * 0.75) put('boot', t);
      else put(LR(t, 'quarter'), t);
      continue;
    }
    if (y < yRocker) { put(LR(t, 'rocker'), t); continue; }
    if (f[1] > 0.5 && x > wsMin - 0.1) { put('bonnet', t); continue; }
    if (f[1] > 0.6 && az < halfW * 0.8) { put('interior', t); continue; }
    put(`door-${x > doorSplit ? 'f' : 'r'}${z < 0 ? 'l' : 'r'}`, t);
  }

  for (const t of glass) {
    const id = t.f[0] > 0.35 ? 'windscreen' : t.f[0] < -0.35 ? 'rear-glass' : t.c[2] < 0 ? 'side-glass-l' : 'side-glass-r';
    put(id, t);
  }
  for (const t of [...(parts.optics ?? []), ...lampGlass]) {
    const red = t.rgb[0] > 0.45 && t.rgb[0] > t.rgb[1] * 1.8;
    put(t.c[0] > 0 ? 'headlights' : red ? 'taillights' : 'trim', t);
  }
  for (const w of wheels) for (const t of w) put(luma(t.rgb) < 0.2 ? 'tyre' : 'rim', t);
  // Tiny slivers read as noise when selected; fold them into trim.
  for (const [id, tris] of Object.entries(out)) {
    if (tris.length < 4 && id !== 'trim') {
      (out.trim ??= []).push(...tris);
      delete out[id];
    }
  }

  const size = await write(out, `${OUT}${body}.glb`, { body, source: 'Generic passenger car pack by Comrade1280 (CC BY 4.0)', length: +L.toFixed(3) });
  const summary = Object.entries(out).map(([k, v]) => `${k}:${v.length}`).join(', ');
  console.log(`${body}.glb  ${(size / 1024).toFixed(1)} KB  (${cfg.node})  ws ${wsMin.toFixed(2)}..${wsMax.toFixed(2)} base ${wsBaseY.toFixed(2)} axles ${xR.toFixed(2)}/${xF.toFixed(2)} x ${bodyB.min[0].toFixed(2)}..${bodyB.max[0].toFixed(2)} top ${bodyB.max[1].toFixed(2)}  paint luma ${paintLuma.toFixed(2)} belt ${yBelt.toFixed(2)} halfW ${halfW.toFixed(2)} r ${r.toFixed(2)}\n  ${summary}`);
}

async function write(partsById: Record<string, Tri[]>, file: string, extras: Record<string, unknown>) {
  const doc = new Document().setLogger(new Logger(Logger.Verbosity.WARN));
  const buffer = doc.createBuffer();
  const scene = doc.createScene('car');
  const root = doc.createNode('car').setExtras(extras);
  scene.addChild(root);
  for (const [id, tris] of Object.entries(partsById)) {
    const pos = new Float32Array(tris.length * 9);
    const nor = new Float32Array(tris.length * 9);
    tris.forEach((t, i) => {
      for (let k = 0; k < 3; k++) {
        pos.set(t.p[k], i * 9 + k * 3);
        nor.set(t.n[k], i * 9 + k * 3);
      }
    });
    const idx = new Uint32Array(tris.length * 3).map((_, i) => i);
    const prim = doc
      .createPrimitive()
      .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(pos).setBuffer(buffer))
      .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(nor).setBuffer(buffer))
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(idx).setBuffer(buffer));
    root.addChild(doc.createNode(id).setMesh(doc.createMesh(`${id}-geo`).addPrimitive(prim)).setExtras({ part: id }));
  }
  await MeshoptEncoder.ready;
  await doc.transform(
    reorder({ encoder: MeshoptEncoder }),
    meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 14, quantizeNormal: 8, quantizationVolume: 'mesh' }),
  );
  const outIo = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const bin = await outIo.writeBinary(doc);
  writeFileSync(file, bin);
  return bin.byteLength;
}

mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2) as BodyType[];
for (const body of Object.keys(pick) as BodyType[]) if (!only.length || only.includes(body)) await importBody(body);
