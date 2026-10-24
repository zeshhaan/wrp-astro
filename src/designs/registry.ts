/**
 * Design Lab registry. Studio is the chosen homepage direction (October 2026);
 * the other concepts (Mezzanine, The Menu and earlier rounds) were removed.
 *
 * The homepage lives in src/designs/<id>/Home.astro and is reachable at
 * /design-lab/<id>/ on any build. A build with PUBLIC_WRP_DESIGN=<id> also
 * serves it at `/`, which is how it gets its own Worker Preview URL
 * (see docs/design-lab.md).
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
