/**
 * Eased gradients: the same start and end as a plain two-stop gradient, with
 * extra stops in between that follow an ease-in-out curve. A linear fade
 * changes opacity at a constant rate, so the eye reads a hard band where it
 * starts and stops; easing it gives softer fades and crisper text on top.
 * (After jhey's "ease your gradients", https://x.com/jh3yy.)
 *
 *   scrim({ rgb: '12 13 15', from: 20, to: 90, max: 0.9 })
 *   → "rgb(12 13 15 / 0) 20%, rgb(12 13 15 / 0.004) 25.8%, … rgb(12 13 15 / 0.9) 90%"
 */

/** Cubic ease-in-out: slow start, slow finish. */
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

export interface ScrimOptions {
  /** Space-separated RGB channels, e.g. '12 13 15'. */
  rgb: string;
  /** Where the fade starts and ends, in % along the gradient line. */
  from: number;
  to: number;
  /** Opacity at `to` (starts at `min`, default 0). */
  max: number;
  min?: number;
  /** Stops including both ends; 12 is plenty to hide banding. */
  steps?: number;
}

/** Colour stops for linear-gradient()/mask-image, eased from `min` to `max` opacity. */
export function scrimStops({ rgb, from, to, max, min = 0, steps = 12 }: ScrimOptions): string {
  const out: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const a = min + (max - min) * easeInOut(t);
    const at = from + (to - from) * t;
    out.push(`rgb(${rgb} / ${+a.toFixed(3)}) ${+at.toFixed(1)}%`);
  }
  return out.join(', ');
}
