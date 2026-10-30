-- Migration: Track whether each quote form lead's notification email went out
-- Date: 2026-10-30
--
-- The lead is saved before its email is sent, so a failed email used to leave
-- no trace on the row. These columns let the request, a resend and the
-- Worker's Cron Trigger retry it (src/lib/quote-lead-notify.ts), and let anyone
-- list saved but unemailed leads:
--
--   SELECT id, created_at, notify_attempts, notify_error
--   FROM quote_form_leads WHERE notified_at IS NULL ORDER BY id;
--
-- Rows from before this migration have no email record: they count as unsent
-- with no tries, so the scheduled retry emails them once.

ALTER TABLE quote_form_leads ADD COLUMN notified_at DATETIME;
ALTER TABLE quote_form_leads ADD COLUMN notify_attempts INTEGER NOT NULL DEFAULT 0;
-- Error type of the last failed try (no customer details).
ALTER TABLE quote_form_leads ADD COLUMN notify_error TEXT;

CREATE INDEX IF NOT EXISTS idx_quote_form_leads_unnotified
  ON quote_form_leads (id) WHERE notified_at IS NULL;
