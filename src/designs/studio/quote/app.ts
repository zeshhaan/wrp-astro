/**
 * Quote flow controller (client).
 *
 * - One state object (state.ts), mirrored into native form controls. Controls
 *   are the source of truth for input; state is the source of truth for
 *   rendering, saving and the message.
 * - Navigation: one screen at a time, pushState per step so the phone's back
 *   gesture works, direction-aware view transitions, focus to the step's h1.
 * - Work per interaction is small and synchronous; chrome/summary rendering is
 *   coalesced into one animation frame and saving is debounced (INP).
 */
import {
  bodyTypes,
  panels,
  ppfPresets,
  tintOptions,
  wrapParts,
  type BodyType,
  type CarViewerHandle,
  type CarViewerOptions,
  type GlassId,
  type PanelId,
  type ViewerMode,
} from './panels';
import { bodyForModel } from './models';
import { mount as mount2D, panelsFor } from './viewer/CarViewer2D';
import {
  aed,
  bookableDays,
  clearDraft,
  detailScreens,
  draftWorthResuming,
  dubaiNow,
  estimate,
  estimateLabel,
  formatDay,
  freshState,
  handoverText,
  helperSuggest,
  interiorItems,
  lines,
  loadDraft,
  mainSteps,
  nextScreen,
  orderIndex,
  paintChips,
  polishConditions,
  problem,
  reachable,
  requestText,
  saveDraft,
  sequence,
  serviceInterest,
  serviceOrder,
  slotAvailable,
  slots,
  stepOf,
  vehicleText,
  whenText,
  wrapFinishes,
  type Catalog,
  type QuoteState,
  type ScreenId,
  type ServiceId,
} from './state';

let S: QuoteState = freshState();
let C: Catalog;
let current: ScreenId = 'car';
let histIndex = 0;
let editingFromReview = false;
let pendingDraft: QuoteState | null = null;

const root = () => document.querySelector<HTMLElement>('main.q')!;
// Loose element typing: the Cloudflare worker types in tsconfig shadow the DOM's `Element`.
type Root = { querySelector(sel: string): unknown; querySelectorAll(sel: string): ArrayLike<unknown> };
const q = <T = HTMLElement>(sel: string, el: Root = document) => el.querySelector(sel) as T | null;
const qa = <T = HTMLElement>(sel: string, el: Root = document) => Array.from(el.querySelectorAll(sel)) as T[];
const screenEl = (id: ScreenId) => q<HTMLElement>(`[data-screen="${id}"]`);
const esc = (t: string) => t.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

const screenNames: Record<ScreenId, string> = {
  car: 'Your car',
  services: 'What it needs',
  helper: 'Help me choose',
  ppf: 'PPF',
  ceramic: 'Ceramic',
  polish: 'Polish',
  wash: 'Detailing',
  tint: 'Window tint',
  interior: 'Interior',
  wrap: 'Wrap',
  when: 'When & how',
  you: 'Your details',
  review: 'Review & send',
  done: 'Request sent',
};
const nextLabels: Partial<Record<ScreenId, string>> = {
  services: 'Next: services',
  when: 'Next: date & time',
  you: 'Next: contact',
  review: 'Review request',
};

/* ---------------- Boot ---------------- */

export function start() {
  C = JSON.parse(q('#q-catalog')!.textContent || '{}') as Catalog;
  const draft = loadDraft();
  const hash = location.hash.slice(1) as ScreenId;
  let initial: ScreenId = 'car';

  if (draft && hash && screenEl(hash)) {
    // A refresh (or back from another page): quietly carry on where they were.
    S = draft;
    initial = reachable(S, hash) ? hash : furthest(S);
  } else if (draftWorthResuming(draft)) {
    pendingDraft = draft;
  }
  if (S.sent && initial !== 'done') S = freshState();

  applyStateToControls();
  bind();
  histIndex = typeof history.state?.i === 'number' ? history.state.i : 0;
  history.replaceState({ q: initial, i: histIndex }, '', `#${initial}`);
  swap(initial);
  onEnter(initial);
  renderChrome();
  if (pendingDraft) showResume(pendingDraft);
  probe3D();
}

function furthest(s: QuoteState): ScreenId {
  const seq = sequence(s);
  for (const sc of seq) if (problem(s, sc)) return sc;
  return seq[seq.length - 1];
}

/* ---------------- State ⇄ controls ---------------- */

function setRadio(name: string, value: string | null | undefined) {
  qa<HTMLInputElement>(`input[name="${name}"]`).forEach((i) => (i.checked = value !== null && value !== undefined && i.value === value));
}
function setChecks(name: string, values: string[]) {
  qa<HTMLInputElement>(`input[name="${name}"]`).forEach((i) => (i.checked = values.includes(i.value)));
}
function setBool(name: string, on: boolean) {
  const i = q<HTMLInputElement>(`input[name="${name}"]`);
  if (i) i.checked = on;
}
function setValue(name: string, value: string) {
  const i = q<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-screen] [name="${name}"]`);
  if (i) i.value = value;
}

function applyStateToControls() {
  setRadio('body', S.body);
  setValue('make', S.make);
  setValue('year', S.year);
  setRadio('paint', S.paint);
  setValue('paintOther', S.paintOther);
  setChecks('services', S.services);
  setRadio('ppfPreset', S.ppf.preset);
  setRadio('ppfFinish', S.ppf.finish);
  setRadio('ppfFilm', S.ppf.film);
  setBool('ppfCeramic', S.ppf.ceramicTop);
  setRadio('ceramicPkg', S.ceramic.pkg);
  setBool('ceramicWheels', S.ceramic.wheelsGlass);
  setRadio('polishCondition', S.polish.condition);
  setRadio('washLevel', S.wash.level ? String(S.wash.level) : null);
  setRadio('tintOption', S.tint.option);
  setChecks('interiorItems', S.interior.items);
  setRadio('interiorMaterial', S.interior.material);
  setRadio('wrapFinish', S.wrap.finish);
  setBool('wrapChrome', S.wrap.chromeDelete);
  setRadio('slot', S.when.slot);
  setRadio('handover', S.when.handover);
  setValue('area', S.when.area);
  setValue('name', S.you.name);
  setValue('phone', S.you.phone);
  setValue('email', S.you.email);
  setRadio('contactPref', S.you.contact);
  setValue('notes', S.you.notes);
  setBool('consent', S.you.consent);
  syncDependent();
}

/** Show/hide bits that depend on answers; cheap, runs after each change. */
function syncDependent() {
  const r = root();
  const cls = bodyTypes.find((b) => b.id === S.body)?.priceClass;
  if (cls) r.dataset.class = cls;
  else delete r.dataset.class;
  const classLabel = q('[data-q-class-label]');
  if (classLabel) classLabel.textContent = S.body ? `your ${bodyTypes.find((b) => b.id === S.body)!.label.toLowerCase()}` : 'sedans and SUVs';

  qa<HTMLElement>('[data-q-when]').forEach((el) => {
    const [k, v] = el.dataset.qWhen!.split('=');
    const val = k === 'paint' ? S.paint : k === 'handover' ? S.when.handover : null;
    el.hidden = val !== v;
  });
  qa<HTMLElement>('[data-q-if-service]').forEach((el) => (el.hidden = !S.services.includes(el.dataset.qIfService as ServiceId)));
  const addon = q<HTMLElement>('[data-q-show="ceramic-addon"]');
  if (addon) addon.hidden = !['silver', 'recommend'].includes(S.ceramic.pkg);

  // PPF: preset detail, custom label, panel toggles, count.
  qa<HTMLElement>('[data-q-preset-detail]').forEach((el) => (el.hidden = el.dataset.qPresetDetail !== S.ppf.preset));
  const custom = q<HTMLElement>('[data-q-custom]');
  if (custom) {
    custom.hidden = !(S.ppf.preset === null && S.ppf.panels.length > 0);
    custom.querySelector('span')!.textContent = `Custom coverage · ${S.ppf.panels.length} ${S.ppf.panels.length === 1 ? 'panel' : 'panels'}`;
  }
  const avail = new Set(panelsFor(S.body ?? 'sedan'));
  qa<HTMLButtonElement>('[data-q-panel]').forEach((b) => {
    const id = b.dataset.qPanel as PanelId;
    const inWrap = !!b.closest('[data-screen="wrap"]');
    const on = inWrap ? S.wrap.parts.includes(id) : S.ppf.panels.includes(id);
    b.setAttribute('aria-pressed', String(on));
    b.hidden = !avail.has(id);
  });
  const count = q('[data-q-panel-count]');
  if (count) count.textContent = S.ppf.panels.length ? `(${S.ppf.panels.length} on)` : '';

  // Polish suggestion
  const cond = polishConditions.find((c) => c.id === S.polish.condition);
  qa<HTMLElement>('[data-q-polish-pkg]').forEach((el) => (el.hidden = !cond || Number(el.dataset.qPolishPkg) !== cond.pkg));

  syncTint();
  syncSlots();
}

/* ---------------- Events ---------------- */

function bind() {
  const r = root();
  r.addEventListener('change', onChange);
  r.addEventListener('input', onInput);
  r.addEventListener('click', onClick);
  r.addEventListener('keydown', onKeydown);
  r.addEventListener('focusout', onFocusOut);
  qa<HTMLFormElement>('[data-step-form]').forEach((f) =>
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      next();
    }),
  );
  q<HTMLFormElement>('#q-send-form')?.addEventListener('submit', onSend);
  window.addEventListener('popstate', onPop);

  const sheet = q<HTMLDialogElement>('#q-sheet')!;
  q('[data-q-sheet-open]')?.addEventListener('click', () => {
    renderSummary(q('[data-q-summary="sheet"]')!, false);
    sheet.showModal();
  });
  sheet.addEventListener('click', (e) => {
    const edit = (e.target as Element).closest<HTMLElement>('[data-q-edit]');
    if (edit) {
      sheet.close();
      editFrom(edit.dataset.qEdit as ScreenId);
      return;
    }
    // Light dismiss for browsers without closedby="any" (Safari).
    if (!('closedBy' in HTMLDialogElement.prototype) && e.target === sheet) {
      const rect = sheet.getBoundingClientRect();
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) sheet.close();
    }
  });
  // Rewrite Studio header/footer in-page anchors (#services…) to the Studio homepage.
  qa<HTMLAnchorElement>('.head a[href^="#"], .drawer a[href^="#"], .foot a[href^="#"]').forEach((a) => {
    const id = a.getAttribute('href')!.slice(1);
    if (!document.getElementById(id) || id === 'main') a.href = `/design-lab/studio/${id === 'main' ? '' : `#${id}`}`;
  });
}

function onChange(e: Event) {
  const t = e.target as HTMLInputElement;
  const name = t.name;
  if (!name) return;
  const v = t.value;
  switch (name) {
    case 'body':
      S.body = v as BodyType;
      // Presets depend on which panels the body has (coupes have no rear doors).
      if (S.ppf.preset) S.ppf.panels = presetFor(S.ppf.preset);
      break;
    case 'year':
      S.year = v;
      break;
    case 'paint':
      S.paint = v;
      break;
    case 'services':
      S.services = serviceOrder.filter((id) => q<HTMLInputElement>(`input[name="services"][value="${id}"]`)?.checked);
      q<HTMLElement>('[data-q-suggested]')!.hidden = true;
      break;
    case 'ppfPreset':
      S.ppf.preset = v;
      S.ppf.panels = presetFor(v);
      announce(`${ppfPresets.find((p) => p.id === v)?.name}: ${S.ppf.panels.length} panels covered.`);
      break;
    case 'ppfFinish':
      S.ppf.finish = v as 'gloss' | 'matte';
      break;
    case 'ppfFilm':
      S.ppf.film = v as QuoteState['ppf']['film'];
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
    case 'polishCondition':
      S.polish.condition = v;
      break;
    case 'washLevel':
      S.wash.level = Number(v) as 1 | 2 | 3;
      break;
    case 'tintOption':
      S.tint.option = v;
      break;
    case 'interiorItems':
      S.interior.items = interiorItems.map((i) => i.id).filter((id) => q<HTMLInputElement>(`input[name="interiorItems"][value="${id}"]`)?.checked);
      break;
    case 'interiorMaterial':
      S.interior.material = v;
      break;
    case 'wrapFinish':
      S.wrap.finish = v;
      break;
    case 'wrapChrome':
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
      if (t.checked) markInvalid(t, false);
      break;
    default:
      if (name.startsWith('help-')) return; // helper answers are read on "Suggest"
      return;
  }
  hideBarMsg();
  if (!name.startsWith('help-') && q('[data-q-resume]:not([hidden])')) dismissResume(false);
  syncDependent();
  refreshViewer();
  changed();
}

function onInput(e: Event) {
  const t = e.target as HTMLInputElement;
  switch (t.name) {
    case 'make':
      S.make = t.value;
      suggestBody(t.value);
      break;
    case 'paintOther':
      S.paintOther = t.value;
      break;
    case 'area':
      S.when.area = t.value;
      break;
    case 'name':
    case 'phone':
    case 'email':
    case 'notes':
      S.you[t.name] = t.value;
      // Clear an error as soon as they start fixing it; re-check on blur.
      if (t.getAttribute('aria-invalid') === 'true' && fieldOk(t)) markInvalid(t, false);
      break;
    default:
      return;
  }
  changed();
}

function onFocusOut(e: FocusEvent) {
  const t = e.target as HTMLInputElement;
  if (!['name', 'phone', 'email'].includes(t.name) || !t.closest('[data-screen="you"]')) return;
  // Validate after interaction: only once they've typed something and left the field.
  if (t.value.trim() || t.dataset.touched) markInvalid(t, !fieldOk(t));
}

function onKeydown(e: KeyboardEvent) {
  if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
  const t = e.target as HTMLElement;
  if (!(t instanceof HTMLInputElement) || !t.closest('[data-step-form]')) return;
  if (!['text', 'tel', 'email', 'search'].includes(t.type)) return;
  e.preventDefault();
  // Enter moves to the next text field on this screen, then to the next screen.
  const fields = qa<HTMLInputElement | HTMLTextAreaElement>(
    'input:is([type="text"],[type="tel"],[type="email"]), textarea',
    t.closest('[data-screen]') as HTMLElement,
  ).filter((f) => !f.closest('[hidden]') && !f.disabled);
  const i = fields.indexOf(t);
  if (t.name && ['name', 'phone', 'email'].includes(t.name)) {
    t.dataset.touched = '1';
    markInvalid(t, !fieldOk(t));
  }
  if (i >= 0 && i < fields.length - 1) fields[i + 1].focus();
  else {
    t.blur();
    next();
  }
}

function onClick(e: MouseEvent) {
  const t = e.target as Element;
  const btn = t.closest<HTMLElement>('button, a');
  if (!btn) return;
  if (btn.matches('[data-q-next]')) return void next(e.detail === 0);
  if (btn.matches('[data-q-back]')) return void back();
  if (btn.matches('[data-q-go]')) return void go(btn.dataset.qGo as ScreenId, 'forward');
  if (btn.matches('[data-q-step]')) return void jumpToStep(Number(btn.dataset.qStep));
  if (btn.matches('[data-q-edit]')) return void editFrom(btn.dataset.qEdit as ScreenId);
  if (btn.matches('[data-q-panel]')) {
    const mode: ViewerMode = btn.closest('[data-screen="wrap"]') ? 'wrap' : 'ppf';
    return void togglePanel(mode, btn.dataset.qPanel as PanelId);
  }
  if (btn.matches('[data-q-resume-yes]')) return void resume();
  if (btn.matches('[data-q-resume-no]')) return void dismissResume(true);
  if (btn.matches('[data-q-tintview]')) return void setTintView(btn.dataset.qTintview as 'inside' | 'outside');
  if (btn.matches('[data-q-3d]')) return void toggle3D(btn as HTMLButtonElement);
  if (btn.matches('[data-q-restart]')) return void restart();
  if (btn.matches('[data-q-wa]') && current === 'review') {
    // WhatsApp opens in a new tab; show the confirmation here for when they come back.
    if (problemScreen()) {
      e.preventDefault();
      return void goToProblem();
    }
    window.setTimeout(() => finish('whatsapp'), 400);
  }
}

/* ---------------- Navigation ---------------- */

function swap(to: ScreenId) {
  qa<HTMLElement>('[data-screen]').forEach((el) => el.toggleAttribute('data-active', el.dataset.screen === to));
  current = to;
  root().dataset.current = to;
  S.screen = to;
  S.reached = Math.max(S.reached, stepOf(to));
}

function go(to: ScreenId, dir: 'forward' | 'backward', opts: { push?: boolean } = {}) {
  if (to === current) return;
  const push = opts.push ?? true;
  hideBarMsg();
  const update = () => {
    destroyViewer();
    swap(to);
    // Keep the flow's top in view: jump back up if the old screen was scrolled.
    const top = root().getBoundingClientRect().top + window.scrollY;
    if (window.scrollY > top) window.scrollTo({ top, behavior: 'instant' });
    onEnter(to);
    renderChrome();
  };
  const after = () => {
    const h = q<HTMLElement>(`#q-h-${to}`);
    h?.focus({ preventScroll: true });
    document.title = `${screenNames[to]} · Get a quote · WRP Detailing Dubai`;
  };
  if (push) {
    histIndex += 1;
    history.pushState({ q: to, i: histIndex }, '', `#${to}`);
  }
  const doc = document as Document & {
    startViewTransition?: (arg: unknown) => { finished: Promise<void> };
  };
  if (doc.startViewTransition && !document.hidden) {
    let t: { finished: Promise<void> };
    try {
      t = doc.startViewTransition({ update, types: [dir] });
    } catch {
      t = doc.startViewTransition(update); // older engines: no transition types
    }
    t.finished.finally(after);
  } else {
    update();
    after();
  }
  changed();
}

function onPop(e: PopStateEvent) {
  const sheet = q<HTMLDialogElement>('#q-sheet');
  if (sheet?.open) sheet.close();
  let to = (e.state?.q ?? location.hash.slice(1)) as ScreenId;
  histIndex = typeof e.state?.i === 'number' ? e.state.i : 0;
  if (!screenEl(to) || !reachable(S, to)) to = furthest(S);
  if (to === current) return;
  const dir = orderIndex(S, to) < orderIndex(S, current) ? 'backward' : 'forward';
  go(to, dir, { push: false });
}

function back() {
  if (histIndex > 0) {
    history.back();
    return;
  }
  const seq = sequence(S);
  const i = seq.indexOf(current);
  const prev: ScreenId = current === 'helper' ? 'services' : i > 0 ? seq[i - 1] : 'car';
  history.replaceState({ q: prev, i: 0 }, '', `#${prev}`);
  go(prev, 'backward', { push: false });
}

function next(fromKeyboard = false) {
  if (current === 'helper') return applyHelper();
  if (current === 'you' && !validateYou()) return;
  const p = problem(S, current);
  if (p) {
    showBarMsg(p);
    const field = q<HTMLElement>(`[data-screen="${current}"] fieldset`);
    field?.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    if (fromKeyboard) field?.querySelector<HTMLInputElement>('input:not([disabled])')?.focus({ preventScroll: true });
    return;
  }
  if (editingFromReview) {
    const bad = problemScreen();
    go(bad ?? 'review', 'forward');
    return;
  }
  go(nextScreen(S, current), 'forward');
}

function problemScreen(): ScreenId | null {
  for (const sc of sequence(S)) {
    if (sc === 'review') break;
    if (problem(S, sc)) return sc;
    if (sc === 'you' && !youOk()) return sc;
  }
  return null;
}
function goToProblem() {
  const bad = problemScreen();
  if (bad) {
    go(bad, 'backward');
    window.setTimeout(() => showBarMsg(problem(S, bad) ?? 'Please check this step.'), 50);
  }
}

function jumpToStep(n: number) {
  const target = stepTarget(n);
  if (!target || target === current) return;
  go(target, orderIndex(S, target) < orderIndex(S, current) ? 'backward' : 'forward');
}
function stepTarget(n: number): ScreenId | null {
  const d = detailScreens(S);
  return ({ 1: 'car', 2: 'services', 3: d[0] ?? null, 4: 'when', 5: 'you', 6: 'review' } as Record<number, ScreenId | null>)[n] ?? null;
}

function editFrom(to: ScreenId) {
  editingFromReview = current === 'review';
  go(to, 'backward');
}

/* ---------------- Per-screen entry ---------------- */

function onEnter(to: ScreenId) {
  if (to === 'review') editingFromReview = false;
  if (to === 'car' || to === 'ppf' || to === 'wrap') mountViewer(to);
  if (to === 'tint' && tintView === 'outside') mountViewer('tint');
  if (to === 'when') renderWhen();
  if (to === 'review') renderReview();
  if (to === 'done') renderDone();
}

/* ---------------- Chrome: progress, bar, summaries ---------------- */

let chromeQueued = false;
function renderChrome() {
  if (chromeQueued) return;
  chromeQueued = true;
  requestAnimationFrame(() => {
    chromeQueued = false;
    renderProgress();
    renderBar();
    renderSummary(q('[data-q-summary="side"]')!, false);
    const sheet = q<HTMLDialogElement>('#q-sheet');
    if (sheet?.open) renderSummary(q('[data-q-summary="sheet"]')!, false);
    if (current === 'review') renderReview();
  });
}

function renderProgress() {
  const step = stepOf(current);
  const d = detailScreens(S);
  let label = `Step ${step} of 6 · <b>${mainSteps[step - 1].label}</b>`;
  if (step === 3 && current !== 'helper') {
    const i = d.indexOf(current as ServiceId);
    label = `Step 3 of 6 · <b>${screenNames[current]}</b>${d.length > 1 ? ` (${i + 1} of ${d.length})` : ''}`;
  }
  if (current === 'done') label = '<b>Request sent</b>';
  q('[data-q-steplabel]')!.innerHTML = label;
  qa<HTMLButtonElement>('[data-q-step]').forEach((b) => {
    const n = Number(b.dataset.qStep);
    const target = stepTarget(n);
    const isCurrent = n === step && current !== 'done';
    const done = current === 'done' || n < step || (n <= S.reached && target !== null && problem(S, target) === null && n !== step);
    b.toggleAttribute('aria-current', false);
    if (isCurrent) b.setAttribute('aria-current', 'step');
    b.dataset.state = isCurrent ? 'current' : done ? 'done' : 'todo';
    b.disabled = isCurrent || current === 'done' || !target || n > S.reached || !reachable(S, target);
    b.querySelector('[data-q-stepstate]')!.textContent = isCurrent ? ', current step' : done ? ', done' : ', not started';
  });
  const backBtn = q<HTMLButtonElement>('[data-q-back]')!;
  backBtn.hidden = current === 'car' || current === 'done';
}

function renderBar() {
  const bar = q<HTMLElement>('[data-q-bar]')!;
  const e = estimate(S, C);
  bar.dataset.mode = current === 'review' ? 'send' : current === 'done' ? 'done' : 'next';
  q<HTMLElement>('[data-q-send-actions]')!.hidden = current !== 'review';
  const count = q('[data-q-count]')!;
  const total = q('[data-q-total]')!;
  if (e.count) {
    count.textContent = `${e.count} ${e.count === 1 ? 'service' : 'services'}`;
    total.textContent = e.total ? `${estimateLabel(S, C)}${e.inspect ? ' +' : ''}` : 'Priced after inspection';
  } else {
    count.textContent = S.body ? bodyTypes.find((b) => b.id === S.body)!.label : 'Your quote';
    total.textContent = S.body ? 'Now pick services' : 'Start with your car';
  }
  const label = q('[data-q-next-label]')!;
  if (current === 'helper') label.textContent = 'Suggest services';
  else if (editingFromReview) label.textContent = 'Back to review';
  else {
    const n = nextScreen(S, current);
    label.textContent = nextLabels[n] ?? (stepOf(n) === 3 ? `Next: ${screenNames[n]}` : 'Next');
    if (current === 'services' && !S.services.length) label.textContent = 'Next';
  }
  updateWhatsApp();
}

function summaryItems(withContact: boolean): string {
  const items: string[] = [];
  const edit = (to: ScreenId, what: string) =>
    `<button type="button" class="q-sum__edit" data-q-edit="${to}">Change<span class="visually-hidden"> ${esc(what)}</span></button>`;
  if (S.body) {
    const b = bodyTypes.find((x) => x.id === S.body)!;
    const v = [S.make.trim(), S.year, paintName()].filter(Boolean).join(' · ');
    items.push(
      `<li class="q-sum__item"><span class="q-sum__title">${esc(b.label)}</span><span class="q-sum__detail">${esc(v || 'Make and model not given')}</span>${edit('car', 'car')}</li>`,
    );
  }
  for (const l of lines(S, C)) {
    const muted = l.amount === null;
    items.push(
      `<li class="q-sum__item"><span class="q-sum__title">${esc(l.title)}</span><span class="q-sum__price${muted ? ' q-sum__price--muted' : ''}">${esc(l.price)}</span><span class="q-sum__detail">${esc(l.detail.join(' · ') || 'Details to choose')}</span>${edit(l.id, l.title)}</li>`,
    );
  }
  if (S.when.day || S.when.slot || S.reached >= 4) {
    items.push(
      `<li class="q-sum__item"><span class="q-sum__title">${esc(whenText(S) || 'Day and time to choose')}</span><span class="q-sum__detail">${esc(handoverText(S))}</span>${edit('when', 'date and time')}</li>`,
    );
  }
  if (withContact && S.you.name) {
    const who = [S.you.phone, S.you.email].filter(Boolean).join(' · ');
    const pref = S.you.contact === 'call' ? 'Prefers a call' : 'Prefers WhatsApp';
    items.push(
      `<li class="q-sum__item"><span class="q-sum__title">${esc(S.you.name)}</span><span class="q-sum__detail">${esc(`${who} · ${pref}`)}${S.you.notes.trim() ? `<br>“${esc(S.you.notes.trim())}”` : ''}</span>${edit('you', 'your details')}</li>`,
    );
  }
  return items.join('');
}

function totalBlock(): string {
  const e = estimate(S, C);
  if (!e.count) return '';
  const value = e.total ? estimateLabel(S, C) : 'After inspection';
  const extra = e.total && e.inspect ? `Plus ${e.inspect} ${e.inspect === 1 ? 'item' : 'items'} priced after inspection. ` : '';
  return `<div class="q-total"><div class="q-total__row"><span class="q-total__label">Estimated starting total</span><span class="q-total__value">${esc(value)}</span></div><p class="q-total__note">${extra}An estimate, not a quote: we confirm the price once we’ve seen your car.</p></div>`;
}

function renderSummary(el: HTMLElement, withContact: boolean) {
  const items = summaryItems(withContact);
  el.innerHTML = items
    ? `<ul class="q-sum__list" role="list">${items}</ul>${totalBlock()}`
    : `<p class="q-sum__empty">Your car and the services you pick show up here, with starting prices.</p>`;
}

function renderReview() {
  const el = q<HTMLElement>('[data-q-review]');
  if (el) renderSummary(el, true);
  updateWhatsApp();
}

function paintName() {
  if (S.paint === 'other') return S.paintOther.trim() || 'Other colour';
  return paintChips.find((p) => p.id === S.paint)?.label ?? '';
}

function updateWhatsApp() {
  const href = `${C.contact.whatsapp}?text=${encodeURIComponent(requestText(S, C, { whatsapp: true }))}`;
  qa<HTMLAnchorElement>('[data-q-wa]').forEach((a) => (a.href = href));
}

/* ---------------- Bar messages, live region ---------------- */

function showBarMsg(text: string) {
  const m = q<HTMLElement>('[data-q-barmsg]')!;
  m.hidden = false;
  m.textContent = text;
}
function hideBarMsg() {
  const m = q<HTMLElement>('[data-q-barmsg]');
  if (m && !m.hidden) {
    m.hidden = true;
    m.textContent = '';
  }
}
let liveTimer = 0;
function announce(text: string) {
  const live = q('[data-q-live]')!;
  window.clearTimeout(liveTimer);
  live.textContent = '';
  liveTimer = window.setTimeout(() => (live.textContent = text), 60);
}

/* ---------------- Saving ---------------- */

let saveTimer = 0;
function changed() {
  renderChrome();
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => saveDraft(S), 350);
}

/* ---------------- Resume ---------------- */

function showResume(d: QuoteState) {
  const box = q<HTMLElement>('[data-q-resume]')!;
  const bits = [bodyTypes.find((b) => b.id === d.body)?.label, detailScreens(d).map((id) => C.services.find((s) => s.id === id)?.short || '').join(', ')]
    .filter(Boolean)
    .join(' · ');
  q('[data-q-resume-sum]')!.textContent = bits;
  box.hidden = false;
}
function resume() {
  if (!pendingDraft) return;
  S = pendingDraft;
  pendingDraft = null;
  q<HTMLElement>('[data-q-resume]')!.hidden = true;
  applyStateToControls();
  refreshViewer();
  const target = reachable(S, S.screen) && S.screen !== 'done' ? S.screen : furthest(S);
  if (target === 'car') {
    changed();
    q<HTMLElement>('#q-h-car')?.focus();
  } else go(target, 'forward');
}
function dismissResume(clear: boolean) {
  pendingDraft = null;
  q<HTMLElement>('[data-q-resume]')!.hidden = true;
  if (clear) {
    clearDraft();
    S = freshState();
    applyStateToControls();
    refreshViewer();
    changed();
    q<HTMLElement>('#q-h-car')?.focus();
  }
}
function restart() {
  clearDraft();
  S = freshState();
  applyStateToControls();
  histIndex = 0;
  history.replaceState({ q: 'car', i: 0 }, '', '#car');
  go('car', 'backward', { push: false });
}

/* ---------------- Car step: model → body suggestion ---------------- */

function suggestBody(text: string) {
  const hint = q('[data-q-model-hint]')!;
  const body = bodyForModel(text);
  if (!body) {
    hint.textContent = '';
    return;
  }
  const label = bodyTypes.find((b) => b.id === body)!.label;
  if (!S.body) {
    S.body = body;
    setRadio('body', body);
    syncDependent();
    refreshViewer();
    hint.textContent = `We’ve picked “${label}” for you. Change it above if that’s not right.`;
  } else if (S.body !== body) {
    hint.textContent = `Usually “${label}”. Keep your choice if you know better.`;
  } else hint.textContent = '';
}

/* ---------------- Helper ---------------- */

function applyHelper() {
  const yes = (n: string) => q<HTMLInputElement>(`input[name="help-${n}"][value="yes"]`)?.checked ?? false;
  const picks = helperSuggest({ chips: yes('chips'), swirls: yes('swirls'), heat: yes('heat'), clean: false });
  S.services = serviceOrder.filter((id) => S.services.includes(id) || picks.includes(id));
  setChecks('services', S.services);
  syncDependent();
  const note = q<HTMLElement>('[data-q-suggested]')!;
  note.hidden = false;
  announce(`Suggested: ${picks.map((p) => C.services.find((s) => s.id === p)?.name).join(', ')}.`);
  if (histIndex > 0 && history.state?.q === 'helper') history.back();
  else go('services', 'backward');
}

/* ---------------- PPF / wrap panels ---------------- */

function presetFor(id: string): PanelId[] {
  const avail = new Set(panelsFor(S.body ?? 'sedan'));
  return (ppfPresets.find((p) => p.id === id)?.panels ?? []).filter((p) => avail.has(p));
}

function togglePanel(mode: ViewerMode, id: PanelId) {
  const label = panels.find((p) => p.id === id)?.label ?? id;
  if (mode === 'wrap') {
    if (!wrapParts.includes(id)) return;
    const set = new Set(S.wrap.parts);
    const on = !set.has(id);
    on ? set.add(id) : set.delete(id);
    S.wrap.parts = panels.map((p) => p.id).filter((p) => set.has(p));
    announce(`${label} ${on ? 'added' : 'removed'}. ${S.wrap.parts.length} ${S.wrap.parts.length === 1 ? 'part' : 'parts'} to wrap.`);
  } else {
    const set = new Set(S.ppf.panels);
    const on = !set.has(id);
    on ? set.add(id) : set.delete(id);
    S.ppf.panels = panels.map((p) => p.id).filter((p) => set.has(p));
    // Still exactly a preset? Keep its name; otherwise it's custom coverage.
    const match = ppfPresets.find((p) => {
      const pp = presetFor(p.id);
      return pp.length === S.ppf.panels.length && pp.every((x) => set.has(x));
    });
    S.ppf.preset = match?.id ?? null;
    setRadio('ppfPreset', S.ppf.preset);
    announce(`${label} ${on ? 'added' : 'removed'}. ${S.ppf.panels.length} panels covered${S.ppf.preset ? '' : ', custom coverage'}.`);
  }
  hideBarMsg();
  syncDependent();
  refreshViewer();
  changed();
}

/* ---------------- Viewer ---------------- */

type LiveViewer = { screen: ScreenId; el: HTMLElement; mode: ViewerMode; handle: CarViewerHandle; kind: '2d' | '3d' };
let viewer: LiveViewer | null = null;
let viewerToken = 0;
let prefer3D = false;
let has3D = false;

function viewerOptions(mode: ViewerMode): CarViewerOptions {
  const tint = tintOptions.find((t) => t.id === S.tint.option);
  const tintGlass = new Set<GlassId>(['side-glass-l', 'side-glass-r', 'rear-glass']);
  if (tint?.id === 'ultimate') tintGlass.add('windscreen');
  const preset = ppfPresets.find((p) => p.id === S.ppf.preset);
  return {
    body: S.body ?? 'sedan',
    mode,
    selected: new Set(mode === 'ppf' ? S.ppf.panels : mode === 'wrap' ? S.wrap.parts : []),
    partial: new Set(mode === 'ppf' && preset?.partial ? preset.partial.filter((p) => !S.ppf.panels.includes(p)) : []),
    tintVlt: tint?.vlt,
    tintGlass,
    paint: paintChips.find((p) => p.id === S.paint)?.hex ?? '#d9dadc',
    wrapColor: wrapFinishes.find((f) => f.id === S.wrap.finish)?.hex,
    onToggle: (id) => togglePanel(mode, id),
  };
}

async function mountViewer(screen: ScreenId) {
  const el = q<HTMLElement>(`[data-screen="${screen}"] [data-q-viewer]`);
  if (!el) return;
  destroyViewer();
  const token = ++viewerToken;
  const mode = el.dataset.qViewer as ViewerMode;
  const opts = viewerOptions(mode);
  let kind: '2d' | '3d' = '2d';
  let handle: CarViewerHandle;
  if (prefer3D && has3D && mode !== 'look') {
    try {
      const m = await import('./viewer/CarViewer3D');
      handle = await m.mount(el, opts);
      kind = '3d';
    } catch {
      disable3D();
      handle = await mount2D(el, opts);
    }
  } else handle = await mount2D(el, opts);
  if (token !== viewerToken) {
    handle.destroy();
    return;
  }
  viewer = { screen, el, mode, handle, kind };
  sync3DButtons();
}

function destroyViewer() {
  viewerToken++;
  if (viewer) {
    viewer.handle.destroy();
    viewer = null;
  }
}

function refreshViewer() {
  if (viewer) viewer.handle.update(viewerOptions(viewer.mode));
}

/** Only offer 3D when the device can run it and the models are deployed. */
function probe3D() {
  const run = async () => {
    try {
      const m = (await import('./viewer/CarViewer3D')) as { isSupported?: () => boolean };
      if (m.isSupported && !m.isSupported()) return;
      const r = await fetch('/models/cars/sedan.glb', { method: 'HEAD' });
      has3D = r.ok && !(r.headers.get('content-type') ?? '').includes('html');
      sync3DButtons();
    } catch {
      /* stay 2D */
    }
  };
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(() => void run(), { timeout: 3000 });
  else window.setTimeout(() => void run(), 1500);
}
function sync3DButtons() {
  qa<HTMLButtonElement>('[data-q-3d]').forEach((b) => {
    b.hidden = !has3D;
    b.setAttribute('aria-pressed', String(viewer?.kind === '3d'));
    b.textContent = viewer?.kind === '3d' ? '2D' : '3D';
    b.setAttribute('aria-label', viewer?.kind === '3d' ? 'Show the flat drawing' : 'Show the car in 3D');
  });
  // The 3D models are CC BY: credit them wherever they are on screen.
  qa<HTMLElement>('[data-q-3d-credit]').forEach((p) => (p.hidden = viewer?.kind !== '3d'));
}
function disable3D() {
  has3D = false;
  prefer3D = false;
  sync3DButtons();
}
async function toggle3D(btn: HTMLButtonElement) {
  if (!viewer) return;
  const { screen } = viewer;
  prefer3D = viewer.kind !== '3d';
  btn.disabled = true;
  await mountViewer(screen);
  btn.disabled = false;
}

/* ---------------- Tint preview ---------------- */

let tintView: 'inside' | 'outside' = 'inside';
function setTintView(v: 'inside' | 'outside') {
  tintView = v;
  qa<HTMLButtonElement>('[data-q-tintview]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.qTintview === v)));
  qa<HTMLElement>('[data-q-tintpane]').forEach((p) => (p.hidden = p.dataset.qTintpane !== v));
  if (v === 'outside') mountViewer('tint');
  else destroyViewer();
}
function syncTint() {
  const o = tintOptions.find((t) => t.id === S.tint.option);
  const dark = o ? ((100 - o.vlt) / 100) * 0.92 : 0;
  const set = (k: string, v: number) => q<SVGElement>(`[data-film="${k}"]`)?.style.setProperty('--o', String(v));
  set('side', dark);
  set('rear', dark);
  set('front', o?.id === 'ultimate' ? 0.16 : 0);
  const cap = q('[data-q-tint-cap]');
  if (cap) {
    cap.textContent = o
      ? `${o.name}: side and rear glass let through about ${o.vlt}% of the light. ${o.id === 'ultimate' ? 'Windscreen film included; we confirm its shade with you.' : 'No film on the windscreen.'}`
      : 'Choose a film below to see how dark it looks from the driver’s seat.';
  }
}

/* ---------------- When ---------------- */

function renderWhen() {
  const now = dubaiNow(C.contact.schedule.timeZone);
  const days = bookableDays(now, C.contact.schedule.closedDays);
  if (S.when.day && !days.some((d) => d.date === S.when.day && !d.disabled)) S.when.day = null;
  const box = q<HTMLElement>('[data-q-days]')!;
  box.innerHTML = days
    .map((d, i) => {
      const full = formatDay(d.date, { weekday: 'long', day: 'numeric', month: 'long' });
      const week = i > 0 && new Date(`${d.date}T00:00:00Z`).getUTCDay() === 6 ? ' q-day--week' : '';
      return `<label class="q-day${week}"><input class="visually-hidden" type="radio" name="day" value="${d.date}" aria-label="${esc(full + (d.reason ? `, ${d.reason === 'Closed' ? 'closed' : 'too late to book today'}` : ''))}"${d.disabled ? ' disabled' : ''}${S.when.day === d.date ? ' checked' : ''}><span class="q-day__top">${d.top}</span><span class="q-day__mid">${d.mid}</span><span class="q-day__bottom">${d.reason || d.bottom}</span></label>`;
    })
    .join('');
  const first = formatDay(days[0].date, { month: 'long' });
  const last = formatDay(days[days.length - 1].date, { month: 'long' });
  q('[data-q-month]')!.textContent = first === last ? first : `${first} – ${last}`;
  const checked = box.querySelector<HTMLElement>('input:checked')?.closest('label');
  if (checked) box.scrollLeft = checked.offsetLeft - box.offsetLeft - 16;
  syncSlots();
  renderDuration();
}

function syncSlots() {
  const now = dubaiNow(C?.contact.schedule.timeZone);
  qa<HTMLInputElement>('input[name="slot"]').forEach((i) => {
    i.disabled = !slotAvailable(i.value, S.when.day, now);
    if (i.disabled && i.checked) {
      i.checked = false;
      S.when.slot = null;
    }
  });
}

function renderDuration() {
  const box = q<HTMLElement>('[data-q-duration]')!;
  const chosen = detailScreens(S).map((id) => C.services.find((s) => s.id === id)!);
  if (!chosen.length) {
    box.innerHTML = '';
    return;
  }
  const longest = chosen.reduce((a, b) => (b.minutes > a.minutes ? b : a));
  const multiDay = longest.minutes >= 24 * 60;
  const several = chosen.filter((s) => s.minutes > 0).length > 1;
  const head = multiDay
    ? `Plan to leave the car with us for ${several ? 'at least ' : 'about '}${longest.time}.`
    : longest.minutes
      ? `About ${longest.time}${several ? ' or a little more' : ''}. Wait in the lounge (${C.lounge.slice(0, 3).join(', ').toLowerCase()}) or leave it with us.`
      : 'We’ll confirm how long we need the car when we reply.';
  box.innerHTML = `<p><strong>${esc(head)}</strong></p><ul role="list">${chosen
    .map((s) => `<li>${esc(s.name)}: ${esc(s.time)}</li>`)
    .join('')}</ul>`;
}

/* ---------------- Your details ---------------- */

function phoneDigits(v: string) {
  return v.replace(/[^\d]/g, '');
}
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
function youOk(): boolean {
  const s = S.you;
  const d = phoneDigits(s.phone);
  return s.name.trim().length >= 2 && d.length >= 9 && d.length <= 15 && s.consent && (!s.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email));
}
function validateYou(): boolean {
  const scr = screenEl('you')!;
  const fields = qa<HTMLInputElement>('input[name="name"], input[name="phone"], input[name="email"]', scr);
  let firstBad: HTMLInputElement | null = null;
  for (const f of fields) {
    f.dataset.touched = '1';
    const bad = !fieldOk(f);
    markInvalid(f, bad);
    if (bad && !firstBad) firstBad = f;
  }
  const consent = q<HTMLInputElement>('input[name="consent"]', scr)!;
  markInvalid(consent, !consent.checked);
  if (!consent.checked && !firstBad) firstBad = consent;
  if (firstBad) {
    showBarMsg(firstBad === consent ? 'Please tick the box so we can reply to you.' : 'Please check the highlighted field.');
    firstBad.focus();
    return false;
  }
  return true;
}

/* ---------------- Send ---------------- */

function fillForm(form: HTMLFormElement) {
  const set = (n: string, v: string) => {
    const i = form.querySelector<HTMLInputElement>(`input[name="${n}"]`);
    if (i) i.value = v;
  };
  set('name', S.you.name.trim());
  set('phone', S.you.phone.trim());
  set('email', S.you.email.trim());
  set('vehicle', vehicleText(S));
  set('service', serviceInterest(S, C));
  set('service_interest', serviceInterest(S, C));
  set('message', requestText(S, C, { whatsapp: false }));
}

function onSend(e: SubmitEvent) {
  const form = e.currentTarget as HTMLFormElement;
  if (problemScreen()) {
    e.preventDefault();
    goToProblem();
    return;
  }
  fillForm(form);
  const submitter = q<HTMLButtonElement>('button[form="q-send-form"]');
  if (form.hasAttribute('data-demo-form')) {
    // The Design Lab shell intercepts this submit (after us) and fills data-demo-status.
    window.setTimeout(() => {
      if (e.defaultPrevented) finish('form', form.querySelector<HTMLElement>('[data-demo-status]')?.textContent ?? '');
    }, 0);
    return;
  }
  e.preventDefault();
  if (submitter) submitter.disabled = true;
  fetch(form.action, { method: 'POST', body: new FormData(form) })
    .then((r) => r.json().catch(() => ({ success: r.ok })) as Promise<{ success?: boolean; error?: string }>)
    .then((res: { success?: boolean; error?: string }) => {
      if (res.success) finish('form', '');
      else showBarMsg(res.error ?? 'That didn’t send. Please try WhatsApp instead.');
    })
    .catch(() => showBarMsg('That didn’t send. Please check your connection or use WhatsApp.'))
    .finally(() => {
      if (submitter) submitter.disabled = false;
    });
}

let doneVia: 'form' | 'whatsapp' = 'form';
let doneStatus = '';
function finish(via: 'form' | 'whatsapp', status = '') {
  doneVia = via;
  doneStatus = status;
  S.sent = true;
  saveDraft(S);
  go('done', 'forward');
}
function renderDone() {
  const first = S.you.name.trim().split(/\s+/)[0];
  q('#q-h-done')!.textContent = doneVia === 'whatsapp' ? 'Over to WhatsApp' : 'Request sent';
  q('[data-q-done-lede]')!.textContent =
    doneVia === 'whatsapp'
      ? `${first ? `Thanks, ${first}. ` : ''}Your request is typed out in WhatsApp: press send there and we’ll reply with a price and a time. Didn’t open? Use the button below.`
      : `${first ? `Thanks, ${first}. ` : ''}We’ll ${S.you.contact === 'call' ? 'call you' : 'message you on WhatsApp'} with a price for your car and a confirmed time.`;
  const st = q<HTMLElement>('[data-q-done-status]')!;
  st.hidden = !doneStatus;
  st.textContent = doneStatus;
  const e = estimate(S, C);
  q('[data-q-done-sum]')!.textContent = [
    vehicleText(S),
    e.lines.map((l) => l.title).join(', '),
    whenText(S),
    e.count ? `Estimated from ${e.total ? aed(e.total) : 'inspection'}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  updateWhatsApp();
}
