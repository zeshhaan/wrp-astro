/**
 * Generates the Open Graph cards into public/og/ before `astro build` runs.
 *
 * A standalone Node script rather than an Astro endpoint, for two reasons the
 * earlier attempts ran into:
 *
 *   - As SSR routes the cards returned `error code: 1101` on real edge
 *     infrastructure after the first request. Each card fetched its own
 *     photograph over HTTP, which with `global_fetch_strictly_public` is a
 *     self-referential subrequest back through the same Worker, on top of WASM
 *     rasterisation inside a 128MB isolate.
 *   - As prerendered Astro endpoints the build fails outright with
 *     `WebAssembly.Module(): Wasm code generation disallowed by embedder`,
 *     because @astrojs/cloudflare prerenders inside workerd, not Node, and
 *     workerd blocks dynamic WASM compilation.
 *
 * Plain Node has neither restriction. There are seven cards, all from static
 * content, so generating them once per build costs nothing at runtime and the
 * output is served as ordinary static assets.
 *
 * Sits alongside generate-llms.mjs and optimize-images.mjs in the same
 * pre-build slot.
 */
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { parse as parseYaml } from 'yaml';
import { createOgCard } from '../src/lib/og.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = join(ROOT, 'public');
const OUT = join(PUBLIC, 'og');

/** Read a card's background photo off disk as a data URI. No network. */
async function photoDataUri(publicPath) {
  try {
    const buf = await readFile(join(PUBLIC, publicPath.replace(/^\//, '')));
    const ext = publicPath.split('.').pop()?.toLowerCase();
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch (error) {
    console.warn(`  ! could not read ${publicPath}: ${error.message}`);
    return undefined;
  }
}

function frontmatter(source) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return match ? parseYaml(match[1]) : {};
}

/**
 * The renderer emits PNG, which is the wrong container for a full-bleed
 * photograph: the site card lands at ~900 KB as PNG and ~90 KB as JPEG, and
 * scrapers have to download the whole thing before they can show a preview.
 */
async function write(name, response) {
  const png = Buffer.from(await response.arrayBuffer());
  const jpg = await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
  const path = join(OUT, name);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, jpg);
  console.log(`  ✓ public/og/${name} (${Math.round(jpg.length / 1024)} KB, from ${Math.round(png.length / 1024)} KB PNG)`);
}

// 1200x675, so it covers 1200x630 with a small vertical crop and no upscaling
// (the luxury-* stock is 1024x1024 and would have to be blown up). Chosen over
// the studio shots because those contain the WRP wall sign, which collides with
// the wordmark the card draws: two lockups in one frame reads as a mistake.
const SITE_HERO = '/stek-vs-avery-hero.jpg';

await write('site.jpg', await createOgCard({
  eyebrow: 'Dubai, UAE',
  title: 'Premium Car Detailing Studio in Dubai',
  subtitle: 'Paint protection film, ceramic coating, window tinting and paint correction.',
  imageUrl: await photoDataUri(SITE_HERO),
}));

// English service entries only. Arabic pages point at these same cards because
// the text shaper cannot render Arabic (see src/lib/og.ts).
const dir = join(ROOT, 'src/content/services');
const files = (await readdir(dir)).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'));

for (const file of files) {
  const slug = file.replace(/\.mdx?$/, '');
  const d = frontmatter(await readFile(join(dir, file), 'utf8'));
  await write(`service/${slug}.jpg`, await createOgCard({
    eyebrow: d.subtitle,
    title: d.heroTitle || d.title,
    subtitle: d.heroDescription || d.description,
    imageUrl: d.heroImage ? await photoDataUri(d.heroImage) : undefined,
    badge: d.startingPrice ? `From AED ${d.startingPrice}` : undefined,
  }));
}
