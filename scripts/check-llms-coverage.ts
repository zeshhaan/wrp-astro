#!/usr/bin/env bun
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const sitemapCandidates = [
  resolve('dist', 'sitemap-0.xml'),
  resolve('dist', 'client', 'sitemap-0.xml'),
];
const llmsPaths = [resolve('public', 'llms.txt'), resolve('public', 'llms-full.txt')];

async function exists(path: string) {
  try {
    await readFile(path, 'utf8');
    return true;
  } catch (error) {
    return false;
  }
}

async function load(urlPath: string) {
  try {
    return await readFile(urlPath, 'utf8');
  } catch {
    return '';
  }
}

async function findSitemapPath() {
  for (const path of sitemapCandidates) {
    if (await exists(path)) return path;
  }
  return null;
}

(async () => {
  const sitemapPath = await findSitemapPath();
  if (!sitemapPath) {
    console.log('Missing sitemap-0.xml (run `bun run build`). Skipping LLMS coverage check.');
    return;
  }

  const sitemap = await readFile(sitemapPath, 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/\/$/, ''));
  const llmsUrls = new Set<string>();
  const llmsRegex = /https:\/\/wrpdetailing\.ae[^\s"'`)\]]*/g;

  for (const path of llmsPaths) {
    const content = await load(path);
    for (const match of content.matchAll(llmsRegex)) {
      llmsUrls.add(match[0].replace(/[),.:;!?]+$/, '').replace(/\/$/, ''));
    }
  }

  const missing = urls.filter((url) => !llmsUrls.has(url));
  if (missing.length === 0) {
    console.log('LLMS files already mention every entry in sitemap-0.xml.');
    return;
  }

  console.warn('LLMS context needs updating. The following URLs exist in sitemap-0.xml but are not mentioned inside llms.txt or llms-full.txt:');
  missing.forEach((url) => console.warn(`  • ${url}`));
  process.exitCode = 1;
})();
