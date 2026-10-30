# Quote notification recovery

Studio's quote action acknowledges a lead after D1 saves the lead and its notification job together in one transaction. A missing email binding or a failed send leaves a durable retry job. A missing outbox migration rolls back the insert and returns an error to the visitor. Legacy `/api/contact` and Tally email delivery are outside this change.

## Deploy in order

1. Apply migration **0008 after 0006 and 0007**, before deploying this code: `bunx wrangler d1 migrations apply wrp-contact-forms --remote`. Review the pending migration list first. The new table does not change existing leads or the combined leads view, and does not enqueue old leads whose emails may already have been delivered.
2. Merge/deploy through the existing Cloudflare Workers Builds production workflow. `wrangler.jsonc` points at `src/worker.ts`, which preserves Astro's fetch handler and adds the scheduled handler. Its `*/5 * * * *` trigger must be present on the deployed production Worker; confirm this in Cloudflare after deployment. Cron propagation can take several minutes.
3. Confirm the production D1 and EMAIL bindings and both allowed destination addresses remain configured. The primary lead email goes to `wrp.detailing@gmail.com`; backlog alerts go to the already allowed operator destination `work.zeeshan@gmail.com`. The optional agency copy remains best effort and cannot cause a successful client notification to repeat.
4. Preview runs and `/design-lab/` forms remain dry runs. Preview cron invocations exit without processing jobs. A successful preview cannot validate production notifications.
5. Submit one clearly identified, authorized live test after deployment. Check its quote row and outbox row, received notification, outcome links, and cron invocation logs. GA4/GTM verification remains a separate browser check.

## Behavior and monitoring

The initial request attempts delivery immediately. Cron processes up to 20 due jobs every five minutes. Claims use a ten-minute lease and unique claim token. Crashed claims are reclaimed after expiry. A failure retries with exponential backoff from one minute to a one-hour cap, up to eight attempts including the first. An exhausted job stays in D1 for inspection and manual retry.

Cron sends a digest for jobs still unsent after 30 minutes or already exhausted. A successful alert is recorded once per job. Failed alerts retry after a ten-minute lease cooldown. Structured error logs include lead IDs and counts only, never submitted details or raw provider errors. The digest also contains IDs only. Inspect Cloudflare Worker logs for `Quote notification backlog needs attention`, `Quote notification scheduler failed`, and `Quote notification backlog alert could not be sent`.

Alerts share the EMAIL binding with notifications: during an email-service outage they may fail too. They retry when the service recovers, and backlog logs remain available. This is **not independent outage alerting**; an external Cloudflare log/availability alert must be configured separately if immediate notice during that outage is required. Neither an unobserved log nor this same-channel digest guarantees paging an operator.

Delivery is **at least once**, not exactly once: if the provider accepts email and the Worker crashes before acknowledging it in D1, recovery can resend. The stable `Lead #ID` subject helps identify repeats. A `sent` row means the provider accepted the email, not proof of inbox placement.

Read-only backlog inspection (timestamps are Unix milliseconds):

```sql
SELECT lead_id, status, attempts, last_error,
  datetime(created_at / 1000, 'unixepoch') AS created_utc,
  datetime(next_attempt_at / 1000, 'unixepoch') AS retry_utc,
  datetime(sent_at / 1000, 'unixepoch') AS sent_utc,
  datetime(alerted_at / 1000, 'unixepoch') AS alerted_utc
FROM quote_notification_outbox
WHERE status <> 'sent'
ORDER BY created_at;
```

After fixing a binding/provider problem and checking whether the team already received the email, requeue one selected unsent job (replace `123` with the reviewed ID):

```sql
UPDATE quote_notification_outbox
SET status = 'pending', attempts = 0, next_attempt_at = 0,
  lease_until = 0, lease_token = NULL, last_error = NULL,
  alerted_at = NULL, alert_lease_until = 0, alert_lease_token = NULL
WHERE lead_id = 123 AND status <> 'sent' AND lease_until <= unixepoch() * 1000;
```

The next cron will retry. Do not reset sent jobs routinely. For a genuinely unnotified historical quote predating migration 0008, inspect it first and explicitly insert its ID into the outbox; automatic backfill is intentionally absent. Keep customer details out of logs, screenshots and tickets.

## Local checks

`bun test src/lib/quote-notification-recovery.test.ts src/lib/lead-email-delivery.test.ts` uses SQLite to verify transaction rollback when migration 0008 is missing, idempotency, backoff, successful retry, concurrent claims, crash recovery, exhaustion, alert retry, and no historical backfill. Run `bun run build` to verify the custom Astro Worker entrypoint bundles. For a local Wrangler scheduled-event smoke test, use `wrangler dev --test-scheduled` with local D1 migrations applied and request `/__scheduled`; never bind a local failure test to production D1 or email.
