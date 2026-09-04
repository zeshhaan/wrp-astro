type LeadEmailDeliveryOptions = {
  agencyRecipient?: string;
  sendClient: () => Promise<unknown>;
  sendAgency: (recipient: string) => Promise<unknown>;
  onAgencyError?: (error: unknown) => void;
};

const EMAIL_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Sends the client's lead notification first, then an optional agency copy.
 *
 * Client failures still reject so the caller can log them. Agency failures are
 * deliberately contained here: a reporting copy must never change whether the
 * client's notification is considered delivered.
 */
export async function deliverClientLeadWithAgencyCopy({
  agencyRecipient,
  sendClient,
  sendAgency,
  onAgencyError = (error) => console.error('Agency copy failed:', error),
}: LeadEmailDeliveryOptions): Promise<void> {
  await sendClient();

  const recipient = agencyRecipient?.trim();
  if (!recipient) return;

  if (!EMAIL_ADDRESS.test(recipient)) {
    onAgencyError(new Error('AGENCY_COPY_EMAIL is not a valid email address'));
    return;
  }

  try {
    await sendAgency(recipient);
  } catch (error) {
    onAgencyError(error);
  }
}
