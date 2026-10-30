import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const analyticsSource = readFileSync(new URL('../components/Analytics.astro', import.meta.url), 'utf8')
  .split('<script is:inline define:vars={{ GTM_ID, ANALYTICS_HOSTNAMES, TALLY_FORM_ID }}>')[1]
  .split('</script>')[0];

type Listener = (event: unknown) => void;
function analytics(hostname = 'wrpdetailing.ae') {
  const events = new Map<string, Listener>();
  const messages = new Map<string, Listener>();
  const dataLayer: Record<string, unknown>[] = [];
  const scripts: unknown[] = [];
  const context = {
    GTM_ID: 'GTM-TEST',
    ANALYTICS_HOSTNAMES: ['wrpdetailing.ae', 'www.wrpdetailing.ae'],
    TALLY_FORM_ID: 'test-form',
    URL,
    window: { location: { hostname }, dataLayer, addEventListener: (type: string, listener: Listener) => messages.set(type, listener) },
    document: {
      addEventListener: (type: string, listener: Listener) => events.set(type, listener),
      createElement: () => ({}),
      head: { appendChild: (script: unknown) => scripts.push(script) },
    },
  };
  runInNewContext(analyticsSource, context);
  return {
    context, scripts, dataLayer,
    lead: (detail: unknown) => events.get('wrp:lead')?.({ detail }),
    message: (origin: string, data: unknown) => messages.get('message')?.({ origin, data }),
    click: (href: string) => events.get('click')?.({ target: { closest: () => ({ href }) } }),
    leads: () => dataLayer.filter((event) => event.event === 'generate_lead'),
  };
}

describe('analytics event boundary', () => {
  test('permits only known native form identifiers and drops customer fields', () => {
    const a = analytics();
    for (const form of ['hero', 'homepage', 'contact_page', 'configurator']) {
      a.lead({ form, email: 'customer@example.test', message: 'private message' });
      expect(a.leads().at(-1)).toEqual({ event: 'generate_lead', method: 'contact_form', form_id: form });
    }
    a.lead({ form: 'customer@example.test' });
    a.lead({ form: 'tally_popup' });
    a.lead(undefined);
    expect(a.leads()).toHaveLength(4);
  });

  test('accepts only the configured Tally form from the Tally origin', () => {
    const a = analytics();
    const data = JSON.stringify({ event: 'Tally.FormSubmitted', payload: { formId: 'test-form', answers: ['private'] } });
    a.message('https://outside.example', data);
    a.message('https://tally.so', data.replace('test-form', 'other-form'));
    a.message('https://tally.so', '{');
    expect(a.leads()).toHaveLength(0);
    a.message('https://tally.so', data);
    expect(a.leads()).toEqual([{ event: 'generate_lead', method: 'tally_popup', form_id: 'tally_popup' }]);
  });

  test('clears preceding form identity on intent clicks and never sends the link URL', () => {
    const a = analytics();
    a.lead({ form: 'hero' });
    a.click('https://wa.me/971000000000?text=private');
    a.click('tel:+971000000000');
    expect(a.dataLayer.slice(-2)).toEqual([
      { event: 'whatsapp_click', method: 'whatsapp', form_id: null },
      { event: 'phone_click', method: 'phone', form_id: null },
    ]);
  });

  test('does not load GTM or install event listeners on previews or localhost', () => {
    for (const hostname of ['studio-preview.workers.dev', 'localhost', 'wrpdetailing.ae.outside.example']) {
      const a = analytics(hostname);
      a.lead({ form: 'hero' });
      expect(a.scripts).toHaveLength(0);
      expect(a.dataLayer).toHaveLength(0);
    }
  });

  test('does not reload GTM when the inline script runs again', () => {
    const a = analytics();
    runInNewContext(analyticsSource, a.context);
    a.lead({ form: 'hero' });
    expect(a.scripts).toHaveLength(1);
    expect(a.leads()).toHaveLength(1);
  });
});

// Run the actual submit handler with an isolated DOM/API boundary. No lead or
// analytics requests leave the test process, including the successful case.
const quoteSource = readFileSync(new URL('../designs/studio/quote/one-page/one.ts', import.meta.url), 'utf8');
const submitSource = new Bun.Transpiler({ loader: 'ts' }).transformSync(
  quoteSource.slice(quoteSource.indexOf('function onSubmit('), quoteSource.indexOf('\nfunction finish(')),
);
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
function configurator(response: Promise<{ ok: boolean; json: () => Promise<unknown> }>, demo = false) {
  const calls: { body: Map<string, string> }[] = [];
  const leads: unknown[] = [];
  const finished: string[] = [];
  const problems: unknown[] = [];
  const button = { disabled: false };
  const context = {
    submitting: false,
    form: { action: '/api/contact', hasAttribute: () => demo },
    problems: () => [],
    showProblems: (value: unknown[]) => problems.push(...value),
    fillHidden: () => {},
    q: () => button,
    FormData: class extends Map<string, string> { constructor() { super(); } },
    CustomEvent: class { constructor(public type: string, public options: unknown) {} },
    window: { WRPAttribution: { serialize: () => 'attribution-fixture' }, setTimeout },
    document: { dispatchEvent: (event: unknown) => leads.push(event) },
    fetch: (_url: string, request: { body: Map<string, string> }) => { calls.push(request); return response; },
    finish: (via: string) => finished.push(via),
  };
  const submit = runInNewContext(`${submitSource}\nonSubmit`, context) as (event: unknown) => void;
  return { calls, leads, finished, problems, button, submit: () => submit({ preventDefault() {}, stopPropagation() {} }) };
}

describe('configurator live-path tracking', () => {
  test('attaches attribution and counts one confirmed success despite repeated submit while pending', async () => {
    const c = configurator(Promise.resolve({ ok: true, json: async () => ({ success: true }) }));
    c.submit();
    c.submit();
    expect(c.calls).toHaveLength(1);
    expect(c.calls[0].body.get('attribution')).toBe('attribution-fixture');
    await settle();
    expect(c.leads).toEqual([{ type: 'wrp:lead', options: { detail: { form: 'configurator' } } }]);
    expect(c.finished).toEqual(['form']);
    expect(c.button.disabled).toBe(false);
  });

  test('demo success never submits to the API or generates a lead event', async () => {
    const c = configurator(Promise.resolve({ ok: true, json: async () => ({ success: true }) }), true);
    c.submit();
    await settle();
    expect(c.calls).toHaveLength(0);
    expect(c.leads).toHaveLength(0);
  });

  test('HTTP errors, rejected submissions, invalid JSON and ambiguous responses do not count as leads', async () => {
    for (const response of [
      { ok: false, json: async () => ({ success: true }) },
      { ok: true, json: async () => ({ success: false }) },
      { ok: true, json: async () => { throw new Error('invalid JSON'); } },
      { ok: true, json: async () => ({}) },
      { ok: true, json: async () => ({ success: 'true' }) },
    ]) {
      const c = configurator(Promise.resolve(response));
      c.submit();
      await settle();
      expect(c.leads).toHaveLength(0);
      expect(c.finished).toHaveLength(0);
      expect(c.problems).toHaveLength(1);
      expect(c.button.disabled).toBe(false);
    }
  });
});
