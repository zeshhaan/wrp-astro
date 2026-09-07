import { describe, expect, test } from 'bun:test';
import { formatAttributionTouch, parseLeadAttribution, serializeLeadAttribution } from './attribution';

const valid = JSON.stringify({
  version: 1,
  first: {
    source: 'google',
    medium: 'organic',
    landing_page: '/paint-protection-film-dubai/',
    captured_at: '2026-09-07T10:00:00.000Z',
  },
  last: {
    source: 'google',
    medium: 'organic',
    campaign: 'google_business_profile',
    landing_page: '/contact-us/',
    captured_at: '2026-09-07T11:00:00.000Z',
  },
});

describe('lead attribution', () => {
  test('accepts and normalizes the versioned first/latest touch record', () => {
    const parsed = parseLeadAttribution(valid);
    expect(parsed?.last.campaign).toBe('google_business_profile');
    expect(JSON.parse(serializeLeadAttribution(parsed)!)).toEqual(JSON.parse(valid));
    expect(formatAttributionTouch(parsed!.last)).toBe(
      'google / organic · google_business_profile · /contact-us/',
    );
  });

  test('rejects malformed, oversized, and unsafe landing paths', () => {
    expect(parseLeadAttribution('{')).toBeNull();
    expect(parseLeadAttribution('x'.repeat(4_097))).toBeNull();
    expect(parseLeadAttribution(valid.replace('/contact-us/', '//outside.example/'))).toBeNull();
  });

  test('bounds untrusted field lengths before storage or email rendering', () => {
    const parsed = parseLeadAttribution(valid.replace('google_business_profile', 'x'.repeat(500)));
    expect(parsed?.last.campaign).toHaveLength(200);
  });
});
