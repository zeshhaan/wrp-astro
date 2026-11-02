/**
 * Writes data/image-sizes.json: the pixel size of every responsive photo in
 * /public (each image that has a -480w.webp variant), keyed by its base path,
 * e.g. "/ppf/range-rover": [480, 480].
 *
 * Pages that lay photos out by their shape (the portfolio masonry) read it to
 * set each <img>'s width and height, so the grid is placed right before the
 * photos load. The build runs this after optimize-images.mjs, so the shipped
 * file always matches /public; run it by hand after adding photos in dev:
 *
 *   node scripts/image-sizes.mjs
 */
import sharp from 'sharp';
import { readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = 'public';
const OUT = 'data/image-sizes.json';

async function* walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(path);
    else if (entry.name.endsWith('-480w.webp')) yield path;
  }
}

const sizes = {};
for await (const file of walk(ROOT)) {
  const { width, height } = await sharp(file).metadata();
  if (!width || !height) continue;
  const base = file.slice(ROOT.length).replaceAll('\\', '/').replace(/-480w\.webp$/, '');
  sizes[base] = [width, height];
}

const sorted = Object.fromEntries(Object.entries(sizes).sort(([a], [b]) => a.localeCompare(b)));
const json = '{\n' + Object.entries(sorted).map(([k, v]) => `  ${JSON.stringify(k)}: [${v[0]}, ${v[1]}]`).join(',\n') + '\n}\n';
await writeFile(OUT, json);
console.log(`📐 ${Object.keys(sorted).length} image sizes written to ${OUT}`);
