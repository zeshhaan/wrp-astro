/**
 * Quote flow state: types, defaults, persistence and pure derivations
 * (screen order, validation, estimate, summary and WhatsApp text, Dubai dates).
 * Client-safe: no DOM at module level, no imports beyond the shared contract.
 */
import type { Locale } from '@/i18n/translations';
import { latinDigits, quoteAmount, quoteLabel, quoteNumber } from './labels';
import { bodyTypes, panels, tintOptions, type BodyType, type PanelId } from './panels';

export type ServiceId = 'ppf' | 'ceramic' | 'polish' | 'wash' | 'tint' | 'interior' | 'wrap';
export const serviceOrder: ServiceId[] = ['ppf', 'ceramic', 'polish', 'wash', 'tint', 'interior', 'wrap'];

export type ScreenId = 'car' | 'services' | 'helper' | ServiceId | 'when' | 'you' | 'review' | 'done';

export type Catalog = {
  locale?: Locale;
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
    films: { name: string; logo: string; lines: string[]; finishes?: string }[];
    ceramicOnFilm: string;
  };
  ceramic: { packages: { id: string; name: string; features: string[] }[]; facts: string[] };
  polish: { packages: { name: string; features: string[] }[] };
  wash: { levels: { level: 1 | 2 | 3; name: string; tagline: string; sedan: number; suv: number; features: string[] }[] };
  tint: { options: { id: string; name: string; vlt: number; heat: string; note: string; features: string[] }[] };
  contact: {
    whatsapp: string;
    hours: string;
    schedule: { open: string; close: string; closedDays: number[]; timeZone: string };
  };
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

/** `key` picks the localStorage entry; the quote page passes its own. */
export function loadDraft(key = KEY): QuoteState | null {
  try {
    const raw = localStorage.getItem(key);
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

export function saveDraft(s: QuoteState, key = KEY) {
  try {
    localStorage.setItem(key, JSON.stringify({ ...s, savedAt: Date.now() }));
  } catch {
    /* private mode or storage full: the flow still works, it just won't resume */
  }
}

export function clearDraft(key = KEY) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/* ---------- Sections ---------- */

export function detailScreens(s: QuoteState): ServiceId[] {
  return serviceOrder.filter((id) => s.services.includes(id));
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

export const aed = quoteAmount;

export function priceClass(s: QuoteState): 'sedan' | 'suv' | null {
  return bodyTypes.find((b) => b.id === s.body)?.priceClass ?? null;
}

export type Line = { id: ServiceId; title: string; detail: string[]; price: string; amount: number | null; exact: boolean };

export function lines(s: QuoteState, c: Catalog, verbose = false): Line[] {
  const locale = c.locale ?? 'en';
  const ar = locale === 'ar';
  const label = (text: string) => quoteLabel(text, locale);
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
              ? `${ar ? 'تغطية مخصّصة' : 'Custom coverage'} (${panels.filter((p) => s.ppf.panels.includes(p.id)).map((p) => label(p.label).toLowerCase()).join(ar ? '، ' : ', ')})`
              : ar ? `عدد الأجزاء المحددة للتغطية: ${quoteNumber(s.ppf.panels.length, locale)}` : `Custom coverage, ${s.ppf.panels.length} panels`,
          );
        else detail.push(ar ? 'لم تُحدَّد التغطية' : 'Coverage to choose');
        detail.push(ar ? (s.ppf.finish === 'matte' ? 'لمسة مطفية' : 'لمسة لامعة') : `${s.ppf.finish === 'matte' ? 'Matte' : 'Gloss'} finish`);
        const film = { avery: ar ? 'فيلم Avery Dennison' : 'Avery Dennison film', stek: ar ? 'فيلم STEK' : 'STEK film', recommend: ar ? 'نوع الفيلم حسب توصيتكم' : 'Film: recommend for me' };
        detail.push(film[s.ppf.film]);
        if (s.ppf.ceramicTop) detail.push((ar ? 'إضافة سيراميك فوق الفيلم' : '+ ceramic coating on the film'));
        break;
      }
      case 'ceramic': {
        const pkg = c.ceramic.packages.find((p) => p.id === s.ceramic.pkg);
        detail.push(pkg ? pkg.name : (ar ? 'الباقة حسب توصيتكم' : 'Package: recommend for me'));
        if (s.ceramic.wheelsGlass) detail.push((ar ? 'إضافة الجنوط والزجاج' : '+ wheels & glass'));
        break;
      }
      case 'polish': {
        const cond = polishConditions.find((p) => p.id === s.polish.condition);
        if (cond) {
          detail.push(label(cond.label));
          const pkg = cond.pkg >= 0 ? c.polish.packages[cond.pkg] : null;
          detail.push(pkg ? `${ar ? 'الباقة المتوقعة' : 'Likely'} ${pkg.name}` : (ar ? 'نقيس سماكة الطلاء ونقترح المعالجة المناسبة' : 'We’ll measure and suggest'));
        }
        break;
      }
      case 'wash': {
        const lv = c.wash.levels.find((l) => l.level === s.wash.level);
        if (lv) {
          detail.push([lv.name, lv.tagline].join(ar ? '، ' : ', '));
          amount = cls === 'suv' ? lv.suv : lv.sedan;
          exact = !!cls;
        }
        break;
      }
      case 'tint': {
        const o = c.tint.options.find((t) => t.id === s.tint.option) ?? tintOptions.find((t) => t.id === s.tint.option);
        if (o) detail.push(ar ? `${label(o.name)}، نفاذ الضوء ${quoteNumber(o.vlt, locale)}٪` : `${o.name}, ${o.vlt}% VLT`);
        break;
      }
      case 'interior': {
        detail.push(...interiorItems.filter((i) => s.interior.items.includes(i.id)).map((i) => label(i.label)));
        const m = interiorMaterials.find((x) => x.id === s.interior.material);
        if (m && m.id !== 'unsure') detail.push(label(m.label));
        break;
      }
      case 'wrap': {
        const names = panels.filter((p) => s.wrap.parts.includes(p.id)).map((p) => label(p.label));
        if (names.length) detail.push(`${label(wrapFinishes.find((f) => f.id === s.wrap.finish)?.label ?? '')}: ${names.join(ar ? '، ' : ', ')}`);
        if (s.wrap.chromeDelete) detail.push((ar ? 'تغطية الكروم' : 'Chrome delete'));
        break;
      }
    }
    const price = amount === null ? (ar ? 'يُحدَّد بعد المعاينة' : 'Priced after inspection') : exact ? aed(amount, locale) : `${ar ? 'ابتداءً من' : 'From'} ${aed(amount, locale)}`;
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
  const ar = c.locale === 'ar';
  if (!e.count) return ar ? 'لم تحدد أي خيارات بعد' : 'Nothing chosen yet';
  if (!e.total) return ar ? 'يُحدَّد بعد المعاينة' : 'Priced after inspection';
  const from = ar ? 'ابتداءً من ' : 'from ';
  return `${e.anyFrom || e.inspect ? from : ''}${aed(e.total, c.locale)}`;
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
export function formatDay(date: string, opts: Intl.DateTimeFormatOptions = { weekday: 'short', day: 'numeric', month: 'short' }, locale: Locale = 'en') {
  const [y, m, d] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-AE-u-ca-gregory-nu-arab' : 'en-GB', { ...opts, timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Last booking start today: 20:00 Dubai (brief: today disabled after 8 PM). */
export const TODAY_CUTOFF = 20 * 60;

export type DayOption = { date: string; disabled: boolean; reason: string; top: string; mid: string; bottom: string };

export function bookableDays(now: DubaiNow, closedDays: number[], count = 21, locale: Locale = 'en'): DayOption[] {
  const out: DayOption[] = [];
  for (let i = 0; i < count; i++) {
    const date = addDays(now.date, i);
    const wd = weekday(date);
    const closed = closedDays.includes(wd);
    const late = i === 0 && now.minutes >= TODAY_CUTOFF;
    out.push({
      date,
      disabled: closed || late,
      reason: closed ? (locale === 'ar' ? 'مغلق' : 'Closed') : late ? (locale === 'ar' ? 'انتهى الوقت' : 'Too late') : '',
      top: i === 0 ? (locale === 'ar' ? 'اليوم' : 'Today') : i === 1 ? (locale === 'ar' ? 'غداً' : 'Tmrw') : formatDay(date, { weekday: 'short' }, locale),
      mid: formatDay(date, { day: 'numeric' }, locale),
      bottom: formatDay(date, { month: 'short' }, locale),
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

export function vehicleText(s: QuoteState, locale: Locale = 'en'): string {
  const body = bodyTypes.find((b) => b.id === s.body)?.label ?? '';
  const colour = s.paint === 'other' ? s.paintOther.trim() : paintChips.find((p) => p.id === s.paint)?.label ?? '';
  const car = [s.make.trim(), s.year === 'older' ? (locale === 'ar' ? '(طراز أقدم)' : '(older)') : s.year].filter(Boolean).join(' ');
  return [car, colour && (s.paint === 'other' ? colour : quoteLabel(colour, locale)).toLowerCase(), quoteLabel(body, locale)].filter(Boolean).join(locale === 'ar' ? '، ' : ', ');
}

export function whenText(s: QuoteState, locale: Locale = 'en'): string {
  const parts: string[] = [];
  if (s.when.day) parts.push(formatDay(s.when.day, { weekday: 'long', day: 'numeric', month: 'long' }, locale));
  const slot = slots.find((x) => x.id === s.when.slot);
  if (slot) parts.push(`${quoteLabel(slot.label, locale).toLowerCase()} (${quoteLabel(slot.range, locale)})`);
  return parts.join(locale === 'ar' ? '، ' : ', ');
}

export function handoverText(s: QuoteState, locale: Locale = 'en'): string {
  if (locale === 'ar') return s.when.handover === 'collect'
    ? `أرغب في استلام السيارة${s.when.area.trim() ? ` من ${s.when.area.trim()}` : ' من موقعي'} (بانتظار التأكيد)`
    : 'سأوصل السيارة إلى الاستوديو';
  return s.when.handover === 'collect'
    ? `Please collect my car${s.when.area.trim() ? ` from ${s.when.area.trim()}` : ''} (on request, to confirm)`
    : 'I’ll drop the car off at the studio';
}

/** Plain-text request, used for WhatsApp (with *bold*) and the enquiry message. */
export function requestText(s: QuoteState, c: Catalog, opts: { whatsapp: boolean }): string {
  const b = (t: string) => (opts.whatsapp ? `*${t}*` : t);
  const e = estimate(s, c, true);
  const out: string[] = [];
  if (c.locale === 'ar') {
    if (opts.whatsapp) out.push('مرحباً WRP، أود الحصول على عرض سعر لسيارتي.', '');
    out.push(`${b('السيارة:')} ${vehicleText(s, 'ar') || '—'}`, b('الخدمات المطلوبة:'));
    for (const line of e.lines) {
      out.push(`• ${line.title}${line.detail.length ? `: ${line.detail.join('، ')}` : ''} (${line.price})`);
    }
    if (e.count) out.push(`${b('التكلفة التقديرية:')} ${estimateLabel(s, c)}${e.total && e.inspect ? '، إضافة إلى خدمات يُحدَّد سعرها بعد المعاينة' : ''}`);
    if (s.when.day || s.when.slot) out.push(`${b('الموعد المطلوب:')} ${whenText(s, 'ar')}`);
    out.push(`${b('تسليم السيارة:')} ${handoverText(s, 'ar')}`);
    if (s.you.name.trim()) out.push(`${b('الاسم:')} ${s.you.name.trim()}`);
    if (s.you.phone.trim()) out.push(`${b('الجوال:')} ${s.you.phone.trim()}`);
    if (s.you.email.trim()) out.push(`${b('البريد الإلكتروني:')} ${s.you.email.trim()}`);
    out.push(`${b('أفضّل التواصل عبر:')} ${s.you.contact === 'call' ? 'مكالمة هاتفية' : 'واتساب'}`);
    if (s.you.notes.trim()) out.push(`${b('ملاحظات:')} ${s.you.notes.trim()}`);
    return out.join('\n');
  }
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

/**
 * The fields the configurator sends to the `quote` Astro Action (src/actions),
 * cut to the action's limits so a long request never fails validation. Email
 * stays optional: an empty one is sent as '' and the action stores no email.
 */
export function quoteLeadFields(s: QuoteState, c: Catalog): Record<string, string> {
  return {
    name: s.you.name.trim().slice(0, 100),
    phone: latinDigits(s.you.phone.trim()),
    email: s.you.email.trim(),
    reply: s.you.contact === 'call' ? 'call' : 'whatsapp',
    vehicle: vehicleText(s, c.locale).slice(0, 120),
    service: serviceInterest(s, c).slice(0, 120),
    notes: requestText(s, c, { whatsapp: false }).slice(0, 5000),
    locale: c.locale ?? 'en',
  };
}
