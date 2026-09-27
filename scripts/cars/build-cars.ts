/**
 * Build the quote-flow car models: `bun scripts/cars/build-cars.ts [body…]`
 * (or `bun run build:cars`). Writes public/models/cars/<body>.glb.
 *
 * Runs Manifold (WASM) at build time only. Not part of the main build: the
 * GLBs are committed, so Cloudflare never has to run this.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildCar } from './car';
import { writeGlb } from './glb';
import { initManifold } from './lib';
import { specs } from './specs';

const outDir = fileURLToPath(new URL('../../public/models/cars/', import.meta.url));
mkdirSync(outDir, { recursive: true });
await initManifold();

const only = process.argv.slice(2);
for (const spec of specs) {
  if (only.length && !only.includes(spec.id)) continue;
  const t0 = performance.now();
  const car = buildCar(spec);
  const tris = car.parts.reduce((n, p) => n + p.indices.length / 3, 0) + 4 * (car.wheel.tyre.indices.length + car.wheel.rim.indices.length) / 3;
  const verts = car.parts.reduce((n, p) => n + p.positions.length / 3, 0);
  const size = await writeGlb(car, join(outDir, `${spec.id}.glb`), {
    body: spec.id,
    wheelbase: +(spec.frontAxle - spec.rearAxle).toFixed(3),
    bounds: car.bounds,
  });
  const names = car.parts.map((p) => `${p.name}:${p.indices.length / 3}`);
  console.log(
    `${spec.id}.glb  ${(size / 1024).toFixed(1)} KB  ${tris} tris  ${verts} verts  ${(performance.now() - t0).toFixed(0)} ms\n  ${names.join(', ')}\n  wheel (x4): tyre ${car.wheel.tyre.indices.length / 3}, rim ${car.wheel.rim.indices.length / 3}`,
  );
}
