#!/usr/bin/env node
/**
 * Deploy the Design Lab to Cloudflare Worker Previews: one Preview per homepage
 * concept (the concept is served at `/`), plus one "design-lab" Preview with
 * every concept under /design-lab/.
 *
 *   node scripts/preview-designs.mjs              # all concepts + the lab
 *   node scripts/preview-designs.mjs --only gloss,menu
 *   node scripts/preview-designs.mjs --dry-run    # print the commands only
 *
 * Needs Wrangler >= 4.135 (Worker Previews) and a logged-in `wrangler`
 * (or CLOUDFLARE_API_TOKEN). Production is never touched: `wrangler preview`
 * only creates or updates Previews. Workers Builds can do the same on every
 * push; see docs/design-lab.md.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only'));
const only = onlyArg
  ? (onlyArg.includes('=') ? onlyArg.split('=')[1] : args[args.indexOf(onlyArg) + 1]).split(',')
  : null;

// Read concept ids from the registry without importing TypeScript.
const registry = readFileSync(new URL('../src/designs/registry.ts', import.meta.url), 'utf8');
const all = [...registry.matchAll(/^\s+id: '([a-z-]+)',$/gm)].map((m) => m[1]);
const concepts = only ? all.filter((id) => only.includes(id)) : all;
if (!concepts.length) {
  console.error(`No matching concepts. Available: ${all.join(', ')}`);
  process.exit(1);
}

const commit = safe(() => execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim(), 'local');

function safe(fn, fallback) {
  try { return fn(); } catch { return fallback; }
}

function run(cmd, cmdArgs, env = {}) {
  const shown = [...Object.entries(env).map(([k, v]) => `${k}=${v}`), cmd, ...cmdArgs].join(' ');
  console.log(`\n$ ${shown}`);
  if (dryRun) return '';
  return execFileSync(cmd, cmdArgs, {
    env: { ...process.env, ...env },
    stdio: ['inherit', 'pipe', 'inherit'],
    maxBuffer: 64 * 1024 * 1024,
  }).toString();
}

function deploy(name, designEnv) {
  // `astro build` alone: the full `bun run build` also regenerates llms/OG/images,
  // which the committed files already cover and a design preview doesn't need.
  run('npx', ['astro', 'build'], designEnv);
  const out = run('npx', ['wrangler', 'preview', '--name', name, '--message', `Design Lab ${name} @ ${commit}`, '--json']);
  if (dryRun) return null;
  const json = safe(() => JSON.parse(out.slice(out.indexOf('{'))), null);
  return json?.preview_url ?? json?.url ?? out.match(/https:\/\/\S+workers\.dev\S*/)?.[0] ?? '(see output above)';
}

const results = [];
for (const id of concepts) {
  results.push([`design-${id}`, deploy(`design-${id}`, { PUBLIC_WRP_DESIGN: id })]);
}
if (!only) results.push(['design-lab', deploy('design-lab', { PUBLIC_WRP_DESIGN: '' })]);

console.log('\nDesign Lab Previews');
for (const [name, url] of results) console.log(`  ${name.padEnd(18)} ${url ?? '(dry run)'}`);
