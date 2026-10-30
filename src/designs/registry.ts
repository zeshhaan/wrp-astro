/**
 * Design Lab registry. Studio was the chosen direction (October 2026) and is
 * now the site's design, so its homepage is `/`; the other concepts
 * (Mezzanine, The Menu and earlier rounds) were removed. The registry still
 * names the design-studio Worker Preview (scripts/preview-designs.mjs), which
 * now shows the same site as the branch Preview.
 */
export type Concept = {
  id: 'studio';
  name: string;
  idea: string;
};

export const concepts: Concept[] = [
  {
    id: 'studio',
    name: 'Studio',
    idea: 'A familiar, conventional detailing-studio site: dark studio hero, services grid, why-us, reviews, gallery, quote form.',
  },
];

export const conceptIds = concepts.map((c) => c.id);

export function getConcept(id: string | undefined): Concept | undefined {
  return concepts.find((c) => c.id === id);
}
