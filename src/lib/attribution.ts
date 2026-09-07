export type AttributionTouch = {
  source: string;
  medium: string;
  campaign?: string;
  content?: string;
  term?: string;
  landing_page: string;
  referrer?: string;
  captured_at: string;
};

export type LeadAttribution = {
  version: 1;
  first: AttributionTouch;
  last: AttributionTouch;
};

const MAX_JSON_LENGTH = 4_096;
const FIELD_LIMITS: Record<keyof Omit<AttributionTouch, 'captured_at'>, number> = {
  source: 200,
  medium: 200,
  campaign: 200,
  content: 200,
  term: 200,
  landing_page: 500,
  referrer: 253,
};

function clean(value: unknown, limit: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, limit) : undefined;
}

function parseTouch(value: unknown): AttributionTouch | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const source = clean(input.source, FIELD_LIMITS.source);
  const medium = clean(input.medium, FIELD_LIMITS.medium);
  const landingPage = clean(input.landing_page, FIELD_LIMITS.landing_page);
  const capturedAt = clean(input.captured_at, 40);
  if (!source || !medium || !landingPage?.startsWith('/') || landingPage.startsWith('//')) return null;
  if (!capturedAt || !Number.isFinite(Date.parse(capturedAt))) return null;

  const touch: AttributionTouch = {
    source,
    medium,
    landing_page: landingPage,
    captured_at: capturedAt,
  };

  for (const field of ['campaign', 'content', 'term', 'referrer'] as const) {
    const parsed = clean(input[field], FIELD_LIMITS[field]);
    if (parsed) touch[field] = parsed;
  }
  return touch;
}

export function parseLeadAttribution(value: unknown): LeadAttribution | null {
  if (typeof value !== 'string' || !value || value.length > MAX_JSON_LENGTH) return null;
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.version !== 1) return null;
    const first = parseTouch(parsed.first);
    const last = parseTouch(parsed.last);
    return first && last ? { version: 1, first, last } : null;
  } catch {
    return null;
  }
}

export function serializeLeadAttribution(value: LeadAttribution | null): string | null {
  return value ? JSON.stringify(value) : null;
}

export function formatAttributionTouch(touch: AttributionTouch): string {
  const campaign = touch.campaign ? ` · ${touch.campaign}` : '';
  return `${touch.source} / ${touch.medium}${campaign} · ${touch.landing_page}`;
}
