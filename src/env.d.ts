/// <reference types="astro/client" />

declare namespace Cloudflare {
  interface Env {
    /** Optional reporting copy for the standard contact-form notification. */
    AGENCY_COPY_EMAIL?: string;
    /** Required by the Tally webhook, which rejects requests when it is absent. */
    TALLY_SIGNING_SECRET?: string;
  }
}
