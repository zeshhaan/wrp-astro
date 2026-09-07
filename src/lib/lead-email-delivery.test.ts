// @ts-expect-error Bun supplies this module at test runtime; its types are not installed globally.
import { describe, expect, test } from 'bun:test';
import { deliverClientLeadWithAgencyCopy } from './lead-email-delivery';

describe('deliverClientLeadWithAgencyCopy', () => {
  test('sends the client first, then the configured agency copy', async () => {
    const calls: string[] = [];

    await deliverClientLeadWithAgencyCopy({
      agencyRecipient: '  agency@example.com  ',
      sendClient: async () => {
        calls.push('client');
      },
      sendAgency: async (recipient) => {
        calls.push(`agency:${recipient}`);
      },
    });

    expect(calls).toEqual(['client', 'agency:agency@example.com']);
  });

  test('does not reject or undo client delivery when the agency copy fails', async () => {
    const calls: string[] = [];
    const agencyError = new Error('copy rejected');
    const logged: unknown[] = [];

    await expect(
      deliverClientLeadWithAgencyCopy({
        agencyRecipient: 'agency@example.com',
        sendClient: async () => {
          calls.push('client');
        },
        sendAgency: async () => {
          calls.push('agency');
          throw agencyError;
        },
        onAgencyError: (error) => logged.push(error),
      }),
    ).resolves.toBeUndefined();

    expect(calls).toEqual(['client', 'agency']);
    expect(logged).toEqual([agencyError]);
  });

  test('does not try the agency copy when it is unset or invalid', async () => {
    let clientSends = 0;
    let agencySends = 0;
    const logged: unknown[] = [];
    const sendClient = async () => {
      clientSends += 1;
    };
    const sendAgency = async () => {
      agencySends += 1;
    };

    await deliverClientLeadWithAgencyCopy({ sendClient, sendAgency });
    await deliverClientLeadWithAgencyCopy({
      agencyRecipient: 'not-an-email',
      sendClient,
      sendAgency,
      onAgencyError: (error) => logged.push(error),
    });

    expect(clientSends).toBe(2);
    expect(agencySends).toBe(0);
    expect(logged).toHaveLength(1);
  });

  test('does not attempt an agency copy when client delivery fails', async () => {
    const clientError = new Error('client rejected');
    let agencySends = 0;

    await expect(
      deliverClientLeadWithAgencyCopy({
        agencyRecipient: 'agency@example.com',
        sendClient: async () => {
          throw clientError;
        },
        sendAgency: async () => {
          agencySends += 1;
        },
      }),
    ).rejects.toBe(clientError);

    expect(agencySends).toBe(0);
  });
});
