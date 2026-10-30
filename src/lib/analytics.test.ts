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
type ActionReply = { data?: { saved: boolean; ignored: boolean }; error?: unknown };
function configurator(reply: () => Promise<ActionReply>) {
  const calls: Map<string, string>[] = [];
  const leads: unknown[] = [];
  const finished: string[] = [];
  const problems: unknown[] = [];
  const button = { disabled: false };
  const status = { hidden: true, textContent: '' };
  let ids = 0;
  const context = {
    submitting: false,
    form: {},
    requestId: 'request-0',
    crypto: { randomUUID: () => `request-${++ids}` },
    location: { pathname: '/design-lab/studio/quote/' },
    PREVIEW_NOTE: 'preview-note',
    S: {},
    C: {},
    quoteLeadFields: () => ({ name: 'Sara', phone: '050 123 4567', email: '' }),
    input: () => ({ value: '' }),
    problems: () => [],
    showProblems: (value: unknown[]) => problems.push(...value),
    q: (selector: string) => (selector === '[data-qo-status]' ? status : button),
    FormData: class extends Map<string, string> { constructor() { super(); } },
    CustomEvent: class { constructor(public type: string, public options: unknown) {} },
    window: { WRPAttribution: { serialize: () => 'attribution-fixture' }, setTimeout },
    document: { dispatchEvent: (event: unknown) => leads.push(event) },
    actions: { quote: (data: Map<string, string>) => { calls.push(data); return reply(); } },
    finish: (via: string) => finished.push(via),
  };
  const submit = runInNewContext(`${submitSource}\nonSubmit`, context) as (event: unknown) => void;
  return { calls, leads, finished, problems, button, status, submit: () => submit({ preventDefault() {} }) };
}

describe('configurator live-path tracking', () => {
  test('sends to the quote action and counts one saved lead despite repeated submit while pending', async () => {
    const c = configurator(async () => ({ data: { saved: true, ignored: false } }));
    c.submit();
    c.submit();
    expect(c.calls).toHaveLength(1);
    expect(c.calls[0].get('attribution')).toBe('attribution-fixture');
    expect(c.calls[0].get('email')).toBe('');
    expect(c.calls[0].get('requestId')).toBe('request-0');
    expect(c.calls[0].get('page')).toBe('/design-lab/studio/quote/');
    await settle();
    expect(c.leads).toEqual([{ type: 'wrp:lead', options: { detail: { form: 'configurator' } } }]);
    expect(c.finished).toEqual(['form']);
    expect(c.status.hidden).toBe(true);
    expect(c.button.disabled).toBe(false);
  });

  test('a preview dry run finishes with the preview note and no lead event', async () => {
    const c = configurator(async () => ({ data: { saved: false, ignored: false } }));
    c.submit();
    await settle();
    expect(c.leads).toHaveLength(0);
    expect(c.finished).toEqual(['form']);
    expect(c.status.hidden).toBe(false);
    expect(c.status.textContent).toBe('preview-note');
  });

  test('a discarded honeypot submission looks sent but is not a lead', async () => {
    const c = configurator(async () => ({ data: { saved: false, ignored: true } }));
    c.submit();
    await settle();
    expect(c.leads).toHaveLength(0);
    expect(c.finished).toEqual(['form']);
    expect(c.status.hidden).toBe(true);
  });

  test('action errors, missing results and network failures do not count as leads, and a retry reuses the request id', async () => {
    for (const reply of [
      async () => ({ error: { code: 'SERVICE_UNAVAILABLE' } }),
      async () => ({ error: { code: 'BAD_REQUEST' } }),
      async () => ({}),
      async () => { throw new Error('offline'); },
    ]) {
      const c = configurator(reply);
      c.submit();
      await settle();
      expect(c.leads).toHaveLength(0);
      expect(c.finished).toHaveLength(0);
      expect(c.problems).toHaveLength(1);
      expect(c.button.disabled).toBe(false);
      c.submit();
      expect(c.calls[1].get('requestId')).toBe(c.calls[0].get('requestId'));
    }
  });
});
