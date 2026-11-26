import { NOTIFICATION_LEASE_MS, NOTIFICATION_MAX_ATTEMPTS, notificationRetryDelay } from './quote-notification-recovery';

export const CONTACT_STUDIO_EMAIL = 'wrp.detailing@gmail.com';

type Contact = {
  name: string;
  email: string;
  phone: string | null;
  vehicle: string | null;
  service_interest: string | null;
  message: string;
  attribution_json: string | null;
};

export type StoredContact = Contact & { id: number; created_at: string };

export async function saveContactWithNotifications(db: D1Database, lead: Contact, agencyEmail?: string): Promise<number> {
  const copy = agencyEmail?.trim();
  const destinations = [['studio', CONTACT_STUDIO_EMAIL]];
  if (copy && copy.toLowerCase() !== CONTACT_STUDIO_EMAIL) destinations.push(['agency', copy]);

  // The batch owns the write transaction. The newest AUTOINCREMENT id is the
  // contact just inserted, including when other requests are waiting to write.
  const [inserted] = await db.batch([
    db.prepare(`INSERT INTO contact_submissions
      (name, email, phone, vehicle, service_interest, message, attribution_json)
      VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(lead.name, lead.email, lead.phone, lead.vehicle,
        lead.service_interest, lead.message, lead.attribution_json),
    ...destinations.map(([audience, address]) => db.prepare(`INSERT INTO contact_notification_outbox
      (lead_id, audience, recipient) SELECT MAX(id), ?, ? FROM contact_submissions`).bind(audience, address)),
  ]);
  const id = Number(inserted.meta.last_row_id);
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('ContactLeadIdUnavailable');
  return id;
}

type Job = { lead_id: number; audience: 'studio' | 'agency'; recipient: string };
type Options = {
  db: D1Database;
  send: (lead: StoredContact, recipient: string) => Promise<void>;
  leadId?: number;
  now?: () => number;
};

export async function recoverContactNotifications({ db, send, leadId, now = Date.now }: Options): Promise<void> {
  const timestamp = now();
  if (leadId === undefined) {
    // The Worker may have stopped during its last allowed attempt.
    await db.prepare(`UPDATE contact_notification_outbox SET status = 'exhausted', lease_token = NULL
      WHERE status = 'pending' AND attempts >= ? AND lease_until <= ?`)
      .bind(NOTIFICATION_MAX_ATTEMPTS, timestamp).run();
  }
  const due = await db.prepare(`SELECT lead_id, audience, recipient FROM contact_notification_outbox
    WHERE status = 'pending' AND next_attempt_at <= ? AND lease_until <= ?
      AND (? IS NULL OR lead_id = ?)
    ORDER BY next_attempt_at, lead_id, audience DESC LIMIT 20`)
    .bind(timestamp, timestamp, leadId ?? null, leadId ?? null).all<Job>();

  for (const job of due.results) {
    const token = crypto.randomUUID();
    const claimTime = now();
    const claimed = await db.prepare(`UPDATE contact_notification_outbox SET attempts = attempts + 1,
      lease_until = ?, lease_token = ? WHERE lead_id = ? AND audience = ? AND status = 'pending'
      AND next_attempt_at <= ? AND lease_until <= ? AND attempts < ? RETURNING attempts`)
      .bind(claimTime + NOTIFICATION_LEASE_MS, token, job.lead_id, job.audience,
        claimTime, claimTime, NOTIFICATION_MAX_ATTEMPTS).first<{ attempts: number }>();
    if (!claimed) continue;

    const lead = await db.prepare('SELECT * FROM contact_submissions WHERE id = ?').bind(job.lead_id).first<StoredContact>();
    if (!lead) throw new Error('ContactLeadUnavailable');
    try {
      await send(lead, job.recipient);
    } catch {
      const status = claimed.attempts >= NOTIFICATION_MAX_ATTEMPTS ? 'exhausted' : 'pending';
      await db.prepare(`UPDATE contact_notification_outbox SET status = ?, next_attempt_at = ?,
        lease_until = 0, lease_token = NULL WHERE lead_id = ? AND audience = ? AND lease_token = ?`)
        .bind(status, now() + notificationRetryDelay(claimed.attempts), job.lead_id, job.audience, token).run();
      console.error(JSON.stringify({ event: 'contact_notification_delivery_failed', leadId: job.lead_id,
        audience: job.audience, attempts: claimed.attempts, status }));
      continue;
    }
    await db.prepare(`UPDATE contact_notification_outbox SET status = 'sent', sent_at = ?,
      lease_until = 0, lease_token = NULL WHERE lead_id = ? AND audience = ? AND lease_token = ?`)
      .bind(now(), job.lead_id, job.audience, token).run();
  }
}
