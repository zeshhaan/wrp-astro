/** Concept id → homepage component. Kept separate from registry.ts so plain TS can import metadata without .astro files. */
import Studio from './studio/Home.astro';

export const conceptComponents = {
  studio: Studio,
} as const;

export type ConceptId = keyof typeof conceptComponents;

/** Design served at `/` on a build with PUBLIC_WRP_DESIGN set (its Worker Preview). */
export const activeDesign: ConceptId | undefined = (() => {
  const id = import.meta.env.PUBLIC_WRP_DESIGN as string | undefined;
  return id && id in conceptComponents ? (id as ConceptId) : undefined;
})();
