-- Preserve the optional email and notes collected by the Studio homepage form.
-- Existing hero leads remain valid: both added columns are nullable.
ALTER TABLE quote_form_leads ADD COLUMN email TEXT;
ALTER TABLE quote_form_leads ADD COLUMN notes TEXT;

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
    name, email, phone, vehicle, service_interest,
    CASE
      WHEN notes IS NOT NULL AND trim(notes) <> '' THEN notes ||
        CASE reply_by
          WHEN 'call' THEN char(10) || 'Asked for a call back'
          WHEN 'whatsapp' THEN char(10) || 'Asked for a WhatsApp reply'
          ELSE ''
        END
      ELSE CASE reply_by
        WHEN 'call' THEN 'Asked for a call back'
        WHEN 'whatsapp' THEN 'Asked for a WhatsApp reply'
      END
    END AS message,
    attribution_json, outcome, outcome_at, created_at
  FROM quote_form_leads;
