/** The portfolio page designs to choose from, shown at /design-lab/studio/portfolio-concepts/. */
export const portfolioConcepts = [
  {
    id: 'a',
    name: 'Showroom',
    idea: 'The featured cars take turns on a lit stage beside the title. Below, a bento grid of every project that visitors narrow by service (PPF, ceramic coating…); hovering a card brings up what was done.',
  },
  {
    id: 'b',
    name: 'Logbook',
    idea: 'The studio’s job sheets. The hero lists every project like a workshop log, with a photo that follows the pointer. Each project then gets a chapter: big photos beside a paper job card with the services ticked off and the WRP stamp.',
  },
  {
    id: 'c',
    name: 'Inspection light',
    idea: 'The team at work in the dark, lit only where you point, like the swirl-finder lamp a detailer sweeps over paint. Then a turntable of the cars (the one in the middle comes up in colour) and a contact sheet of every photo.',
  },
] as const;

export type PortfolioConceptId = (typeof portfolioConcepts)[number]['id'];
