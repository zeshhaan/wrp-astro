/**
 * Column spans that make a card grid fill every row, whatever the card count.
 *
 * A plain auto-fit grid leaves holes: six cards in four columns end in half an
 * empty row. Instead, a "fill grid" lays the cards in rows of `perRow` and, when
 * the count does not divide evenly, makes the first rows shorter so their cards
 * grow wider (5 cards in rows of 3 → 2 wide + 3; 4 → 2 + 2; 7 → 2 + 2 + 3).
 * The wider cards come first, so the grid reads as a bento: a feature row on top,
 * a regular row under it, and no gaps.
 *
 * `fillSpans` returns, for each card, its span on the 6-column grid used on wide
 * containers (`wide`) and on the 2-column grid used on mid-size ones (`mid`).
 * Below that the grid is one column. See `.fill` in theme.css.
 */
function rowSizes(count: number, perRow: number): number[] {
  if (count <= perRow) return [count];
  const rest = count % perRow;
  const rows: number[] = [];
  let left = count;
  if (rest !== 0) {
    // Short rows first: one row of `rest`, or for rows of 3 with one left
    // over, two rows of 2 (a row holding one card would be a lone banner).
    const lead = perRow === 3 && rest === 1 ? [2, 2] : [rest];
    rows.push(...lead);
    left -= lead.reduce((a, b) => a + b, 0);
  }
  while (left > 0) {
    rows.push(perRow);
    left -= perRow;
  }
  return rows;
}

function spans(count: number, perRow: number, columns: number): number[] {
  return rowSizes(count, perRow).flatMap((size) => Array.from({ length: size }, () => columns / size));
}

export type FillSpan = { wide: number; mid: number; style: string };

/** Spans for `count` cards, at most `perRow` (2 or 3) to a row on wide containers. */
export function fillSpans(count: number, perRow: 2 | 3 = 3): FillSpan[] {
  const wide = spans(count, perRow, 6);
  const mid = spans(count, 2, 2);
  return wide.map((w, i) => ({ wide: w, mid: mid[i], style: `--fill-wide:span ${w};--fill-mid:span ${mid[i]}` }));
}
