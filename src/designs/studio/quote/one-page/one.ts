/**
 * One-page quote: every choice in one form beside a live 3D car.
 *
 * State, prices, validation rules and the request text all come from
 * ../state.ts, shared with the step-by-step flow; this file only binds them to
 * one long form and a viewer that follows whichever section you are working in.
 */
import { panels, ppfPresets, tintOptions, wrapParts, type BodyType, type CarViewerHandle, type CarViewerOptions, type GlassId, type PanelId, type ViewerMode } from '../panels';
import {
  aed,
  bookableDays,
  clearDraft,
  dubaiNow,
  estimate,
  estimateLabel,
  formatDay,
  freshState,
  lines,
  loadDraft,
  paintChips,
  priceClass,
  problem,
  requestText,
  saveDraft,
  serviceInterest,
  serviceOrder,
  slotAvailable,
  vehicleText,
  wrapFinishes,
  type Catalog,
  type QuoteState,
  type ServiceId,
} from '../state';
import { bodyForModel } from '../models';
import { mount as mount2D, panelsFor } from '../viewer/CarViewer2D';

const KEY = 'wrp-studio-quote-onepage-v1';
let S: QuoteState = freshState();
let C: Catalog;
let form: HTMLFormElement;

type Root = Document | HTMLElement;
const q = <T = HTMLElement>(sel: string, root: Root = document) => root.querySelector(sel) as T | null;
const qa = <T = HTMLElement>(sel: string, root: Root = document) => Array.from(root.querySelectorAll(sel)) as T[];
const input = (name: string, value?: string) =>
  q<HTMLInputElement>(value === undefined ? `[name="${name}"]` : `[name="${name}"][value="${value}"]`, form);

export function start() {
  C = JSON.parse(q('#qo-catalog')!.textContent || '{}') as Catalog;
  form = q<HTMLFormElement>('#qo-form')!;
  const draft = loadDraft(KEY);
  if (draft && !draft.sent) S = draft;
  // Sensible defaults the step flow asks for on their own screens.
  S.you.contact ||= 'whatsapp';
  fixHeaderLinks();
  renderDays();
  applyState();
  form.addEventListener('change', onChange);
  form.addEventListener('input', onInput);
  form.addEventListener('submit', onSubmit);
  form.addEventListener('focusout', onBlur);
  // The car shows whatever the section you are working in is about.
  form.addEventListener('focusin', (e) => followSection(e.target as Element));
  form.addEventListener('pointerdown', (e) => followSection(e.target as Element));
  q('[data-qo-views]')!.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLButtonElement>('[data-qo-view]');
    if (b) setView(b.dataset.qoView as ViewerMode);
  });
  q('[data-qo-wa]')!.addEventListener('click', onWhatsApp);
  q('[data-qo-restart]')!.addEventListener('click', restart);
  sync();
  void mountViewer();
}

/* ---------------- Header anchors (same fix as the step flow) ---------------- */

function fixHeaderLinks() {
  qa<HTMLAnchorElement>('.head a[href^="#"], .drawer a[href^="#"], .foot a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href')!.slice(1);
    if (!document.getElementById(id) || id === 'main') a.href = `/design-lab/studio/${id === 'main' ? '' : `#${id}`}`;
  });
}

/* ---------------- State ⇄ form ---------------- */

function available(): Set<PanelId> {
  return new Set(panelsFor(S.body ?? 'sedan'));
}
function presetFor(id: string): PanelId[] {
  const avail = available();
  return (ppfPresets.find((p) => p.id === id)?.panels ?? []).filter((p) => avail.has(p));
}
function matchPreset(): string | null {
  const set = new Set(S.ppf.panels);
  return ppfPresets.find((p) => {
    const pp = presetFor(p.id);
    return pp.length === set.size && pp.every((x) => set.has(x));
  })?.id ?? null;
}

function check(name: string, value: string | null | undefined, on = true) {
  if (value == null) return;
  const i = input(name, value);
  if (i) i.checked = on;
}

function applyState() {
  qa<HTMLInputElement>('input[type="radio"], input[type="checkbox"]', form).forEach((i) => (i.checked = false));
  check('body', S.body);
  input('make')!.value = S.make;
  q<HTMLSelectElement>('select[name="year"]', form)!.value = S.year;
  check('paint', S.paint);
  input('paintOther')!.value = S.paintOther;
  S.services.forEach((s) => check('services', s));
  check('ppfPreset', S.ppf.preset);
  S.ppf.panels.forEach((p) => check('ppfPanel', p));
  check('ppfFinish', S.ppf.finish);
  check('ppfFilm', S.ppf.film);
  input('ppfCeramic')!.checked = S.ppf.ceramicTop;
  check('ceramicPkg', S.ceramic.pkg);
  input('ceramicWheels')!.checked = S.ceramic.wheelsGlass;
  check('polish', S.polish.condition);
  check('washLevel', S.wash.level ? String(S.wash.level) : null);
  check('tint', S.tint.option);
  S.interior.items.forEach((i) => check('interiorItem', i));
  check('interiorMaterial', S.interior.material);
  S.wrap.parts.forEach((p) => check('wrapPart', p));
  check('wrapFinish', S.wrap.finish);
  input('chromeDelete')!.checked = S.wrap.chromeDelete;
  check('day', S.when.day);
  check('slot', S.when.slot);
  check('handover', S.when.handover);
  input('area')!.value = S.when.area;
  input('name')!.value = S.you.name;
  input('phone')!.value = S.you.phone;
  input('email')!.value = S.you.email;
  check('contactPref', S.you.contact);
  q<HTMLTextAreaElement>('textarea[name="notes"]', form)!.value = S.you.notes;
  input('consent')!.checked = S.you.consent;
}

const checkedValues = (name: string) => qa<HTMLInputElement>(`input[name="${name}"]:checked`, form).map((i) => i.value);

function onChange(e: Event) {
  const t = e.target as HTMLInputElement;
  const v = t.value;
  switch (t.name) {
    case 'body':
      S.body = v as BodyType;
      if (S.ppf.preset) S.ppf.panels = presetFor(S.ppf.preset);
      else S.ppf.panels = S.ppf.panels.filter((p) => available().has(p));
      break;
    case 'year':
      S.year = v;
      break;
    case 'paint':
      S.paint = v;
      break;
    case 'services':
      S.services = serviceOrder.filter((id) => input('services', id)?.checked);
      if (t.checked) {
        seedDefaults(v as ServiceId);
        const sec = q(`[data-qo-service="${v}"]`);
        if (sec) {
          sec.hidden = false;
          const mode = sec.dataset.qoMode as ViewerMode;
          if (mode !== 'look') setView(mode);
        }
      }
      break;
    case 'ppfPreset':
      S.ppf.preset = v;
      S.ppf.panels = presetFor(v);
      announce(`${ppfPresets.find((p) => p.id === v)?.name}: ${S.ppf.panels.length} panels covered.`);
      break;
    case 'ppfPanel':
      S.ppf.panels = panels.map((p) => p.id).filter((id) => input('ppfPanel', id)?.checked);
      S.ppf.preset = matchPreset();
      break;
    case 'ppfFinish':
      S.ppf.finish = v as 'gloss' | 'matte';
      break;
    case 'ppfFilm':
      S.ppf.film = v as 'avery' | 'stek' | 'recommend';
      break;
    case 'ppfCeramic':
      S.ppf.ceramicTop = t.checked;
      break;
    case 'ceramicPkg':
      S.ceramic.pkg = v;
      break;
    case 'ceramicWheels':
      S.ceramic.wheelsGlass = t.checked;
      break;
    case 'polish':
      S.polish.condition = v;
      break;
    case 'washLevel':
      S.wash.level = Number(v) as 1 | 2 | 3;
      break;
    case 'tint':
      S.tint.option = v;
      setView('tint');
      break;
    case 'interiorItem':
      S.interior.items = checkedValues('interiorItem');
      break;
    case 'interiorMaterial':
      S.interior.material = v;
      break;
    case 'wrapPart':
      S.wrap.parts = panels.map((p) => p.id).filter((id) => input('wrapPart', id)?.checked);
      break;
    case 'wrapFinish':
      S.wrap.finish = v;
      break;
    case 'chromeDelete':
      S.wrap.chromeDelete = t.checked;
      break;
    case 'day':
      S.when.day = v;
      break;
    case 'slot':
      S.when.slot = v;
      break;
    case 'handover':
      S.when.handover = v as 'drop' | 'collect';
      break;
    case 'contactPref':
      S.you.contact = v as 'whatsapp' | 'call';
      break;
    case 'consent':
      S.you.consent = t.checked;
      markInvalid(t, false);
      break;
    default:
      return;
  }
  sync();
}

function onInput(e: Event) {
  const t = e.target as HTMLInputElement | HTMLTextAreaElement;
  const v = t.value;
  switch (t.name) {
    case 'make': {
      S.make = v;
      // Recognised model → preselect the shape, like the step flow does.
      const guess = bodyForModel(v);
      const hint = q('[data-qo-model-hint]')!;
      if (guess && !S.body) {
        S.body = guess;
        check('body', guess);
        if (S.ppf.preset) S.ppf.panels = presetFor(S.ppf.preset);
        hint.hidden = false;
        hint.textContent = `We picked “${q(`input[name="body"][value="${guess}"]`, form)!.closest('label')!.querySelector('.qo-body__name')!.textContent}” for you. Change it above if that’s wrong.`;
      }
      break;
    }
    case 'paintOther':
      S.paintOther = v;
      break;
    case 'area':
      S.when.area = v;
      break;
    case 'name':
      S.you.name = v;
      break;
    case 'phone':
      S.you.phone = v;
      break;
    case 'email':
      S.you.email = v;
      break;
    case 'notes':
      S.you.notes = v;
      break;
    default:
      return;
  }
  if (t.dataset.touched) markInvalid(t, !fieldOk(t));
  sync(false);
}

/** Defaults so a freshly ticked service already shows something sensible. */
function seedDefaults(id: ServiceId) {
  if (id === 'ppf' && !S.ppf.panels.length) {
    S.ppf.preset = 'front-end';
    S.ppf.panels = presetFor('front-end');
    check('ppfPreset', 'front-end');
    S.ppf.panels.forEach((p) => check('ppfPanel', p));
    check('ppfFinish', S.ppf.finish);
    check('ppfFilm', S.ppf.film);
  }
  if (id === 'ceramic') check('ceramicPkg', S.ceramic.pkg);
  if (id === 'wrap' && !S.wrap.parts.length) {
    S.wrap.parts = ['bonnet', 'roof', 'mirror-l', 'mirror-r'].filter((p) => available().has(p as PanelId)) as PanelId[];
    S.wrap.parts.forEach((p) => check('wrapPart', p));
    check('wrapFinish', S.wrap.finish);
  }
}

/* ---------------- Render ---------------- */

function sync(full = true) {
  // Service sections
  qa('[data-qo-service]').forEach((sec) => (sec.hidden = !S.services.includes(sec.dataset.qoService as ServiceId)));
  // View buttons for the services that have a view
  qa<HTMLButtonElement>('[data-qo-view]').forEach((b) => {
    const m = b.dataset.qoView as ViewerMode;
    b.hidden = m !== 'look' && !S.services.includes(m as ServiceId);
    b.setAttribute('aria-pressed', String(m === view));
  });
  if (view !== 'look' && !S.services.includes(view as ServiceId)) setView('look');

  if (full) {
    // Panels this body doesn't have (coupes: no rear doors)
    const avail = available();
    qa<HTMLElement>('[data-qo-panel]').forEach((l) => (l.hidden = !avail.has(l.dataset.qoPanel as PanelId)));
    qa<HTMLInputElement>('input[name="ppfPanel"]', form).forEach((i) => (i.checked = S.ppf.panels.includes(i.value as PanelId)));
    qa<HTMLInputElement>('input[name="ppfPreset"]', form).forEach((i) => (i.checked = i.value === S.ppf.preset));
    q('[data-qo-panel-count]')!.textContent = S.ppf.panels.length ? `(${S.ppf.panels.length} selected)` : '';
    qa<HTMLInputElement>('input[name="wrapPart"]', form).forEach((i) => (i.checked = S.wrap.parts.includes(i.value as PanelId)));
    // Wash prices follow the car's size
    const cls = priceClass(S);
    qa<HTMLElement>('[data-qo-wash-price]').forEach((el) => {
      const n = Number(cls === 'suv' ? el.dataset.suv : el.dataset.sedan);
      el.textContent = cls ? aed(n) : `From ${aed(n)}`;
    });
    q('[data-qo-paint-other]')!.hidden = S.paint !== 'other';
    q('[data-qo-area]')!.hidden = S.when.handover !== 'collect';
    renderSlots();
  }
  renderSummary();
  updateViewer();
  saveDraft(S, KEY);
}

function renderDays() {
  const now = dubaiNow(C.contact.schedule.timeZone);
  const days = bookableDays(now, C.contact.schedule.closedDays, 14);
  q('[data-qo-days]')!.innerHTML = days
    .map(
      (d) =>
        `<label class="qo-day"${d.disabled ? ' data-disabled' : ''}><input class="visually-hidden" type="radio" name="day" value="${d.date}"${d.disabled ? ' disabled' : ''} aria-label="${formatDay(d.date, { weekday: 'long', day: 'numeric', month: 'long' })}${d.reason ? `, ${d.reason.toLowerCase()}` : ''}"><span><small>${d.top}</small><b>${d.mid}</b><small>${d.reason || d.bottom}</small></span></label>`,
    )
    .join('');
}

function renderSlots() {
  const now = dubaiNow(C.contact.schedule.timeZone);
  qa<HTMLInputElement>('input[name="slot"]', form).forEach((i) => {
    const ok = slotAvailable(i.value, S.when.day, now);
    i.disabled = !ok;
    i.closest('label')!.toggleAttribute('data-disabled', !ok);
    if (!ok && i.checked) {
      i.checked = false;
      S.when.slot = null;
    }
  });
}

const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function renderSummary() {
  const e = estimate(S, C);
  const label = estimateLabel(S, C);
  const count = !S.body && !e.count ? 'Nothing chosen yet' : `${e.count} ${e.count === 1 ? 'service' : 'services'}${S.body ? ` · ${vehicleText(S)}` : ''}`;
  qa('[data-qo-count]').forEach((el) => (el.textContent = count));
  qa('[data-qo-total]').forEach((el) => (el.textContent = e.count ? label : S.body ? 'Now pick services' : 'Start with your car'));

  const ls = lines(S, C);
  const rows = ls
    .map(
      (l) =>
        `<li><span class="qo-sum__name">${esc(l.title)}<small>${esc(l.detail.join(' · '))}</small></span><span class="qo-sum__price">${esc(l.price)}</span></li>`,
    )
    .join('');
  const total = e.count
    ? `<p class="qo-sum__total"><span>Estimated starting total</span><b>${esc(label)}</b></p><p class="qo-help">${
        e.inspect ? `Plus ${e.inspect} ${e.inspect === 1 ? 'item' : 'items'} priced after inspection. ` : ''
      }An estimate, not a quote: we confirm the price once we’ve seen your car.</p>`
    : '<p class="qo-help">Choose your car and at least one service to see an estimate.</p>';
  q('[data-qo-summary]')!.innerHTML = `${S.body ? `<p class="qo-sum__car">${esc(vehicleText(S))}</p>` : ''}${rows ? `<ul class="qo-sum" role="list">${rows}</ul>` : ''}${total}`;
  q<HTMLAnchorElement>('[data-qo-wa]')!.href = `${C.contact.whatsapp}?text=${encodeURIComponent(requestText(S, C, { whatsapp: true }))}`;
}

/* ---------------- Viewer ---------------- */

let view: ViewerMode = 'look';
let handle: CarViewerHandle | null = null;
let kind: '2d' | '3d' | null = null;

function setView(mode: ViewerMode) {
  if (mode !== 'look' && !S.services.includes(mode as ServiceId)) mode = 'look';
  if (mode === view) return;
  view = mode;
  qa<HTMLButtonElement>('[data-qo-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.qoView === view)));
  q('[data-qo-hint]')!.textContent =
    view === 'ppf' || view === 'wrap' ? 'Tap a panel on the car to add or remove it.' : view === 'tint' ? 'Drag to look through the windows.' : 'Drag to turn the car.';
  updateViewer();
}

function followSection(t: Element) {
  const sec = t.closest<HTMLElement>('[data-qo-mode]');
  if (sec) setView(sec.dataset.qoMode as ViewerMode);
}

function viewerOptions(): CarViewerOptions {
  const tint = tintOptions.find((t) => t.id === S.tint.option);
  const tintGlass = new Set<GlassId>(['side-glass-l', 'side-glass-r', 'rear-glass']);
  if (tint?.id === 'ultimate') tintGlass.add('windscreen');
  const preset = ppfPresets.find((p) => p.id === S.ppf.preset);
  return {
    body: S.body ?? 'sedan',
    mode: view,
    selected: new Set(view === 'ppf' ? S.ppf.panels : view === 'wrap' ? S.wrap.parts : []),
    partial: new Set(view === 'ppf' && preset?.partial ? preset.partial.filter((p) => !S.ppf.panels.includes(p)) : []),
    tintVlt: tint?.vlt ?? 50,
    tintGlass,
    paint: paintChips.find((p) => p.id === S.paint)?.hex ?? '#d9dadc',
    wrapColor: wrapFinishes.find((f) => f.id === S.wrap.finish)?.hex,
    onToggle: togglePanel,
  };
}

function updateViewer() {
  handle?.update(viewerOptions());
}

async function mountViewer() {
  const el = q('[data-qo-viewer]')!;
  // Headless QA only: ?swgl accepts a software WebGL context (too slow for visitors).
  if (new URLSearchParams(location.search).has('swgl')) el.setAttribute('data-allow-software-gl', '');
  try {
    const m = await import('../viewer/CarViewer3D');
    if (!m.isSupported()) throw new Error('3D unsupported');
    handle = await m.mount(el, viewerOptions());
    kind = '3d';
  } catch {
    el.replaceChildren();
    handle = await mount2D(el, viewerOptions());
    kind = '2d';
  }
  // Choices made while the model was loading apply now.
  handle.update(viewerOptions());
  q('[data-qo-credit]')!.hidden = kind !== '3d';
}

function togglePanel(id: PanelId) {
  const label = panels.find((p) => p.id === id)?.label ?? id;
  if (view === 'wrap') {
    if (!wrapParts.includes(id)) return;
    const on = !S.wrap.parts.includes(id);
    S.wrap.parts = panels.map((p) => p.id).filter((p) => (p === id ? on : S.wrap.parts.includes(p)));
    announce(`${label} ${on ? 'added' : 'removed'}.`);
  } else if (view === 'ppf') {
    const on = !S.ppf.panels.includes(id);
    S.ppf.panels = panels.map((p) => p.id).filter((p) => (p === id ? on : S.ppf.panels.includes(p)));
    S.ppf.preset = matchPreset();
    announce(`${label} ${on ? 'added' : 'removed'}. ${S.ppf.panels.length} panels covered.`);
  } else return;
  sync();
}

/* ---------------- Validation & sending ---------------- */

const phoneDigits = (v: string) => v.replace(/[^\d]/g, '');
function fieldOk(i: HTMLInputElement | HTMLTextAreaElement): boolean {
  const v = i.value.trim();
  if (i.name === 'name') return v.length >= 2;
  if (i.name === 'phone') {
    const d = phoneDigits(v);
    return /^[+\d][\d\s()-]*$/.test(v) && d.length >= 9 && d.length <= 15;
  }
  if (i.name === 'email') return !v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
  return true;
}
function markInvalid(i: HTMLInputElement | HTMLTextAreaElement, bad: boolean) {
  if (bad) i.setAttribute('aria-invalid', 'true');
  else i.removeAttribute('aria-invalid');
}
function onBlur(e: FocusEvent) {
  const t = e.target as HTMLInputElement;
  if (!['name', 'phone', 'email'].includes(t.name)) return;
  if (!t.value.trim() && t.name !== 'email') return; // don't nag on an untouched field
  t.dataset.touched = '1';
  markInvalid(t, !fieldOk(t));
}

type Problem = { text: string; target: string };

/** What's still missing, in page order. `contact` adds the fields the enquiry form needs. */
function problems(contact: boolean): Problem[] {
  const out: Problem[] = [];
  const p = (screen: Parameters<typeof problem>[1], target: string) => {
    const t = problem(S, screen);
    if (t) out.push({ text: t, target });
  };
  p('car', '#qo-car');
  if (!S.services.length) out.push({ text: 'Choose at least one service.', target: '#qo-services' });
  for (const id of S.services) p(id, `#qo-${id}`);
  p('when', '#qo-when');
  if (contact) {
    const fields: [string, string][] = [
      ['name', 'Tell us your name.'],
      ['phone', 'Add a mobile number we can reach.'],
      ['email', 'Check your email address.'],
    ];
    for (const [n, text] of fields) {
      const i = input(n)!;
      i.dataset.touched = '1';
      const bad = !fieldOk(i);
      markInvalid(i, bad);
      if (bad) out.push({ text, target: `#qo-${n}` });
    }
    const consent = input('consent')!;
    markInvalid(consent, !consent.checked);
    if (!consent.checked) out.push({ text: 'Tick the box so we can reply to you.', target: '#qo-consent-err' });
  }
  return out;
}

function showProblems(list: Problem[]) {
  const box = q('[data-qo-problems]')!;
  if (!list.length) {
    box.hidden = true;
    box.innerHTML = '';
    return;
  }
  box.hidden = false;
  box.innerHTML = `<p>Almost there. Still needed:</p><ul role="list">${list.map((p) => `<li><a href="${p.target}">${esc(p.text)}</a></li>`).join('')}</ul>`;
  const first = q(list[0].target);
  first?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  const focusable = first?.matches('input, select, textarea') ? first : first?.querySelector<HTMLElement>('input:not([disabled]), select, textarea');
  (focusable as HTMLElement | null)?.focus({ preventScroll: true });
}

function onWhatsApp(e: MouseEvent) {
  const list = problems(false);
  if (list.length) {
    e.preventDefault();
    showProblems(list);
    return;
  }
  showProblems([]);
  finish('whatsapp');
}

function fillHidden() {
  const set = (n: string, v: string) => (input(n)!.value = v);
  set('vehicle', vehicleText(S));
  set('service', serviceInterest(S, C));
  set('service_interest', serviceInterest(S, C));
  set('message', requestText(S, C, { whatsapp: false }));
}

function onSubmit(e: SubmitEvent) {
  const list = problems(true);
  if (list.length) {
    e.preventDefault();
    e.stopPropagation(); // keep the Design Lab shell from showing its preview notice
    showProblems(list);
    return;
  }
  showProblems([]);
  fillHidden();
  if (form.hasAttribute('data-demo-form')) {
    // The Design Lab shell intercepts this submit after us and fills data-demo-status.
    window.setTimeout(() => finish('form'), 0);
    return;
  }
  e.preventDefault();
  const btn = q<HTMLButtonElement>('button[type="submit"]', form)!;
  btn.disabled = true;
  fetch(form.action, { method: 'POST', body: new FormData(form) })
    .then((r) => r.json().catch(() => ({ success: r.ok })) as Promise<{ success?: boolean; error?: string }>)
    .then((res) => {
      if (res.success) finish('form');
      else showProblems([{ text: res.error ?? 'That didn’t send. Please try WhatsApp instead.', target: '#qo-send' }]);
    })
    .catch(() => showProblems([{ text: 'That didn’t send. Please check your connection or use WhatsApp.', target: '#qo-send' }]))
    .finally(() => (btn.disabled = false));
}

function finish(via: 'form' | 'whatsapp') {
  S.sent = true;
  saveDraft(S, KEY);
  const first = S.you.name.trim().split(/\s+/)[0];
  q('[data-qo-done-title]')!.textContent = via === 'whatsapp' ? 'Over to WhatsApp' : 'Request sent';
  q('[data-qo-done-text]')!.textContent =
    via === 'whatsapp'
      ? `${first ? `Thanks, ${first}. ` : ''}Your request is typed out in WhatsApp: press send there and we’ll reply with a price and a time.`
      : `${first ? `Thanks, ${first}. ` : ''}We’ll ${S.you.contact === 'call' ? 'call you' : 'message you on WhatsApp'} with a price for your car and a confirmed time.`;
  q('[data-qo-done]')!.hidden = false;
  q('[data-qo-actions]')!.hidden = via === 'form';
}

function restart() {
  clearDraft(KEY);
  S = freshState();
  S.you.contact = 'whatsapp';
  applyState();
  q('[data-qo-done]')!.hidden = true;
  q('[data-qo-actions]')!.hidden = false;
  const st = q('[data-demo-status]');
  if (st) st.hidden = true;
  setView('look');
  sync();
  q('#qo-car')!.scrollIntoView({ block: 'start' });
}

function announce(text: string) {
  const live = q('[data-qo-live]')!;
  live.textContent = '';
  window.setTimeout(() => (live.textContent = text), 50);
}
