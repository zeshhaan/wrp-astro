-- Migration: Leads from the website's own quote form (the Studio hero form)
-- Date: 2026-10-26
--
-- A separate table, for the same reasons quote_requests is one (see 0003):
--
--   1. The form asks only for a name and a mobile number. contact_submissions
--      requires an email and a message, and SQLite cannot drop NOT NULL.
--   2. A visitor can press the button twice, or a flaky connection can resend.
--      Each form render carries its own request id, and the UNIQUE key on it
--      means a resend is acknowledged without a second row or a second email.

CREATE TABLE IF NOT EXISTS quote_form_leads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  vehicle TEXT,
  service_interest TEXT,
  -- Page the form was sent from, e.g. /services/ppf-dubai/.
  source_url TEXT,
  locale TEXT,
  attribution_json TEXT,
  outcome TEXT CHECK (outcome IS NULL OR outcome IN ('booked', 'lost')),
  outcome_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quote_form_leads_created_at
  ON quote_form_leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_form_leads_outcome
  ON quote_form_leads (outcome, outcome_at DESC);

DROP VIEW IF EXISTS leads;
CREATE VIEW leads AS
  SELECT
    'website' AS source, 'contact' AS lead_kind, id,
    name, email, phone, vehicle, service_interest, message,
    attribution_json, outcome, outcome_at, created_at
  FROM contact_submissions
  UNION ALL
  SELECT
    'popup' AS source, 'tally' AS lead_kind, id,
    name, email, phone, vehicle, service_interest, message,
    attribution_json, outcome, outcome_at, created_at
  FROM quote_requests
  UNION ALL
  SELECT
    'website' AS source, 'quote' AS lead_kind, id,
    name, NULL AS email, phone, vehicle, service_interest, NULL AS message,
    attribution_json, outcome, outcome_at, created_at
  FROM quote_form_leads;
