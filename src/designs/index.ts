/** Concept id → homepage component. Kept separate from registry.ts so plain TS can import metadata without .astro files. */
import Mezzanine from './mezzanine/Home.astro';
import Menu from './menu/Home.astro';
import Layers from './layers/Home.astro';
import Diagnosis from './diagnosis/Home.astro';

export const conceptComponents = {
  mezzanine: Mezzanine,
  menu: Menu,
  layers: Layers,
  diagnosis: Diagnosis,
} as const;

export type ConceptId = keyof typeof conceptComponents;

/** Concept chosen at build time for `/` (per-concept Worker Previews). */
export const activeDesign: ConceptId | undefined = (() => {
  const id = import.meta.env.PUBLIC_WRP_DESIGN as string | undefined;
  return id && id in conceptComponents ? (id as ConceptId) : undefined;
})();
