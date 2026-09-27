/**
 * Quote flow state: types, defaults, persistence and pure derivations
 * (screen order, validation, estimate, summary and WhatsApp text, Dubai dates).
 * Client-safe: no DOM at module level, no imports beyond the shared contract.
 */
import { bodyTypes, panels, ppfPresets, tintOptions, type BodyType, type PanelId } from './panels';

export type ServiceId = 'ppf' | 'ceramic' | 'polish' | 'wash' | 'tint' | 'interior' | 'wrap';
export const serviceOrder: ServiceId[] = ['ppf', 'ceramic', 'polish', 'wash', 'tint', 'interior', 'wrap'];

export type ScreenId = 'car' | 'services' | 'helper' | ServiceId | 'when' | 'you' | 'review' | 'done';

export type Catalog = {
  services: {
    id: ServiceId;
    name: string;
    short: string;
    from: number | null;
    time: string;
    minutes: number;
    href: string;
    line: string;
  }[];
  ppf: {
    presets: { id: string; name: string; panels: PanelId[]; partial?: PanelId[]; note: string; features: string[] }[];
    facts: string[];
    films: { name: string; logo: string }[];
    ceramicOnFilm: string;
  };
  ceramic: { packages: { id: string; name: string; features: string[] }[]; facts: string[] };
  polish: { packages: { name: string; features: string[] }[] };
  wash: { levels: { level: 1 | 2 | 3; name: string; tagline: string; sedan: number; suv: number; features: string[] }[] };
  tint: { options: { id: string; name: string; vlt: number; heat: string; note: string; features: string[] }[] };
  contact: {
    phoneDisplay: string;
    phoneHref: string;
    whatsapp: string;
    whatsappHello: string;
    hoursShort: string;
    closed: string;
    schedule: { open: string; close: string; closedDays: number[]; timeZone: string };
    address: string;
  };
  lounge: string[];
  quotes: Record<'updates' | 'collect', { text: string; author: string }> &
    Record<'ppf' | 'wrap', { text: string; author: string } | null>;
};

export const paintChips = [
  { id: 'white', label: 'White', hex: '#eeeeeb' },
  { id: 'black', label: 'Black', hex: '#141517' },
  { id: 'silver', label: 'Silver', hex: '#b7bbbf' },
  { id: 'grey', label: 'Grey', hex: '#6a6f75' },
  { id: 'blue', label: 'Blue', hex: '#1d3f8a' },
  { id: 'red', label: 'Red', hex: '#9e1b20' },
  { id: 'green', label: 'Green', hex: '#2f5d3a' },
  { id: 'other', label: 'Other', hex: '#c7c9cc' },
] as const;

export const interiorItems = [
  { id: 'seat-covers', label: 'Custom seat covers', note: 'Tailored to your model. Leather, synthetic or fabric.' },
  { id: 'upholstery', label: 'Full seat upholstery', note: 'Seats re-covered, door panels too if you like.' },
  { id: 'repair', label: 'Seat repair & stitching', note: 'Worn bolsters, tears and split seams.' },
  { id: 'trim', label: 'Steering, dashboard or door panels', note: 'Re-trimmed to match.' },
  { id: 'mats', label: 'Custom floor mats', note: '2D, 5D or 7D, made to measure.' },
] as const;

export const interiorMaterials = [
  { id: 'genuine', label: 'Genuine leather' },
  { id: 'synthetic', label: 'Synthetic leather' },
  { id: 'microfiber', label: 'Microfiber leather' },
  { id: 'fabric', label: 'Fabric' },
  { id: 'unsure', label: 'Help me choose' },
] as const;

export const polishConditions = [
  { id: 'light', label: 'Light swirls', hint: 'Fine circles you see in the sun, paint still glossy.', pkg: 0 },
  { id: 'heavy', label: 'Heavy swirls & scratches', hint: 'Visible marks from washes, keys or brushes.', pkg: 1 },
  { id: 'faded', label: 'Faded or oxidised', hint: 'Dull, chalky paint that has lost its colour.', pkg: 2 },
  { id: 'unsure', label: 'Not sure', hint: 'We measure the paint depth and tell you.', pkg: -1 },
] as const;

export const wrapFinishes = [
  { id: 'matte-black', label: 'Matte black', hex: '#1a1b1d' },
  { id: 'gloss-black', label: 'Gloss black', hex: '#060607' },
  { id: 'satin-black', label: 'Satin black', hex: '#121315' },
  { id: 'colour', label: 'A colour, ask us', hex: '#7a5a1e' },
] as const;

export const slots = [
  { id: 'morning', label: 'Morning', range: '9 AM – 12 PM', start: 9 * 60, end: 12 * 60 },
  { id: 'afternoon', label: 'Afternoon', range: '12 – 5 PM', start: 12 * 60, end: 17 * 60 },
  { id: 'evening', label: 'Evening', range: '5 – 9:30 PM', start: 17 * 60, end: 21 * 60 + 30 },
] as const;

export type QuoteState = {
  v: 1;
  body: BodyType | null;
  make: string;
  year: string;
  paint: string | null;
  paintOther: string;
  services: ServiceId[];
  ppf: { preset: string | null; panels: PanelId[]; finish: 'gloss' | 'matte'; film: 'avery' | 'stek' | 'recommend'; ceramicTop: boolean };
  ceramic: { pkg: string; wheelsGlass: boolean };
  polish: { condition: string | null };
  wash: { level: 1 | 2 | 3 | null };
  tint: { option: string | null };
  interior: { items: string[]; material: string | null };
  wrap: { parts: PanelId[]; finish: string; chromeDelete: boolean };
  when: { day: string | null; slot: string | null; handover: 'drop' | 'collect'; area: string };
  you: { name: string; phone: string; email: string; contact: 'whatsapp' | 'call'; notes: string; consent: boolean };
  screen: ScreenId;
  /** Highest main step reached, so the progress dots know what is "done". */
  reached: number;
  sent: boolean;
  savedAt: number;
};

export function freshState(): QuoteState {
  return {
    v: 1,
    body: null,
    make: '',
    year: '',
    paint: null,
    paintOther: '',
    services: [],
    ppf: { preset: null, panels: [], finish: 'gloss', film: 'recommend', ceramicTop: false },
    ceramic: { pkg: 'recommend', wheelsGlass: false },
    polish: { condition: null },
    wash: { level: null },
    tint: { option: null },
    interior: { items: [], material: null },
    wrap: { parts: [], finish: 'matte-black', chromeDelete: false },
    when: { day: null, slot: null, handover: 'drop', area: '' },
    you: { name: '', phone: '', email: '', contact: 'whatsapp', notes: '', consent: false },
    screen: 'car',
    reached: 0,
    sent: false,
    savedAt: 0,
  };
}

const KEY = 'wrp-studio-quote-v1';

export function loadDraft(): QuoteState | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<QuoteState>;
    if (parsed.v !== 1) return null;
    // Merge onto defaults so older drafts missing a field still work.
    const base = freshState();
    const merged = { ...base, ...parsed } as QuoteState;
    for (const k of ['ppf', 'ceramic', 'polish', 'wash', 'tint', 'interior', 'wrap', 'when', 'you'] as const) {
      (merged as Record<string, unknown>)[k] = { ...base[k], ...(parsed[k] ?? {}) };
    }
    const known = new Set(panels.map((p) => p.id));
    merged.ppf.panels = merged.ppf.panels.filter((p) => known.has(p));
    merged.wrap.parts = merged.wrap.parts.filter((p) => known.has(p));
    merged.services = merged.services.filter((s) => serviceOrder.includes(s));
    return merged;
  } catch {
    return null;
  }
}

export function saveDraft(s: QuoteState) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
  } catch {
    /* private mode or storage full: the flow still works, it just won't resume */
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/** True when a draft has enough in it to be worth offering back. */
export function draftWorthResuming(s: QuoteState | null): s is QuoteState {
  return !!s && !s.sent && (s.body !== null || s.services.length > 0);
}

/* ---------- Screens and steps ---------- */

export const mainSteps = [
  { n: 1, label: 'Your car', short: 'Car' },
  { n: 2, label: 'What it needs', short: 'Services' },
  { n: 3, label: 'Details', short: 'Details' },
  { n: 4, label: 'When & how', short: 'When' },
  { n: 5, label: 'Your details', short: 'You' },
  { n: 6, label: 'Review & send', short: 'Review' },
] as const;

export function stepOf(screen: ScreenId): number {
  if (screen === 'car') return 1;
  if (screen === 'services' || screen === 'helper') return 2;
  if ((serviceOrder as string[]).includes(screen)) return 3;
  if (screen === 'when') return 4;
  if (screen === 'you') return 5;
  return 6;
}

export function detailScreens(s: QuoteState): ServiceId[] {
  return serviceOrder.filter((id) => s.services.includes(id));
}

/** The linear sequence the Next button walks. */
export function sequence(s: QuoteState): ScreenId[] {
  return ['car', 'services', ...detailScreens(s), 'when', 'you', 'review'];
}

/** Position used to decide transition direction; helper sits just after services. */
export function orderIndex(s: QuoteState, screen: ScreenId): number {
  if (screen === 'helper') return 1.5;
  if (screen === 'done') return 99;
  const i = sequence(s).indexOf(screen);
  return i === -1 ? stepOf(screen) : i;
}

export function nextScreen(s: QuoteState, from: ScreenId): ScreenId {
  if (from === 'helper') return 'services';
  const seq = sequence(s);
  const i = seq.indexOf(from);
  return seq[Math.min(seq.length - 1, i + 1)] ?? 'car';
}

export function prevScreen(s: QuoteState, from: ScreenId): ScreenId | null {
  if (from === 'helper') return 'services';
  const seq = sequence(s);
  const i = seq.indexOf(from);
  return i > 0 ? seq[i - 1] : null;
}

/** Is a screen reachable with the answers so far? Used to validate a restored hash. */
export function reachable(s: QuoteState, screen: ScreenId): boolean {
  if (screen === 'done') return s.sent;
  if (screen === 'helper') return true;
  const seq = sequence(s);
  const i = seq.indexOf(screen);
  if (i === -1) return false;
  return seq.slice(0, i).every((sc) => problem(s, sc) === null);
}

/** What's missing on a screen, as a sentence for the user, or null when complete. */
export function problem(s: QuoteState, screen: ScreenId): string | null {
  switch (screen) {
    case 'car':
      return s.body ? null : 'Choose the shape closest to your car to continue.';
    case 'services':
      return s.services.length ? null : 'Choose at least one service, or tap “Not sure” and we’ll help.';
    case 'ppf':
      return s.ppf.panels.length ? null : 'Choose a coverage, or tap the panels you want covered.';
    case 'polish':
      return s.polish.condition ? null : 'Pick the closest match, or “Not sure”.';
    case 'wash':
      return s.wash.level ? null : 'Choose a level to continue.';
    case 'tint':
      return s.tint.option ? null : 'Choose a film to continue.';
    case 'interior':
      return s.interior.items.length ? null : 'Tick at least one thing you’d like done.';
    case 'wrap':
      return s.wrap.parts.length || s.wrap.chromeDelete ? null : 'Tap the parts to wrap, or turn on chrome delete.';
    case 'when':
      if (!s.when.day) return 'Choose a day.';
      if (!s.when.slot) return 'Choose a time of day.';
      return null;
    case 'you':
      return null; // validated field by field in the form
    default:
      return null;
  }
}

/* ---------- Pricing (only prices the live site shows) ---------- */

export const aed = (n: number) => `AED ${n.toLocaleString('en-US')}`;

export function priceClass(s: QuoteState): 'sedan' | 'suv' | null {
  return bodyTypes.find((b) => b.id === s.body)?.priceClass ?? null;
}

export type Line = { id: ServiceId; title: string; detail: string[]; price: string; amount: number | null; exact: boolean };

export function lines(s: QuoteState, c: Catalog, verbose = false): Line[] {
  const cls = priceClass(s);
  return detailScreens(s).map((id) => {
    const svc = c.services.find((x) => x.id === id)!;
    const detail: string[] = [];
    let amount: number | null = svc.from;
    let exact = false;
    switch (id) {
      case 'ppf': {
        const preset = c.ppf.presets.find((p) => p.id === s.ppf.preset);
        if (preset) detail.push(preset.name);
        else if (s.ppf.panels.length)
          detail.push(
            verbose || s.ppf.panels.length <= 3
              ? `Custom coverage (${panels.filter((p) => s.ppf.panels.includes(p.id)).map((p) => p.label.toLowerCase()).join(', ')})`
              : `Custom coverage, ${s.ppf.panels.length} panels`,
          );
        else detail.push('Coverage to choose');
        detail.push(`${s.ppf.finish === 'matte' ? 'Matte' : 'Gloss'} finish`);
        detail.push(s.ppf.film === 'avery' ? 'Avery Dennison film' : s.ppf.film === 'stek' ? 'STEK film' : 'Film: recommend for me');
        if (s.ppf.ceramicTop) detail.push('+ ceramic coating on the film');
        break;
      }
      case 'ceramic': {
        const pkg = c.ceramic.packages.find((p) => p.id === s.ceramic.pkg);
        detail.push(pkg ? pkg.name : 'Package: recommend for me');
        if (s.ceramic.wheelsGlass) detail.push('+ wheels & glass');
        break;
      }
      case 'polish': {
        const cond = polishConditions.find((p) => p.id === s.polish.condition);
        if (cond) {
          detail.push(cond.label);
          const pkg = cond.pkg >= 0 ? c.polish.packages[cond.pkg] : null;
          detail.push(pkg ? `Likely ${pkg.name}` : 'We’ll measure and suggest');
        }
        break;
      }
      case 'wash': {
        const lv = c.wash.levels.find((l) => l.level === s.wash.level);
        if (lv) {
          detail.push(`${lv.name}, ${lv.tagline}`);
          amount = cls === 'suv' ? lv.suv : lv.sedan;
          exact = !!cls;
        }
        break;
      }
      case 'tint': {
        const o = tintOptions.find((t) => t.id === s.tint.option);
        if (o) detail.push(`${o.name}, ${o.vlt}% VLT`);
        break;
      }
      case 'interior': {
        detail.push(...interiorItems.filter((i) => s.interior.items.includes(i.id)).map((i) => i.label));
        const m = interiorMaterials.find((x) => x.id === s.interior.material);
        if (m && m.id !== 'unsure') detail.push(m.label);
        break;
      }
      case 'wrap': {
        const names = panels.filter((p) => s.wrap.parts.includes(p.id)).map((p) => p.label);
        if (names.length) detail.push(`${wrapFinishes.find((f) => f.id === s.wrap.finish)?.label ?? ''}: ${names.join(', ')}`);
        if (s.wrap.chromeDelete) detail.push('Chrome delete');
        break;
      }
    }
    const price = amount === null ? 'Priced after inspection' : exact ? aed(amount) : `From ${aed(amount)}`;
    return { id, title: svc.name, detail, price, amount, exact };
  });
}

export function estimate(s: QuoteState, c: Catalog, verbose = false) {
  const ls = lines(s, c, verbose);
  const total = ls.reduce((sum, l) => sum + (l.amount ?? 0), 0);
  const inspect = ls.filter((l) => l.amount === null).length + (s.ppf.ceramicTop && s.services.includes('ppf') ? 1 : 0);
  const anyFrom = ls.some((l) => l.amount !== null && !l.exact);
  return { count: ls.length, total, inspect, anyFrom, lines: ls };
}

export function estimateLabel(s: QuoteState, c: Catalog): string {
  const e = estimate(s, c);
  if (!e.count) return 'Nothing chosen yet';
  if (!e.total) return 'Priced after inspection';
  return `${e.anyFrom || e.inspect ? 'from ' : ''}${aed(e.total)}`;
}

/* ---------- Dubai calendar ---------- */

export type DubaiNow = { date: string; minutes: number };

/** "Today" and the wall-clock minutes in Dubai, whatever the device's time zone. */
export function dubaiNow(timeZone = 'Asia/Dubai', at: Date = new Date()): DubaiNow {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, minutes: Number(get('hour')) * 60 + Number(get('minute')) };
}

/** Plain-date arithmetic on YYYY-MM-DD strings, done in UTC so no local offset leaks in. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
export function weekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
export function formatDay(date: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Last booking start today: 20:00 Dubai (brief: today disabled after 8 PM). */
export const TODAY_CUTOFF = 20 * 60;

export type DayOption = { date: string; disabled: boolean; reason: string; top: string; mid: string; bottom: string };

export function bookableDays(now: DubaiNow, closedDays: number[], count = 21): DayOption[] {
  const out: DayOption[] = [];
  for (let i = 0; i < count; i++) {
    const date = addDays(now.date, i);
    const wd = weekday(date);
    const closed = closedDays.includes(wd);
    const late = i === 0 && now.minutes >= TODAY_CUTOFF;
    out.push({
      date,
      disabled: closed || late,
      reason: closed ? 'Closed' : late ? 'Too late' : '',
      top: i === 0 ? 'Today' : i === 1 ? 'Tmrw' : formatDay(date, { weekday: 'short' }),
      mid: formatDay(date, { day: 'numeric' }),
      bottom: formatDay(date, { month: 'short' }),
    });
  }
  return out;
}

/** A slot is gone today once there's less than an hour of it left. */
export function slotAvailable(slotId: string, day: string | null, now: DubaiNow): boolean {
  const slot = slots.find((x) => x.id === slotId);
  if (!slot || !day) return true;
  if (day !== now.date) return true;
  return now.minutes < Math.min(slot.end - 60, TODAY_CUTOFF);
}

/* ---------- Text for the summary, WhatsApp and the enquiry form ---------- */

export function vehicleText(s: QuoteState): string {
  const body = bodyTypes.find((b) => b.id === s.body)?.label ?? '';
  const colour = s.paint === 'other' ? s.paintOther.trim() : paintChips.find((p) => p.id === s.paint)?.label ?? '';
  const car = [s.make.trim(), s.year === 'older' ? '(older)' : s.year].filter(Boolean).join(' ');
  return [car, colour && colour.toLowerCase(), body].filter(Boolean).join(', ');
}

export function whenText(s: QuoteState): string {
  const parts: string[] = [];
  if (s.when.day) parts.push(formatDay(s.when.day, { weekday: 'long', day: 'numeric', month: 'long' }));
  const slot = slots.find((x) => x.id === s.when.slot);
  if (slot) parts.push(`${slot.label.toLowerCase()} (${slot.range})`);
  return parts.join(', ');
}

export function handoverText(s: QuoteState): string {
  return s.when.handover === 'collect'
    ? `Please collect my car${s.when.area.trim() ? ` from ${s.when.area.trim()}` : ''} (on request, to confirm)`
    : 'I’ll drop the car off at the studio';
}

/** Plain-text request, used for WhatsApp (with *bold*) and the enquiry message. */
export function requestText(s: QuoteState, c: Catalog, opts: { whatsapp: boolean }): string {
  const b = (t: string) => (opts.whatsapp ? `*${t}*` : t);
  const e = estimate(s, c, true);
  const out: string[] = [];
  if (opts.whatsapp) out.push('Hi WRP, I’d like a quote please.', '');
  out.push(`${b('Car:')} ${vehicleText(s) || '—'}`);
  out.push(b('Services:'));
  for (const l of e.lines) {
    out.push(`• ${l.title}${l.detail.length ? `: ${l.detail.join(', ')}` : ''} (${l.price.toLowerCase().startsWith('priced') ? 'priced after inspection' : l.price})`);
  }
  if (e.count) {
    out.push(
      `${b('Estimate:')} ${e.total ? `${e.anyFrom || e.inspect ? 'from ' : ''}${aed(e.total)}` : 'priced after inspection'}${e.total && e.inspect ? ', plus items priced after inspection' : ''}`,
    );
  }
  if (s.when.day || s.when.slot) out.push(`${b('When:')} ${whenText(s)}`);
  out.push(`${b('Handover:')} ${handoverText(s)}`);
  if (s.you.name.trim()) out.push(`${b('Name:')} ${s.you.name.trim()}`);
  if (s.you.phone.trim()) out.push(`${b('Mobile:')} ${s.you.phone.trim()}`);
  if (s.you.email.trim()) out.push(`${b('Email:')} ${s.you.email.trim()}`);
  out.push(`${b('Best way to reach me:')} ${s.you.contact === 'call' ? 'phone call' : 'WhatsApp'}`);
  if (s.you.notes.trim()) out.push(`${b('Notes:')} ${s.you.notes.trim()}`);
  return out.join('\n');
}

export function serviceInterest(s: QuoteState, c: Catalog): string {
  return detailScreens(s)
    .map((id) => c.services.find((x) => x.id === id)?.name ?? id)
    .join(', ');
}

/** Pre-select services from the "Not sure" helper answers. */
export function helperSuggest(answers: { chips: boolean; swirls: boolean; heat: boolean; clean: boolean }): ServiceId[] {
  const out: ServiceId[] = [];
  if (answers.chips) out.push('ppf');
  if (answers.swirls) out.push('polish', 'ceramic');
  if (answers.heat) out.push('tint');
  if (answers.clean || !out.length) out.push('wash');
  return out;
}

export const presetPanels = (id: string) => ppfPresets.find((p) => p.id === id);
