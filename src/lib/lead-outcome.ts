export const LEAD_OUTCOMES = ['booked', 'lost'] as const;
export const LEAD_KINDS = ['contact', 'tally'] as const;

export type LeadOutcome = (typeof LEAD_OUTCOMES)[number];
export type LeadKind = (typeof LEAD_KINDS)[number];

export type LeadOutcomeAction = {
  kind: LeadKind;
  id: number;
  outcome: LeadOutcome;
  expiresAt: number;
};

export type LeadOutcomeLinks = Record<LeadOutcome, string>;

export type RecordLeadOutcomeResult =
  | { state: 'recorded'; outcome: LeadOutcome; outcomeAt: string }
  | { state: 'already-recorded'; outcome: LeadOutcome; outcomeAt: string }
  | { state: 'not-found' };

const TOKEN_VERSION = 'v1';
const TOKEN_LIFETIME_SECONDS = 90 * 24 * 60 * 60;
const MINIMUM_SECRET_LENGTH = 32;

const TABLES: Record<LeadKind, string> = {
  contact: 'contact_submissions',
  tally: 'quote_requests',
};

function isLeadKind(value: string): value is LeadKind {
  return LEAD_KINDS.includes(value as LeadKind);
}

function isLeadOutcome(value: string): value is LeadOutcome {
  return LEAD_OUTCOMES.includes(value as LeadOutcome);
}

function assertStrongSecret(secret: string): void {
  if (!leadOutcomeSigningSecretIsValid(secret)) {
    throw new Error('LEAD_OUTCOME_SIGNING_SECRET must be at least 32 characters');
  }
}

export function leadOutcomeSigningSecretIsValid(secret: string | undefined): secret is string {
  return typeof secret === 'string' && secret.length >= MINIMUM_SECRET_LENGTH;
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeBase64Url(value: string): ArrayBuffer | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;

  try {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer as ArrayBuffer;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  assertStrongSecret(secret);
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

function serializeAction(action: LeadOutcomeAction): string {
  return [TOKEN_VERSION, action.kind, action.id, action.outcome, action.expiresAt].join('.');
}

export async function createLeadOutcomeToken(
  action: Omit<LeadOutcomeAction, 'expiresAt'>,
  secret: string,
  now = Date.now(),
): Promise<string> {
  if (!Number.isSafeInteger(action.id) || action.id < 1) throw new Error('Lead id must be a positive integer');

  const payload = serializeAction({
    ...action,
    expiresAt: Math.floor(now / 1_000) + TOKEN_LIFETIME_SECONDS,
  });
  const signature = await crypto.subtle.sign(
    'HMAC',
    await hmacKey(secret),
    new TextEncoder().encode(payload),
  );

  return `${payload}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifyLeadOutcomeToken(
  token: string,
  secret: string,
  now = Date.now(),
): Promise<LeadOutcomeAction | null> {
  const parts = token.split('.');
  if (parts.length !== 6) return null;

  const [version, kindValue, idValue, outcomeValue, expiresValue, signatureValue] = parts;
  if (version !== TOKEN_VERSION || !isLeadKind(kindValue) || !isLeadOutcome(outcomeValue)) return null;
  if (!/^\d+$/.test(idValue) || !/^\d+$/.test(expiresValue)) return null;

  const id = Number(idValue);
  const expiresAt = Number(expiresValue);
  if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(expiresAt)) return null;
  if (expiresAt < Math.floor(now / 1_000)) return null;

  const signature = decodeBase64Url(signatureValue);
  if (!signature) return null;

  const payload = parts.slice(0, 5).join('.');
  const valid = await crypto.subtle.verify(
    'HMAC',
    await hmacKey(secret),
    signature,
    new TextEncoder().encode(payload),
  );

  return valid ? { kind: kindValue, id, outcome: outcomeValue, expiresAt } : null;
}

export async function createLeadOutcomeLinks(
  origin: string,
  lead: { kind: LeadKind; id: number },
  secret: string,
  now = Date.now(),
): Promise<LeadOutcomeLinks> {
  const makeLink = async (outcome: LeadOutcome) => {
    const url = new URL('/internal/lead-outcome/', origin);
    url.searchParams.set('token', await createLeadOutcomeToken({ ...lead, outcome }, secret, now));
    return url.toString();
  };

  return {
    booked: await makeLink('booked'),
    lost: await makeLink('lost'),
  };
}

export function renderLeadOutcomeActions(links: LeadOutcomeLinks): string {
  const button = (label: string, href: string, background: string) =>
    `<a href="${escapeHtml(href)}" style="display: inline-block; margin: 4px; padding: 11px 20px; border-radius: 4px; background: ${background}; color: #fff; font-weight: bold; text-decoration: none;">${label}</a>`;

  return `
    <div style="margin-top: 18px; padding: 16px; border: 1px solid #ddd; background: #fff; text-align: center;">
      <strong>Update lead outcome</strong>
      <div style="margin-top: 8px;">
        ${button('Booked', links.booked, '#176b3a')}
        ${button('Lost', links.lost, '#7a2630')}
      </div>
      <p style="margin: 8px 0 0; color: #666; font-size: 12px;">Opens a confirmation page. The first recorded outcome cannot be overwritten.</p>
    </div>`;
}

export async function recordLeadOutcome(
  db: D1Database,
  action: Pick<LeadOutcomeAction, 'kind' | 'id' | 'outcome'>,
  now = new Date(),
): Promise<RecordLeadOutcomeResult> {
  const table = TABLES[action.kind];
  const outcomeAt = now.toISOString();
  const update = await db
    .prepare(`UPDATE ${table} SET outcome = ?, outcome_at = ? WHERE id = ? AND outcome IS NULL`)
    .bind(action.outcome, outcomeAt, action.id)
    .run();

  if (update.meta.changes === 1) {
    return { state: 'recorded', outcome: action.outcome, outcomeAt };
  }

  const existing = await db
    .prepare(`SELECT outcome, outcome_at AS outcomeAt FROM ${table} WHERE id = ?`)
    .bind(action.id)
    .first<{ outcome: LeadOutcome | null; outcomeAt: string | null }>();

  if (!existing) return { state: 'not-found' };
  if (existing.outcome && existing.outcomeAt) {
    return { state: 'already-recorded', outcome: existing.outcome, outcomeAt: existing.outcomeAt };
  }

  throw new Error('Lead outcome update did not complete');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
