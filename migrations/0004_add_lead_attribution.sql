-- Preserve website acquisition context with both lead sources so a later
-- booking can be matched back to the first and latest non-direct touch.
ALTER TABLE contact_submissions ADD COLUMN attribution_json TEXT;
ALTER TABLE quote_requests ADD COLUMN attribution_json TEXT;

DROP VIEW IF EXISTS leads;
CREATE VIEW leads AS
  SELECT
    'website' AS source,
    name, email, phone, vehicle, service_interest, message,
    attribution_json, created_at
  FROM contact_submissions
  UNION ALL
  SELECT
    'popup' AS source,
    name, email, phone, vehicle, service_interest, message,
    attribution_json, created_at
  FROM quote_requests;
