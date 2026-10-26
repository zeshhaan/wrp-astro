/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Turnstile widget site key for the quote form (public). A Workers Builds build variable. */
  readonly PUBLIC_TURNSTILE_SITEKEY?: string;
}

interface Window {
  WRPAttribution?: {
    read: () => unknown;
    serialize: () => string;
    currentPage: () => string;
  };
  __wrpTallyPopup?: { armForPage: () => void };
  Tally?: {
    openPopup: (formId: string, options: Record<string, unknown>) => void;
  };
}

declare namespace Cloudflare {
  interface Env {
    /** Optional reporting copy for the standard contact-form notification. */
    AGENCY_COPY_EMAIL?: string;
    /** HMAC secret for expiring, single-use lead outcome action links. */
    LEAD_OUTCOME_SIGNING_SECRET?: string;
    /** Required by the Tally webhook, which rejects requests when it is absent. */
    TALLY_SIGNING_SECRET?: string;
    /** "preview" on Worker Previews (wrangler.jsonc `previews.vars`), unset in production. */
    ENVIRONMENT?: string;
    /** Turnstile widget secret for the quote form. Without it, live quote leads skip the bot check. */
    TURNSTILE_SECRET?: string;
    /** Comma-separated frontend hostnames Siteverify must report. Defaults to the two live hostnames. */
    TURNSTILE_HOSTNAMES?: string;
  }
}
