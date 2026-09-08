/// <reference types="astro/client" />

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
  }
}
