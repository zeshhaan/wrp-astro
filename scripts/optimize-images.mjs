/**
 * Image Optimization Script for WRP Detailing
 *
 * Generates responsive variants (480w, 800w, 1200w) in WebP and AVIF
 * for portfolio images, homepage hero images, review images, and upholstery images.
 *
 * Usage:
 *   node scripts/optimize-images.mjs           # only generates MISSING variants (fast)
 *   FORCE=1 node scripts/optimize-images.mjs   # re-encode everything (use after editing a source)
 *   node scripts/optimize-images.mjs --force   # same as FORCE=1
 *
 * Variants are committed to the repo, so by default this is a near no-op on CI
 * (skips anything that already exists) — keeping deploy builds fast. Original
 * files are preserved for lightbox/full-res usage.
 */

import sharp from 'sharp';
import { readdir, stat, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, parse } from 'path';

const SIZES = [
  { suffix: '480w', width: 480 },
  { suffix: '800w', width: 800 },
  { suffix: '1200w', width: 1200 },
];

const WEBP_QUALITY = 80;
const AVIF_QUALITY = 65;
const SMALL_THRESHOLD = 150 * 1024; // Skip full pipeline for images < 150KB

// Force re-encoding of variants that already exist (e.g. after replacing a source image).
const FORCE = process.argv.includes('--force') || process.env.FORCE === '1';

let totalGenerated = 0;
let totalSkipped = 0;

/**
 * Encode a single variant, skipping it if the output already exists (unless FORCE).
 * Returns true if it generated the file, false if skipped or failed.
 */
async function makeVariant(inputPath, outputPath, { format, quality, width, rotate = false }) {
  if (!FORCE && existsSync(outputPath)) {
    totalSkipped++;
    return false;
  }
  try {
    let pipe = sharp(inputPath);
    if (rotate) pipe = pipe.rotate(); // honour EXIF orientation (phone cameras)
    pipe = pipe.resize({ width, withoutEnlargement: true });
    pipe = format === 'avif' ? pipe.avif({ quality }) : pipe.webp({ quality });
    await pipe.toFile(outputPath);
    totalGenerated++;
    return true;
  } catch (err) {
    console.error(`  ❌ Failed ${outputPath}:`, err.message);
    return false;
  }
}

/**
 * Generate responsive WebP + AVIF variants for a single source image.
 */
async function optimizeImage(inputPath, outputDir, baseName, { skipWebpSizes = [], rotate = false } = {}) {
  for (const size of SIZES) {
    if (!skipWebpSizes.includes(size.suffix)) {
      await makeVariant(inputPath, join(outputDir, `${baseName}-${size.suffix}.webp`), {
        format: 'webp', quality: WEBP_QUALITY, width: size.width, rotate,
      });
    }
    await makeVariant(inputPath, join(outputDir, `${baseName}-${size.suffix}.avif`), {
      format: 'avif', quality: AVIF_QUALITY, width: size.width, rotate,
    });
  }
}

/**
 * Get image dimensions using sharp.
 */
async function getDimensions(filePath) {
  try {
    const meta = await sharp(filePath).metadata();
    return { width: meta.width, height: meta.height };
  } catch {
    return { width: 0, height: 0 };
  }
}

/**
 * Format bytes for display.
 */
function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

async function main() {
  console.log(`🖼️  WRP Image Optimization${FORCE ? ' (FORCE: re-encoding all)' : ' (skipping existing variants)'}\n`);

  // ---- 1. Portfolio Images ----
  console.log('📁 Processing portfolio images...');
  const portfolioDir = 'public/portfolio';
  const portfolioFiles = (await readdir(portfolioDir))
    .filter(f => f.endsWith('.webp') && !f.match(/-\d{3,4}w\./));

  for (const file of portfolioFiles) {
    const baseName = parse(file).name;
    const inputPath = join(portfolioDir, file);
    const inputSize = (await stat(inputPath)).size;
    console.log(`  📸 ${file} (${formatBytes(inputSize)})`);
    // For small images, skip 480w webp (source is already close)
    const skipWebpSizes = inputSize < SMALL_THRESHOLD ? ['480w'] : [];
    await optimizeImage(inputPath, portfolioDir, baseName, { skipWebpSizes });
  }

  // ---- 2. Homepage Hero Images ----
  console.log('\n📁 Processing homepage hero images...');
  const heroDir = 'public';
  const heroFiles = (await readdir(heroDir))
    .filter(f => f.startsWith('luxury-') && f.endsWith('.jpg'));

  for (const file of heroFiles) {
    const baseName = parse(file).name;
    const inputPath = join(heroDir, file);
    console.log(`  📸 ${file}`);
    await optimizeImage(inputPath, heroDir, baseName);
    // Hero images also get a 1920w variant since they serve full-width
    await makeVariant(inputPath, join(heroDir, `${baseName}-1920w.webp`), { format: 'webp', quality: WEBP_QUALITY, width: 1920 });
    await makeVariant(inputPath, join(heroDir, `${baseName}-1920w.avif`), { format: 'avif', quality: AVIF_QUALITY, width: 1920 });
  }

  // ---- 3. Review Images ----
  console.log('\n📁 Processing review images...');
  const reviewDir = 'public/review-images';
  try {
    const reviewFiles = (await readdir(reviewDir))
      // originals only — skip already-generated variants
      .filter(f => (f.endsWith('.jpg') || f.endsWith('.webp')) && !f.match(/-\d{3,4}w\./));

    for (const file of reviewFiles) {
      const baseName = parse(file).name;
      const inputPath = join(reviewDir, file);
      console.log(`  📸 ${file}`);
      // Review images only need 480w and 800w (small thumbnails), lighter quality
      for (const size of [SIZES[0], SIZES[1]]) {
        await makeVariant(inputPath, join(reviewDir, `${baseName}-${size.suffix}.webp`), { format: 'webp', quality: 75, width: size.width });
        await makeVariant(inputPath, join(reviewDir, `${baseName}-${size.suffix}.avif`), { format: 'avif', quality: 60, width: size.width });
      }
    }
  } catch {
    console.log('  ⏭️  No review-images directory found, skipping');
  }

  // ---- 4. Upholstery Images ----
  console.log('\n📁 Processing upholstery images...');
  const upholDir = 'public/upholstery';
  try {
    const upholFiles = (await readdir(upholDir))
      .filter(f => (f.endsWith('.jpg') || f.endsWith('.webp')) && !f.match(/-\d{3,4}w\./));

    for (const file of upholFiles) {
      const baseName = parse(file).name;
      const inputPath = join(upholDir, file);
      console.log(`  📸 ${file}`);
      await optimizeImage(inputPath, upholDir, baseName);
    }
  } catch {
    console.log('  ⏭️  No upholstery directory found, skipping');
  }

  // ---- 5. Window Tint Gallery Images ----
  console.log('\n📁 Processing window-tint gallery images...');
  const tintDir = 'public/window-tint';
  try {
    const tintFiles = (await readdir(tintDir))
      .filter(f => /\.(jpe?g|png)$/i.test(f) && !f.match(/-\d{3,4}w\./));

    for (const file of tintFiles) {
      const baseName = parse(file).name;
      const inputPath = join(tintDir, file);
      console.log(`  📸 ${file}`);
      // .rotate() honours EXIF orientation from phone cameras
      await optimizeImage(inputPath, tintDir, baseName, { rotate: true });
    }
  } catch {
    console.log('  ⏭️  No window-tint directory found, skipping');
  }

  console.log(`\n✨ Done! Generated ${totalGenerated} new variant(s), skipped ${totalSkipped} existing.`);
  if (totalSkipped > 0 && !FORCE) {
    console.log('   (Run with FORCE=1 to re-encode existing variants, e.g. after replacing a source image.)');
  }
}

main().catch(console.error);
