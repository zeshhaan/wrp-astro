-- Migration: hand website leads to the lead CRM (leads-crm, issue #3 there)
-- Date: 2026-11-04
--
-- One row per website lead that has been (or is being) handed to the CRM over
-- the CRM service binding. The lead itself is saved and emailed exactly as
-- before; this table only tracks the hand-over, so a CRM outage can never stop
-- a lead from being saved.
--
-- A lead with no row here is picked up by the next hand-over run (after the
-- form, and every 5 minutes from the cron). Leads that existed before this
-- migration are marked 'skipped' so the CRM starts from today, not from the
-- site's whole history. Delete those rows to send the history across too.

CREATE TABLE IF NOT EXISTS crm_handoffs (
  -- 'quote' (quote_form_leads) or 'contact' (contact_submissions).
  kind TEXT NOT NULL CHECK (kind IN ('quote', 'contact')),
  lead_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'rejected', 'exhausted', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  -- The lead's id in the CRM once accepted.
  crm_lead_id INTEGER,
  last_error TEXT,
  sent_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  PRIMARY KEY (kind, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_crm_handoffs_due ON crm_handoffs (status, next_attempt_at);

INSERT OR IGNORE INTO crm_handoffs (kind, lead_id, status)
  SELECT 'quote', id, 'skipped' FROM quote_form_leads;
INSERT OR IGNORE INTO crm_handoffs (kind, lead_id, status)
  SELECT 'contact', id, 'skipped' FROM contact_submissions;
