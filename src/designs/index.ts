/** Concept id → homepage component. Kept separate from registry.ts so plain TS can import metadata without .astro files. */
import Studio from './studio/Home.astro';

export const conceptComponents = {
  studio: Studio,
} as const;

export type ConceptId = keyof typeof conceptComponents;
