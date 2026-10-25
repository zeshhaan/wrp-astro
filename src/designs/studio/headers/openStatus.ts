/**
 * Open or closed right now in Dubai, whatever the visitor's time zone.
 * Same rule as the contact modal (FloatingContact.astro). The schedule comes
 * from `contact.schedule` in data.ts, passed to the page in a data attribute so
 * the client bundle doesn't pull in data.ts.
 */
export type Schedule = { open: string; close: string; closedDays: number[]; timeZone: string };

export function dubaiOpenState(s: Schedule, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: s.timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  const day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  const at = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const open = !s.closedDays.includes(day) && minutes >= at(s.open) && minutes < at(s.close);
  // Thursday after closing and all of Friday: the next opening is Saturday.
  const opensSaturday = !open && (day === 5 || (day === 4 && minutes >= at(s.close)));
  return { open, opensSaturday };
}
