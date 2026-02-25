import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://wrpdetailing.ae';

const SITE = {
  title: 'WRP Dubai - Premium Car Detailing',
  description:
    "Dubai's premium automotive detailing studio. Wrap, Reinforce, Protect.",
};

// ── Frontmatter parsing ──────────────────────────────────────────────

function stripFrontmatter(raw) {
  const match = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n?/);
  if (!match) return { frontmatter: '', body: raw };
  return { frontmatter: match[1], body: raw.slice(match[0].length) };
}

function extractField(fm, field) {
  const re = new RegExp(`^${field}:\\s*['"]?(.+?)['"]?\\s*$`, 'm');
  const m = fm.match(re);
  return m ? m[1] : null;
}

/**
 * Simple YAML array-of-objects parser for our frontmatter.
 * Handles the specific patterns used in our content files:
 * - packages (name, price, badge, features[])
 * - process (step, title, description)
 * - faqs (question, answer)
 * - benefits (title, description)
 */
function extractYamlArray(fm, field) {
  // Find the field and its array items
  const fieldRe = new RegExp(`^${field}:\\s*$`, 'm');
  const fieldMatch = fm.match(fieldRe);
  if (!fieldMatch) return [];

  const startIdx = fieldMatch.index + fieldMatch[0].length;
  const rest = fm.slice(startIdx);

  // Collect lines until we hit a non-indented, non-empty line (next top-level field)
  const lines = rest.split('\n');
  const arrayLines = [];
  for (const line of lines) {
    if (line.match(/^\S/) && line.trim() !== '') break;
    arrayLines.push(line);
  }

  // Parse array items (lines starting with "  - ")
  const items = [];
  let current = null;

  for (const line of arrayLines) {
    // New item starts with "  - key: value"
    const itemStart = line.match(/^\s{2}-\s+(\w+):\s*['"]?(.*?)['"]?\s*$/);
    if (itemStart) {
      if (current) items.push(current);
      current = { [itemStart[1]]: itemStart[2] };
      continue;
    }
    // Continuation key "    key: value"
    const contKey = line.match(/^\s{4}(\w+):\s*['"]?(.*?)['"]?\s*$/);
    if (contKey && current) {
      current[contKey[1]] = contKey[2];
      continue;
    }
    // Sub-array item "      - value"
    const subItem = line.match(/^\s{6}-\s+['"]?(.*?)['"]?\s*$/);
    if (subItem && current) {
      // Find the last array-type key, or create "items"
      const lastKey = Object.keys(current).find(
        (k) => Array.isArray(current[k]),
      );
      if (lastKey) {
        current[lastKey].push(subItem[1]);
      } else {
        // Previous key must be the array name — find it
        const keys = Object.keys(current);
        const arrayKey = keys[keys.length - 1];
        if (current[arrayKey] === '') {
          current[arrayKey] = [subItem[1]];
        }
      }
      continue;
    }
  }
  if (current) items.push(current);

  return items;
}

// ── Service → markdown conversion ────────────────────────────────────

function serviceToMarkdown(fm) {
  const parts = [];

  const mainDesc1 = extractField(fm, 'mainDescription1');
  const mainDesc2 = extractField(fm, 'mainDescription2');
  if (mainDesc1) parts.push(mainDesc1);
  if (mainDesc2) parts.push('', mainDesc2);

  // Starting price
  const startingPrice = extractField(fm, 'startingPrice');
  if (startingPrice) parts.push('', `Starting from AED ${startingPrice}`);

  // Packages
  const packages = extractYamlArray(fm, 'packages');
  if (packages.length) {
    parts.push('', '### Packages', '');
    for (const pkg of packages) {
      const badge = pkg.badge ? ` (${pkg.badge})` : '';
      parts.push(`**${pkg.name}**${badge} — AED ${pkg.price}`);
      if (Array.isArray(pkg.features)) {
        for (const f of pkg.features) parts.push(`- ${f}`);
      }
      parts.push('');
    }
  }

  // Additional section (product offerings, etc.)
  const addSectionMatch = fm.match(/^additionalSection:\s*$/m);
  if (addSectionMatch) {
    const addHeading = fm.match(/^\s{2}heading:\s*['"]?(.*?)['"]?\s*$/m);
    if (addHeading) {
      parts.push('', `### ${addHeading[1]}`, '');
      // Extract cards: title starts with "    - title:", description at "      description:"
      const cardTitles = [...fm.matchAll(/^\s{4}-\s+title:\s*['"]?(.*?)['"]?\s*$/gm)];
      const cardDescs = [...fm.matchAll(/^\s{6}description:\s*['"]?(.*?)['"]?\s*$/gm)];
      for (let i = 0; i < cardTitles.length; i++) {
        parts.push(`**${cardTitles[i][1]}**`);
        if (cardDescs[i]) parts.push(cardDescs[i][1]);
        parts.push('');
      }
    }
  }

  // Process steps
  const process = extractYamlArray(fm, 'process');
  if (process.length) {
    parts.push('### Process', '');
    for (const p of process) {
      parts.push(`${p.step}. **${p.title}**: ${p.description}`);
    }
    parts.push('');
  }

  // Benefits
  const benefits = extractYamlArray(fm, 'benefits');
  if (benefits.length) {
    parts.push('### Benefits', '');
    for (const b of benefits) {
      parts.push(`- **${b.title}**: ${b.description}`);
    }
    parts.push('');
  }

  // FAQs
  const faqs = extractYamlArray(fm, 'faqs');
  if (faqs.length) {
    parts.push('### Frequently Asked Questions', '');
    for (const f of faqs) {
      parts.push(`**Q: ${f.question}**`);
      parts.push(`A: ${f.answer}`, '');
    }
  }

  return parts.join('\n').trim();
}

// ── Collection reader ────────────────────────────────────────────────

async function readCollection(dir) {
  const files = await readdir(dir);
  const mdFiles = files
    .filter((f) => f.endsWith('.md') || f.endsWith('.mdx'))
    .sort();

  const entries = [];
  for (const file of mdFiles) {
    const raw = await readFile(join(dir, file), 'utf-8');
    const { frontmatter, body } = stripFrontmatter(raw);
    const slug = file.replace(/\.(md|mdx)$/, '');
    const title = extractField(frontmatter, 'title') || slug;
    const description = extractField(frontmatter, 'description') || '';
    entries.push({
      slug,
      title,
      description,
      frontmatter,
      body: body.trim(),
    });
  }
  return entries;
}

// ── Main ─────────────────────────────────────────────────────────────

const blogDir = join(ROOT, 'src', 'content', 'blog');
const servicesDir = join(ROOT, 'src', 'content', 'services');
const portfolioDir = join(ROOT, 'src', 'content', 'portfolio');

const [blogPosts, services, portfolio] = await Promise.all([
  readCollection(blogDir),
  readCollection(servicesDir),
  readCollection(portfolioDir),
]);

// ── llms.txt (concise index with links) ──────────────────────────────

const llmsLines = [
  `# ${SITE.title}`,
  '',
  `> ${SITE.description}`,
  '',
  'WRP is a premium car detailing studio in Al Qusais Industrial Area 1, Dubai, UAE.',
  'We specialize in Paint Protection Film (PPF), ceramic coating, car polish and paint correction, window tinting and window film, custom seat covers, premium floor mats (2D/5D/7D), full seat upholstery, and premium car wash services.',
  'Visit our showroom to see and feel materials in person — we have ready samples for most popular models including Nissan Patrol, Toyota Land Cruiser, and nearly every brand on the road.',
  '',
  '## Services',
  '',
  ...services.map(
    (s) => `- [${s.title}](${SITE_URL}/services/${s.slug}/): ${s.description}`,
  ),
  '',
  '## Blog',
  '',
  ...blogPosts.map(
    (p) => `- [${p.title}](${SITE_URL}/blog/${p.slug}/): ${p.description}`,
  ),
  '',
  '## Portfolio',
  '',
  ...portfolio.map(
    (p) => `- [${p.title}](${SITE_URL}/portfolio/${p.slug}/): ${p.description}`,
  ),
  '',
  '## Contact',
  '',
  '- Phone: +971 54 717 3000',
  '- Email: info@wrpdetailing.ae',
  '- Instagram: @wrp_ae',
  '- Location: Al Qusais Industrial Area 1, Dubai, UAE',
  '',
];

await writeFile(
  join(ROOT, 'public', 'llms.txt'),
  llmsLines.join('\n'),
  'utf-8',
);
console.log(`✓ public/llms.txt (${llmsLines.length} lines)`);

// ── llms-full.txt (full markdown content) ────────────────────────────

const fullSections = [
  `# ${SITE.title}`,
  '',
  `> ${SITE.description}`,
  '',
  'WRP is a premium car detailing studio in Al Qusais Industrial Area 1, Dubai, UAE.',
  'We specialize in Paint Protection Film (PPF), ceramic coating, car polish and paint correction, window tinting and window film, custom seat covers, premium floor mats (2D/5D/7D), full seat upholstery, and premium car wash services.',
  'Visit our showroom to see and feel materials in person — we have ready samples for most popular models including Nissan Patrol, Toyota Land Cruiser, and nearly every brand on the road.',
];

if (services.length) {
  fullSections.push('', '---', '', '# Services');
  for (const s of services) {
    // Service files have all content in frontmatter — convert to markdown
    const serviceContent = serviceToMarkdown(s.frontmatter);
    fullSections.push(
      '',
      '---',
      '',
      `## ${s.title}`,
      '',
      `> ${s.description}`,
      `URL: ${SITE_URL}/services/${s.slug}/`,
      '',
      serviceContent || s.body,
    );
  }
}

if (blogPosts.length) {
  fullSections.push('', '---', '', '# Blog');
  for (const p of blogPosts) {
    fullSections.push(
      '',
      '---',
      '',
      `## ${p.title}`,
      '',
      `> ${p.description}`,
      `URL: ${SITE_URL}/blog/${p.slug}/`,
      '',
      p.body,
    );
  }
}

if (portfolio.length) {
  fullSections.push('', '---', '', '# Portfolio');
  for (const p of portfolio) {
    fullSections.push(
      '',
      '---',
      '',
      `## ${p.title}`,
      '',
      `> ${p.description}`,
      `URL: ${SITE_URL}/portfolio/${p.slug}/`,
      '',
      p.body,
    );
  }
}

fullSections.push('');

await writeFile(
  join(ROOT, 'public', 'llms-full.txt'),
  fullSections.join('\n'),
  'utf-8',
);
console.log(`✓ public/llms-full.txt`);
