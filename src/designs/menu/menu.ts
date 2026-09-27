/**
 * Local content for "The Menu" concept.
 * Everything here is derived from src/designs/data.ts or the service MDX files.
 */
import { services, type Service } from '../data';

export type Course = { id: string; title: string; note: string; items: Service[] };

const bySlug = (slug: string) => {
  const s = services.find((x) => x.slug === slug);
  if (!s) throw new Error(`Unknown service ${slug}`);
  return s;
};

/** Services grouped by how the visit works, not by pillar. */
export const courses: Course[] = [
  {
    id: 'wait',
    title: 'While you wait',
    note: 'Done in a few hours. Most people wait upstairs in the lounge.',
    items: ['premium-car-wash', 'window-film'].map(bySlug),
  },
  {
    id: 'leave',
    title: 'Leave it with us',
    note: 'A day or more in the studio. Drop the car off and we keep you posted.',
    items: ['ceramic-coating', 'polish', 'paint-protection-film'].map(bySlug),
  },
  {
    id: 'cabin',
    title: 'For the cabin',
    note: 'Choose the leather and mats from real samples in the materials room.',
    items: ['leather-upholstery'].map(bySlug),
  },
];

/** "2–4 days" → { lo: 2, hi: 4, unit: 'days' } */
export function timeRange(time: string): { lo: number; hi: number; unit: 'hours' | 'days' } {
  const m = time.match(/(\d+)\s*[–-]\s*(\d+)\s*(hour|day)/i);
  if (!m) return { lo: 1, hi: 1, unit: 'hours' };
  return { lo: Number(m[1]), hi: Number(m[2]), unit: m[3].toLowerCase() === 'day' ? 'days' : 'hours' };
}

/** "1–3 hours" → "1 to 3 hours" (reads better aloud and in WhatsApp). */
export const timeWords = (time: string) => {
  const r = timeRange(time);
  return `${r.lo} to ${r.hi} ${r.unit}`;
};

export const aed = (n: number) => `AED ${n.toLocaleString('en-US')}`;

/** Short, faithful summaries of the three wash levels in premium-car-wash.mdx. */
export const washLevelNotes: Record<string, string> = {
  'Level 1': 'Hand wash, interior vacuum, rims and glass.',
  'Level 2': 'Adds engine bay, arches and a ceramic sealant for 2 to 3 months.',
  'Level 3': 'Adds tar and iron removal, carpet extraction and 6-month ceramic.',
};

/** Used only if the MDX entry can’t be read; same numbers as premium-car-wash.mdx. */
export const washLevelFallback = [
  { name: 'Level 1', sedan: 100, suv: 120 },
  { name: 'Level 2', sedan: 189, suv: 199 },
  { name: 'Level 3', sedan: 300, suv: 325 },
];

/** Verbatim, from Leno Thomas's Google review (ceramic coating, 5 stars). */
export const updatesQuote = {
  text: 'The team kept me updated throughout the process with pictures and videos.',
  author: 'Leno Thomas',
};
