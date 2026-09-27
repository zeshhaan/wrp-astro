/**
 * Gloss: the page is painted, stage by stage, in colours sampled from cars
 * WRP has finished (plus the studio's white walls and the lounge's billiards
 * felt). Each stage is a section that owns one paint colour.
 *
 * - Static mode (reduced motion, or no scroll-driven animations and no JS):
 *   every stage paints its own background.
 * - Live mode (scroll-driven animations): stages are transparent and the page
 *   wrapper animates a registered `--paint` colour on each stage's view timeline.
 * - JS fallback (Firefox): an IntersectionObserver sets `--paint`, with a CSS
 *   transition on the registered property.
 */
import { paintColours as P } from '../data';

export const white = '#f2f2ef';
export const felt = '#1d5a41';
/** Service chip colours that are not car paints: tint film and leather. */
export const smoke = '#2b2f33';
export const saddle = '#5b3423';

export type Stage = { id: string; own: string; name: string; source: string };

export const stages: Stage[] = [
  { id: 'hero', own: P.lotusBurgundy, name: 'Lotus Exige burgundy', source: 'car' },
  { id: 'services', own: white, name: 'Highlight white', source: 'studio' },
  { id: 'lounge', own: felt, name: 'Billiards-table green', source: 'lounge' },
  { id: 'w-subaru', own: P.subaruBlue, name: 'Subaru WRX STI blue', source: 'car' },
  { id: 'w-911', own: P.porscheGreen, name: 'Porsche 911 green', source: 'car' },
  { id: 'w-lotus', own: P.lotusBurgundy, name: 'Lotus Exige burgundy', source: 'car' },
  { id: 'w-boxster', own: P.boxsterGrey, name: 'Porsche Boxster grey', source: 'car' },
  { id: 'w-lexus', own: P.lexusBlack, name: 'Lexus LX black', source: 'car' },
  { id: 'reviews', own: P.lexusBlack, name: 'Lexus LX black', source: 'car' },
  { id: 'visit', own: white, name: 'Highlight white', source: 'studio' },
];

/** Attributes that make an element a paint stage. */
export function stage(id: string) {
  const i = stages.findIndex((s) => s.id === id);
  const s = stages[i];
  if (!s) throw new Error(`Unknown gloss stage ${id}`);
  return {
    'data-stage': s.id,
    'data-paint': s.own,
    'data-paint-name': s.name,
    style: `--own:${s.own};view-timeline:--st-${i} block`,
  };
}

/** Keyframes + timeline wiring for live mode, generated from the stage list. */
export function paintCss(): string {
  const names = stages.map((_, i) => `--st-${i}`);
  const keyframes = stages
    .slice(1)
    .map((s, i) => `@keyframes gloss-paint-${i + 1}{from{--paint:${stages[i]!.own}}to{--paint:${s.own}}}`)
    .join('');
  return `@media (prefers-reduced-motion: no-preference){@supports ((animation-timeline: view()) and (animation-range: entry)){${keyframes}.gloss-page{timeline-scope:${names.join(',')};animation:${stages
    .slice(1)
    .map((_, i) => `gloss-paint-${i + 1} linear forwards`)
    .join(',')};animation-timeline:${names.slice(1).join(',')};animation-range:cover 38vh cover 58vh}}}`;
}

export const hex = (c: string) => c.toUpperCase();
