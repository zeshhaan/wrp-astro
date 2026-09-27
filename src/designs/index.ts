/** Concept id → homepage component. Kept separate from registry.ts so plain TS can import metadata without .astro files. */
import Mezzanine from './mezzanine/Home.astro';
import Gloss from './gloss/Home.astro';
import Menu from './menu/Home.astro';
import Paddock from './paddock/Home.astro';

export const conceptComponents = {
  mezzanine: Mezzanine,
  gloss: Gloss,
  menu: Menu,
  paddock: Paddock,
} as const;

export type ConceptId = keyof typeof conceptComponents;

/** Concept chosen at build time for `/` (per-concept Worker Previews). */
export const activeDesign: ConceptId | undefined = (() => {
  const id = import.meta.env.PUBLIC_WRP_DESIGN as string | undefined;
  return id && id in conceptComponents ? (id as ConceptId) : undefined;
})();
