/**
 * Concept directions for the Studio reviews page, for review side by side at
 * /design-lab/studio/review-concepts/. Each is the whole page with the live
 * page's copy, title, description and review schema; only the design differs.
 */
export type ReviewConceptId = 'a' | 'b' | 'c';

export const reviewConcepts: { id: ReviewConceptId; name: string; idea: string }[] = [
  {
    id: 'a',
    name: 'Redline',
    idea: 'The page is a car’s instrument cluster. The rating is a rev counter whose needle swings to 5.0 and bounces off the limiter (press Rev to do it again), the review count rolls up on an odometer and the 5-star share is a full tank. Customer photos ride a pit lane, every review sits behind a gear-stick filter, and the quote button is a push-to-start button.',
  },
  {
    id: 'b',
    name: 'Word of mouth',
    idea: 'The customers do the talking. Their own lines are stuck around the title like stickers you can pick up and move, and roll past in huge type. Customer photos are pinned up as Polaroids that open into the full review. Every review can be narrowed to what people keep mentioning (Afzal, the lounge, “brand new”, the price), and their words light up in red.',
  },
  {
    id: 'c',
    name: 'The deck',
    idea: 'Reviews as a deck of cards. Flick through it, swipe the top card away or press Shuffle to deal a random one. Customer photos are cards you turn over to read the review on the back, and every review can be narrowed by service.',
  },
];
