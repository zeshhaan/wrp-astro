# Website leads to the CRM

Every lead from the quote forms (hero, homepage, `/quote/`) and the contact page (`/api/contact`) is copied to the lead CRM (repo `zeshhaan/leads-crm`). Nothing else changes: the lead is still saved in D1 and emailed as before. Code: `src/lib/crm-handoff.ts`.

| Where | Binding `CRM` points to | What happens |
| --- | --- | --- |
| Live site | `wrp-crm` (WRP's private CRM, behind Cloudflare Access) | Saved and emailed as before, then handed to the CRM. |
| Worker Previews | `leads-crm` (the public demo, demo data) | Nothing saved or emailed. A test lead goes to the demo, marked "Sent from: Website preview". |

## How the hand-over works

1. Right after a form is saved, the lead is sent to the CRM over the service binding (in `waitUntil`, so the visitor never waits).
2. Every 5 minutes the cron sends anything that didn't arrive: 1, 2, 4 … minute backoff, capped at an hour, 12 tries (about 7 hours).
3. Each lead carries an `external_id` (`quote:<request id>` or `contact:<id>`), so the CRM never stores a resend twice.

State lives in `crm_handoffs` (migration 0009): `pending`, `sent` (with the CRM's lead id), `rejected` (the CRM refused the contents; not retried), `exhausted` (gave up), `skipped` (leads from before the migration).

## Checking on it

```bash
# Anything not yet in the CRM
npx wrangler d1 execute wrp-contact-forms --remote --command \
  "SELECT kind, lead_id, status, attempts, last_error FROM crm_handoffs WHERE status NOT IN ('sent','skipped')"

# Send an exhausted or rejected lead again on the next cron run
npx wrangler d1 execute wrp-contact-forms --remote --command \
  "UPDATE crm_handoffs SET status='pending', attempts=0, next_attempt_at=0 WHERE kind='quote' AND lead_id=123"

# Send older leads across too (the CRM ignores any it already has)
npx wrangler d1 execute wrp-contact-forms --remote --command \
  "DELETE FROM crm_handoffs WHERE status='skipped'"
```

Logs (Workers Observability) carry only ids: `crm_handoff_failed`, `crm_handoff_rejected`, `crm_handoff_deferred`, `crm_handoff_scheduler_failed`.

## Going live

1. Apply the migration to production D1 first: `npx wrangler d1 migrations apply wrp-contact-forms --remote`.
2. `wrp-crm` must already have the `LeadIntake` entrypoint (leads-crm issue #3 merged and deployed).
3. Merge. Until both are in place, leads are still saved and emailed; the hand-over just waits and retries.
