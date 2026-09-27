/**
 * Write a built car to GLB with @gltf-transform (a dependency of manifold-3d).
 * One node per part, named by panel / glass id; wheels share one tyre mesh and
 * one rim mesh across four nodes. Geometry is quantized and meshopt-compressed
 * (EXT_meshopt_compression); the viewer registers three's MeshoptDecoder.
 */
import { writeFileSync } from 'node:fs';
import { Document, Logger, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { meshopt, reorder } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import type { BuiltCar } from './car';
import type { Part } from './lib';

export async function writeGlb(car: BuiltCar, file: string, extras: Record<string, unknown>): Promise<number> {
  const doc = new Document().setLogger(new Logger(Logger.Verbosity.WARN));
  const buffer = doc.createBuffer();
  const scene = doc.createScene('car');
  const root = doc.createNode('car').setExtras(extras);
  scene.addChild(root);

  const meshOf = (p: Part) => {
    const pos = doc.createAccessor().setType('VEC3').setArray(new Float32Array(p.positions)).setBuffer(buffer);
    const nor = doc.createAccessor().setType('VEC3').setArray(normalize(p.normals)).setBuffer(buffer);
    const idx = doc
      .createAccessor()
      .setType('SCALAR')
      .setArray(p.positions.length / 3 < 65535 ? new Uint16Array(p.indices) : new Uint32Array(p.indices))
      .setBuffer(buffer);
    const prim = doc.createPrimitive().setAttribute('POSITION', pos).setAttribute('NORMAL', nor).setIndices(idx);
    return doc.createMesh(`${p.name}-geo`).addPrimitive(prim);
  };

  for (const p of car.parts) root.addChild(doc.createNode(p.name).setMesh(meshOf(p)).setExtras({ part: p.name }));

  const tyre = meshOf(car.wheel.tyre);
  const rim = meshOf(car.wheel.rim);
  car.wheel.centres.forEach((c, i) => {
    const left = c[2] < 0;
    // Wheels are built with the outer face at +z; turn left-side wheels round.
    const rot: [number, number, number, number] = left ? [0, 1, 0, 0] : [0, 0, 0, 1];
    const wheel = doc.createNode(`wheel-${i}`).setTranslation(c).setRotation(rot);
    wheel.addChild(doc.createNode(`tyre-${i}`).setMesh(tyre).setExtras({ part: 'tyre' }));
    wheel.addChild(doc.createNode(`rim-${i}`).setMesh(rim).setExtras({ part: 'rim' }));
    root.addChild(wheel);
  });

  await MeshoptEncoder.ready;
  await doc.transform(
    reorder({ encoder: MeshoptEncoder }),
    meshopt({ encoder: MeshoptEncoder, level: 'high', quantizePosition: 14, quantizeNormal: 8, quantizationVolume: 'mesh' }),
  );
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const bin = await io.writeBinary(doc);
  writeFileSync(file, bin);
  return bin.byteLength;
}

function normalize(n: Float32Array): Float32Array<ArrayBuffer> {
  const out = new Float32Array(n.length);
  for (let i = 0; i < n.length; i += 3) {
    const l = Math.hypot(n[i], n[i + 1], n[i + 2]) || 1;
    out[i] = n[i] / l;
    out[i + 1] = n[i + 1] / l;
    out[i + 2] = n[i + 2] / l;
    if (l === 1 && n[i] === 0 && n[i + 1] === 0 && n[i + 2] === 0) out[i + 1] = 1;
  }
  return out;
}
