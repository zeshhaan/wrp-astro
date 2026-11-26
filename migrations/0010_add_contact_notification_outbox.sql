-- New submissions enqueue each envelope in the same transaction as the lead.
CREATE TABLE contact_notification_outbox (
  lead_id INTEGER NOT NULL REFERENCES contact_submissions(id),
  audience TEXT NOT NULL CHECK (audience IN ('studio', 'agency')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'exhausted')),
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at INTEGER NOT NULL DEFAULT 0,
  lease_until INTEGER NOT NULL DEFAULT 0,
  lease_token TEXT,
  sent_at INTEGER,
  PRIMARY KEY (lead_id, audience)
) WITHOUT ROWID;
CREATE INDEX idx_contact_notification_due ON contact_notification_outbox(status, next_attempt_at);
