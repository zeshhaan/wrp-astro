import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE_URL = 'https://wrpdetailing.ae';

const SITE = {
  title: 'WRP Detailing Studio - Premium Car Detailing in Dubai',
  description:
    "WRP Detailing Studio is a premium automotive detailing studio in Al Qusais, Dubai for Paint Protection Film (PPF), ceramic coating, window tinting, paint correction, upholstery, and premium car wash services.",
};

const STATIC_PAGES = [
  { title: 'Homepage', url: `${SITE_URL}/`, description: 'Main landing page for WRP Detailing Studio in Dubai.' },
  { title: 'Blog Index', url: `${SITE_URL}/blog/`, description: 'English blog index for guides on PPF, ceramic coating, tint, paint correction, and upholstery care.' },
  { title: 'Contact', url: `${SITE_URL}/contact-us/`, description: 'Contact page with phone, email, and showroom directions.' },
  { title: 'About', url: `${SITE_URL}/more-about-wrp/`, description: 'Brand story, philosophy, and studio positioning.' },
  { title: 'Portfolio', url: `${SITE_URL}/portfolio/`, description: 'Selected detailing, PPF, and ceramic coating case studies.' },
  { title: 'Reviews', url: `${SITE_URL}/reviews/`, description: 'Customer review and testimonial hub.' },
  { title: 'Wrap', url: `${SITE_URL}/wrap/`, description: 'Wrap pillar page for color change and vinyl wrap positioning.' },
  { title: 'Reinforce', url: `${SITE_URL}/reinforce/`, description: 'Reinforce pillar page for protection and enhancement positioning.' },
  { title: 'Protect', url: `${SITE_URL}/protect/`, description: 'Protect pillar page for long-term vehicle protection positioning.' },
  { title: 'Privacy Policy', url: `${SITE_URL}/privacy/`, description: 'Privacy policy.' },
  { title: 'Terms and Conditions', url: `${SITE_URL}/terms/`, description: 'Terms and conditions.' },
  { title: 'LLMS Short Context', url: `${SITE_URL}/llms.txt`, description: 'Machine-readable short context for AI systems and agents.' },
  { title: 'LLMS Full Context', url: `${SITE_URL}/llms-full.txt`, description: 'Machine-readable expanded context for AI systems and agents.' },
];

const STATIC_AR_PAGES = [
  { title: 'الصفحة الرئيسية العربية', url: `${SITE_URL}/ar/`, description: 'الواجهة العربية الرئيسية للموقع.' },
  { title: 'فهرس المدونة العربية', url: `${SITE_URL}/ar/blog/`, description: 'فهرس المدونة العربية لأدلة PPF والسيراميك والتظليل والتلميع.' },
  { title: 'اتصل بنا', url: `${SITE_URL}/ar/contact-us/`, description: 'صفحة التواصل العربية.' },
  { title: 'عن WRP', url: `${SITE_URL}/ar/more-about-wrp/`, description: 'صفحة تعريفية عربية عن الاستوديو.' },
  { title: 'معرض الأعمال', url: `${SITE_URL}/ar/portfolio/`, description: 'معرض الأعمال العربي.' },
  { title: 'المراجعات', url: `${SITE_URL}/ar/reviews/`, description: 'مركز المراجعات والشهادات باللغة العربية.' },
  { title: 'غلّف', url: `${SITE_URL}/ar/wrap/`, description: 'صفحة غلّف العربية.' },
  { title: 'عزّز', url: `${SITE_URL}/ar/reinforce/`, description: 'صفحة عزّز العربية.' },
  { title: 'احمِ', url: `${SITE_URL}/ar/protect/`, description: 'صفحة احمِ العربية.' },
  { title: 'الخصوصية', url: `${SITE_URL}/ar/privacy/`, description: 'سياسة الخصوصية باللغة العربية.' },
  { title: 'الشروط والأحكام', url: `${SITE_URL}/ar/terms/`, description: 'الشروط والأحكام باللغة العربية.' },
];

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

function extractYamlArray(fm, field) {
  const fieldRe = new RegExp(`^${field}:\\s*$`, 'm');
  const fieldMatch = fm.match(fieldRe);
  if (!fieldMatch) return [];

  const startIdx = fieldMatch.index + fieldMatch[0].length;
  const rest = fm.slice(startIdx);
  const lines = rest.split('\n');
  const arrayLines = [];

  for (const line of lines) {
    if (line.match(/^\S/) && line.trim() !== '') break;
    arrayLines.push(line);
  }

  const items = [];
  let current = null;

  for (const line of arrayLines) {
    const itemStart = line.match(/^\s{2}-\s+(\w+):\s*['"]?(.*?)['"]?\s*$/);
    if (itemStart) {
      if (current) items.push(current);
      current = { [itemStart[1]]: itemStart[2] };
      continue;
    }

    const contKey = line.match(/^\s{4}(\w+):\s*['"]?(.*?)['"]?\s*$/);
    if (contKey && current) {
      current[contKey[1]] = contKey[2];
      continue;
    }

    const subItem = line.match(/^\s{6}-\s+['"]?(.*?)['"]?\s*$/);
    if (subItem && current) {
      const lastArrayKey = Object.keys(current).find((key) => Array.isArray(current[key]));
      if (lastArrayKey) {
        current[lastArrayKey].push(subItem[1]);
      } else {
        const keys = Object.keys(current);
        const arrayKey = keys[keys.length - 1];
        if (current[arrayKey] === '') current[arrayKey] = [subItem[1]];
      }
    }
  }

  if (current) items.push(current);
  return items;
}

async function walkContentFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walkContentFiles(fullPath));
    } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) {
      files.push(fullPath);
    }
  }

  return files.sort();
}

async function readCollection(dir) {
  const files = await walkContentFiles(dir);
  const entries = [];

  for (const file of files) {
    const raw = await readFile(file, 'utf-8');
    const { frontmatter, body } = stripFrontmatter(raw);
    const relativePath = relative(dir, file).replace(/\\/g, '/');
    const slug = relativePath.replace(/\.(md|mdx)$/, '');
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

function isArabicSlug(slug) {
  return slug.startsWith('ar/');
}

function withoutLocalePrefix(slug) {
  return isArabicSlug(slug) ? slug.slice(3) : slug;
}

function buildEntryUrl(section, slug) {
  const localePrefix = isArabicSlug(slug) ? '/ar' : '';
  const cleanSlug = withoutLocalePrefix(slug);
  return `${SITE_URL}${localePrefix}/${section}/${cleanSlug}/`;
}

function entryLinkLine(entry, section) {
  return `- [${entry.title}](${buildEntryUrl(section, entry.slug)}): ${entry.description}`;
}

function staticLinkLine(page) {
  return `- [${page.title}](${page.url}): ${page.description}`;
}

function serviceToMarkdown(fm) {
  const parts = [];

  const mainDesc1 = extractField(fm, 'mainDescription1');
  const mainDesc2 = extractField(fm, 'mainDescription2');
  if (mainDesc1) parts.push(mainDesc1);
  if (mainDesc2) parts.push('', mainDesc2);

  const startingPrice = extractField(fm, 'startingPrice');
  if (startingPrice) parts.push('', `Starting from AED ${startingPrice}`);

  const packages = extractYamlArray(fm, 'packages');
  if (packages.length) {
    parts.push('', '### Packages', '');
    for (const pkg of packages) {
      const badge = pkg.badge ? ` (${pkg.badge})` : '';
      parts.push(`**${pkg.name}**${badge} — AED ${pkg.price}`);
      if (Array.isArray(pkg.features)) {
        for (const feature of pkg.features) parts.push(`- ${feature}`);
      }
      parts.push('');
    }
  }

  const addSectionMatch = fm.match(/^additionalSection:\s*$/m);
  if (addSectionMatch) {
    const addHeading = fm.match(/^\s{2}heading:\s*['"]?(.*?)['"]?\s*$/m);
    if (addHeading) {
      parts.push('', `### ${addHeading[1]}`, '');
      const cardTitles = [...fm.matchAll(/^\s{4}-\s+title:\s*['"]?(.*?)['"]?\s*$/gm)];
      const cardDescs = [...fm.matchAll(/^\s{6}description:\s*['"]?(.*?)['"]?\s*$/gm)];
      for (let i = 0; i < cardTitles.length; i += 1) {
        parts.push(`**${cardTitles[i][1]}**`);
        if (cardDescs[i]) parts.push(cardDescs[i][1]);
        parts.push('');
      }
    }
  }

  const process = extractYamlArray(fm, 'process');
  if (process.length) {
    parts.push('### Process', '');
    for (const step of process) {
      parts.push(`${step.step}. **${step.title}**: ${step.description}`);
    }
    parts.push('');
  }

  const benefits = extractYamlArray(fm, 'benefits');
  if (benefits.length) {
    parts.push('### Benefits', '');
    for (const benefit of benefits) {
      parts.push(`- **${benefit.title}**: ${benefit.description}`);
    }
    parts.push('');
  }

  const faqs = extractYamlArray(fm, 'faqs');
  if (faqs.length) {
    parts.push('### Frequently Asked Questions', '');
    for (const faq of faqs) {
      parts.push(`**Q: ${faq.question}**`);
      parts.push(`A: ${faq.answer}`, '');
    }
  }

  return parts.join('\n').trim();
}

function splitByLocale(entries) {
  return {
    en: entries.filter((entry) => !isArabicSlug(entry.slug)),
    ar: entries.filter((entry) => isArabicSlug(entry.slug)),
  };
}

const blogDir = join(ROOT, 'src', 'content', 'blog');
const servicesDir = join(ROOT, 'src', 'content', 'services');
const portfolioDir = join(ROOT, 'src', 'content', 'portfolio');

const [blogEntries, serviceEntries, portfolioEntries] = await Promise.all([
  readCollection(blogDir),
  readCollection(servicesDir),
  readCollection(portfolioDir),
]);

const blog = splitByLocale(blogEntries);
const services = splitByLocale(serviceEntries);
const portfolio = splitByLocale(portfolioEntries);

const llmsLines = [
  `# ${SITE.title}`,
  '',
  `> ${SITE.description}`,
  '',
  '## Entity facts',
  '',
  '- Business: WRP Detailing Studio',
  '- Category: Premium automotive detailing and paint protection studio',
  '- Location: Al Qusais Industrial Area 1, Dubai, UAE',
  '- Services: Paint Protection Film (PPF), ceramic coating, window tinting, car polish and paint correction, leather and upholstery work, custom seat covers, premium floor mats, premium car wash',
  '- Languages: English and Arabic',
  '- Contact: +971 54 717 3000, info@wrpdetailing.ae, @wrp_ae on Instagram',
  '',
  '## Core pages',
  '',
  ...STATIC_PAGES.map(staticLinkLine),
  '',
  '## Services',
  '',
  ...services.en.map((entry) => entryLinkLine(entry, 'services')),
  '',
  '## Blog',
  '',
  ...blog.en.map((entry) => entryLinkLine(entry, 'blog')),
  '',
  '## Portfolio',
  '',
  ...portfolio.en.map((entry) => entryLinkLine(entry, 'portfolio')),
  '',
  '## Arabic pages',
  '',
  ...STATIC_AR_PAGES.map(staticLinkLine),
  ...services.ar.map((entry) => entryLinkLine(entry, 'services')),
  ...blog.ar.map((entry) => entryLinkLine(entry, 'blog')),
  ...portfolio.ar.map((entry) => entryLinkLine(entry, 'portfolio')),
  '',
];

await writeFile(join(ROOT, 'public', 'llms.txt'), llmsLines.join('\n'), 'utf-8');
console.log(`✓ public/llms.txt (${llmsLines.length} lines)`);

const fullSections = [
  `# ${SITE.title}`,
  '',
  `> ${SITE.description}`,
  '',
  '## Entity facts',
  '',
  '- WRP Detailing Studio is a Dubai-based automotive detailing and protection studio.',
  '- The studio serves English and Arabic audiences.',
  '- Primary commercial topics are PPF, ceramic coating, tint, paint correction, upholstery, and premium wash services.',
  '- The site includes service pages, educational blog content, portfolio case studies, reviews, and bilingual core pages.',
  '',
  '## Core pages',
  '',
  ...STATIC_PAGES.map(staticLinkLine),
  ...STATIC_AR_PAGES.map(staticLinkLine),
];

if (services.en.length || services.ar.length) {
  fullSections.push('', '---', '', '# Services');
  for (const entry of [...services.en, ...services.ar]) {
    fullSections.push(
      '',
      '---',
      '',
      `## ${entry.title}`,
      '',
      `> ${entry.description}`,
      `URL: ${buildEntryUrl('services', entry.slug)}`,
      '',
      serviceToMarkdown(entry.frontmatter) || entry.body,
    );
  }
}

if (blog.en.length || blog.ar.length) {
  fullSections.push('', '---', '', '# Blog');
  for (const entry of [...blog.en, ...blog.ar]) {
    fullSections.push(
      '',
      '---',
      '',
      `## ${entry.title}`,
      '',
      `> ${entry.description}`,
      `URL: ${buildEntryUrl('blog', entry.slug)}`,
      '',
      entry.body,
    );
  }
}

if (portfolio.en.length || portfolio.ar.length) {
  fullSections.push('', '---', '', '# Portfolio');
  for (const entry of [...portfolio.en, ...portfolio.ar]) {
    fullSections.push(
      '',
      '---',
      '',
      `## ${entry.title}`,
      '',
      `> ${entry.description}`,
      `URL: ${buildEntryUrl('portfolio', entry.slug)}`,
      '',
      entry.body,
    );
  }
}

fullSections.push('');

await writeFile(join(ROOT, 'public', 'llms-full.txt'), fullSections.join('\n'), 'utf-8');
console.log('✓ public/llms-full.txt');
