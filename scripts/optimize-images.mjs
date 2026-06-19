/**
 * Image Optimization Script for WRP Detailing
 * 
 * Generates responsive variants (480w, 800w, 1200w) in WebP and AVIF
 * for portfolio images, homepage hero images, review images, and upholstery images.
 * 
 * Usage: node scripts/optimize-images.mjs
 * 
 * Original files are preserved for lightbox/full-res usage.
 */

import sharp from 'sharp';
import { readdir, stat, mkdir } from 'fs/promises';
import { join, parse } from 'path';

const SIZES = [
  { suffix: '480w', width: 480 },
  { suffix: '800w', width: 800 },
  { suffix: '1200w', width: 1200 },
];

const WEBP_QUALITY = 80;
const AVIF_QUALITY = 65;
const SMALL_THRESHOLD = 150 * 1024; // Skip full pipeline for images < 150KB

/**
 * Generate responsive variants for a single source image.
 */
async function optimizeImage(inputPath, outputDir, baseName, skipWebpSizes = []) {
  const results = [];
  
  for (const size of SIZES) {
    const shouldSkipWebp = skipWebpSizes.includes(size.suffix);
    
    // WebP variant (skip if source is already smaller)
    if (!shouldSkipWebp) {
      const webpPath = join(outputDir, `${baseName}-${size.suffix}.webp`);
      try {
        await sharp(inputPath)
          .resize({ width: size.width, withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toFile(webpPath);
        results.push(webpPath);
      } catch (err) {
        console.error(`  ❌ Failed ${baseName}-${size.suffix}.webp:`, err.message);
      }
    }
    
    // AVIF variant
    const avifPath = join(outputDir, `${baseName}-${size.suffix}.avif`);
    try {
      await sharp(inputPath)
        .resize({ width: size.width, withoutEnlargement: true })
        .avif({ quality: AVIF_QUALITY })
        .toFile(avifPath);
      results.push(avifPath);
    } catch (err) {
      console.error(`  ❌ Failed ${baseName}-${size.suffix}.avif:`, err.message);
    }
  }
  
  return results;
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
  console.log('🖼️  WRP Image Optimization\n');
  let totalGenerated = 0;
  let totalSaved = 0;
  
  // ---- 1. Portfolio Images ----
  console.log('📁 Processing portfolio images...');
  const portfolioDir = 'public/portfolio';
  const portfolioFiles = (await readdir(portfolioDir))
    .filter(f => f.endsWith('.webp') && !f.match(/-\d{3,4}w\./));
  
  for (const file of portfolioFiles) {
    const baseName = parse(file).name;
    const inputPath = join(portfolioDir, file);
    const inputSize = (await stat(inputPath)).size;
    const { width } = await getDimensions(inputPath);
    
    console.log(`  📸 ${file} (${width}x?, ${formatBytes(inputSize)})`);
    
    // For small images, skip 480w webp (source is already close)
    const skipWebpSizes = inputSize < SMALL_THRESHOLD ? ['480w'] : [];
    
    const results = await optimizeImage(inputPath, portfolioDir, baseName, skipWebpSizes);
    totalGenerated += results.length;
    console.log(`    ✅ Generated ${results.length} variants`);
  }
  
  // ---- 2. Homepage Hero Images ----
  console.log('\n📁 Processing homepage hero images...');
  const heroDir = 'public';
  const heroFiles = (await readdir(heroDir))
    .filter(f => f.startsWith('luxury-') && f.endsWith('.jpg'));
  
  for (const file of heroFiles) {
    const baseName = parse(file).name;
    const inputPath = join(heroDir, file);
    const inputSize = (await stat(inputPath)).size;
    const { width } = await getDimensions(inputPath);
    
    console.log(`  📸 ${file} (${width}x?, ${formatBytes(inputSize)})`);
    
    // For hero images, also generate 1920w variants since they serve full-width
    const results = await optimizeImage(inputPath, heroDir, baseName);
    
    // Also generate 1920w variant for hero images
    try {
      await sharp(inputPath)
        .resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(join(heroDir, `${baseName}-1920w.webp`));
      results.push('1920w.webp');
      
      await sharp(inputPath)
        .resize({ width: 1920, withoutEnlargement: true })
        .avif({ quality: AVIF_QUALITY })
        .toFile(join(heroDir, `${baseName}-1920w.avif`));
      results.push('1920w.avif');
    } catch (err) {
      console.error(`  ❌ Failed 1920w variant:`, err.message);
    }
    
    totalGenerated += results.length;
    console.log(`    ✅ Generated ${results.length} variants`);
  }
  
  // ---- 3. Review Images ----
  console.log('\n📁 Processing review images...');
  const reviewDir = 'public/review-images';
  try {
    const reviewFiles = (await readdir(reviewDir))
      .filter(f => f.endsWith('.jpg') || f.endsWith('.webp'));
    
    for (const file of reviewFiles) {
      const baseName = parse(file).name;
      const inputPath = join(reviewDir, file);
      const inputSize = (await stat(inputPath)).size;
      
      console.log(`  📸 ${file} (${formatBytes(inputSize)})`);
      
      // Review images only need 480w and 800w (they're small thumbnails)
      for (const size of [SIZES[0], SIZES[1]]) { // 480w and 800w only
        try {
          await sharp(inputPath)
            .resize({ width: size.width, withoutEnlargement: true })
            .webp({ quality: 75 })
            .toFile(join(reviewDir, `${baseName}-${size.suffix}.webp`));
          
          await sharp(inputPath)
            .resize({ width: size.width, withoutEnlargement: true })
            .avif({ quality: 60 })
            .toFile(join(reviewDir, `${baseName}-${size.suffix}.avif`));
          
          totalGenerated += 2;
        } catch (err) {
          console.error(`  ❌ Failed ${baseName}-${size.suffix}:`, err.message);
        }
      }
      console.log(`    ✅ Generated 4 variants`);
    }
  } catch {
    console.log('  ⏭️  No review-images directory found, skipping');
  }
  
  // ---- 4. Upholstery Images ----
  console.log('\n📁 Processing upholstery images...');
  const upholDir = 'public/upholstery';
  try {
    const upholFiles = (await readdir(upholDir))
      .filter(f => f.endsWith('.jpg') || f.endsWith('.webp'));
    
    for (const file of upholFiles) {
      const baseName = parse(file).name;
      const inputPath = join(upholDir, file);
      const inputSize = (await stat(inputPath)).size;
      
      console.log(`  📸 ${file} (${formatBytes(inputSize)})`);
      
      const results = await optimizeImage(inputPath, upholDir, baseName);
      totalGenerated += results.length;
      console.log(`    ✅ Generated ${results.length} variants`);
    }
  } catch {
    console.log('  ⏭️  No upholstery directory found, skipping');
  }
  
  console.log(`\n✨ Done! Generated ${totalGenerated} image variants total.`);
  console.log('   Run `bun build` to rebuild the site with optimized images.\n');
}

main().catch(console.error);