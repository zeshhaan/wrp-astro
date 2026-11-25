/**
 * Browser side of the Turnstile check (see turnstile.ts for the server rules).
 *
 * The script loads only when a visitor starts on a form (first focus or tap),
 * so pages without an enquiry stay as light as before. On submit we ask for a
 * token. Most visitors never see anything; Cloudflare shows a small checkbox
 * above the button only when it is unsure. If no token arrives in time (script
 * blocked, slow network), the form still sends without one: the server lets
 * that through, so a lead is never lost to the check itself.
 */
import { TURNSTILE_SITE_KEY } from '@/consts';

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
const FIELD = 'cf-turnstile-response';

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string | undefined;
  execute: (widgetId: string) => void;
  reset: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let loading: Promise<TurnstileApi | null> | null = null;

function loadScript(): Promise<TurnstileApi | null> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve(window.turnstile ?? null);
    script.onerror = () => {
      loading = null;
      resolve(null);
    };
    document.head.appendChild(script);
  });
  return loading;
}

export interface FormGuard {
  /** A fresh token, or null when none arrives in time. Never rejects. */
  token: () => Promise<string | null>;
  /** Puts the token in the form data under Turnstile's field name, when there is one. */
  addTo: (data: FormData) => Promise<void>;
}

export function guardForm(form: HTMLElement, waitMs = 8000): FormGuard {
  let widgetId: string | undefined;
  let pending: ((token: string | null) => void) | null = null;
  const settle = (token: string | null) => {
    const done = pending;
    pending = null;
    done?.(token);
  };

  const ensureWidget = async (): Promise<boolean> => {
    if (widgetId) return true;
    const api = await loadScript();
    if (!api) return false;
    // One slot per form, just above the submit button, empty until needed.
    let slot = form.querySelector<HTMLElement>('[data-turnstile-slot]');
    if (!slot) {
      slot = document.createElement('div');
      slot.setAttribute('data-turnstile-slot', '');
      const button = form.querySelector('button[type="submit"]');
      if (button?.parentElement) button.parentElement.insertBefore(slot, button);
      else form.appendChild(slot);
    }
    try {
      widgetId = api.render(slot, {
        sitekey: TURNSTILE_SITE_KEY,
        execution: 'execute',
        appearance: 'interaction-only',
        language: document.documentElement.lang?.startsWith('ar') ? 'ar' : 'auto',
        // The token travels in our own FormData, not a hidden input.
        'response-field': false,
        callback: (token: string) => settle(token),
        'error-callback': () => {
          settle(null);
          return true;
        },
        'expired-callback': () => undefined,
        'timeout-callback': () => settle(null),
      });
    } catch {
      widgetId = undefined;
    }
    return Boolean(widgetId);
  };

  // Warm up on the first sign of interest, so the token is quick at submit.
  const warm = () => void ensureWidget();
  form.addEventListener('focusin', warm, { once: true });
  form.addEventListener('pointerdown', warm, { once: true });

  const token = async (): Promise<string | null> => {
    if (!(await ensureWidget()) || !widgetId || !window.turnstile) return null;
    const api = window.turnstile;
    const id = widgetId;
    settle(null);
    const result = new Promise<string | null>((resolve) => {
      pending = resolve;
      setTimeout(() => settle(null), waitMs);
    });
    try {
      // Tokens are single use: start from a clean widget every time.
      api.reset(id);
      api.execute(id);
    } catch {
      settle(null);
    }
    return result;
  };

  return {
    token,
    addTo: async (data) => {
      const value = await token();
      if (value) data.set(FIELD, value);
    },
  };
}
