-- The action inserts each NEW quote and its outbox job in one D1 batch. Existing leads are deliberately
-- not backfilled because their previous best-effort email may already be sent.
CREATE TABLE quote_notification_outbox (
  lead_id INTEGER PRIMARY KEY REFERENCES quote_form_leads(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'exhausted')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  last_error TEXT,
  sent_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  alerted_at INTEGER,
  alert_lease_until INTEGER NOT NULL DEFAULT 0,
  alert_lease_token TEXT
);
CREATE INDEX idx_quote_notification_due ON quote_notification_outbox(status, next_attempt_at);
