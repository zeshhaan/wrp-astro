-- Migration: Quote requests captured by the Tally popup form
-- Date: 2026-08-02
--
-- Deliberately a separate table from contact_submissions rather than a shared
-- one. Two reasons:
--
--   1. The popup's email question is optional (a WhatsApp-only lead is a
--      perfectly good lead), but contact_submissions.email is NOT NULL. SQLite,
--      and therefore D1, cannot drop a NOT NULL constraint with ALTER TABLE, so
--      reusing that table would mean rebuilding it and copying live rows.
--   2. Tally retries webhooks it considers failed. Without a UNIQUE key on its
--      submission id, one enquiry eventually lands twice.
--
-- The `leads` view below restores the single-inbox view over both sources.

CREATE TABLE IF NOT EXISTS quote_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  -- Tally's own id for the submission. UNIQUE is what makes the webhook
  -- idempotent: a retried delivery hits the conflict and is ignored.
  tally_submission_id TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  email TEXT,
  vehicle TEXT,
  service_interest TEXT,
  message TEXT,
  -- Page the popup was submitted from, via a Tally hidden field. Lets you see
  -- which pages actually generate enquiries.
  source_url TEXT,
  -- Full webhook body. If a question is renamed in Tally and the field mapping
  -- silently stops matching, the answer is still recoverable from here.
  raw_payload TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quote_requests_created_at
  ON quote_requests (created_at DESC);

-- One query for every lead regardless of where it came from.
DROP VIEW IF EXISTS leads;
CREATE VIEW leads AS
  SELECT
    'website' AS source,
    name, email, phone, vehicle, service_interest, message, created_at
  FROM contact_submissions
  UNION ALL
  SELECT
    'popup' AS source,
    name, email, phone, vehicle, service_interest, message, created_at
  FROM quote_requests;
