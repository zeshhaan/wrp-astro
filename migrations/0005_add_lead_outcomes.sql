-- Store one final operational outcome for either kind of lead. The endpoint
-- performs a conditional update so the first decision is the durable one.
ALTER TABLE contact_submissions ADD COLUMN outcome TEXT
  CHECK (outcome IS NULL OR outcome IN ('booked', 'lost'));
ALTER TABLE contact_submissions ADD COLUMN outcome_at DATETIME;

ALTER TABLE quote_requests ADD COLUMN outcome TEXT
  CHECK (outcome IS NULL OR outcome IN ('booked', 'lost'));
ALTER TABLE quote_requests ADD COLUMN outcome_at DATETIME;

CREATE INDEX IF NOT EXISTS idx_contact_submissions_outcome
  ON contact_submissions (outcome, outcome_at DESC);
CREATE INDEX IF NOT EXISTS idx_quote_requests_outcome
  ON quote_requests (outcome, outcome_at DESC);

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
  FROM quote_requests;
