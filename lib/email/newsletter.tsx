import { NewsletterCampaignEmail } from "@/components/emails/newsletter-campaign-email";
import { getBranding } from "@/lib/branding";
import { resend, resendFromEmail } from "@/lib/email/client";

type NewsletterRecipient = {
  email: string;
};

type SendNewsletterCampaignInput = {
  subject: string;
  heading: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
  recipients: NewsletterRecipient[];
};

type CampaignSendSummary = {
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
};

const RECIPIENT_BATCH_SIZE = 25;

function chunkRecipients(recipients: NewsletterRecipient[]) {
  const chunks: NewsletterRecipient[][] = [];

  for (
    let index = 0;
    index < recipients.length;
    index += RECIPIENT_BATCH_SIZE
  ) {
    chunks.push(recipients.slice(index, index + RECIPIENT_BATCH_SIZE));
  }

  return chunks;
}

export async function sendNewsletterCampaign(
  input: SendNewsletterCampaignInput,
): Promise<CampaignSendSummary> {
  const summary: CampaignSendSummary = {
    attempted: input.recipients.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  if (!resend) {
    summary.skipped = input.recipients.length;
    summary.errors.push("RESEND_API_KEY is not configured.");
    return summary;
  }

  const resendClient = resend;
  const recipientChunks = chunkRecipients(input.recipients);
  const branding = await getBranding();

  for (const chunk of recipientChunks) {
    const batchResults = await Promise.all(
      chunk.map(async (recipient) => {
        try {
          const response = await resendClient.emails.send({
            from: resendFromEmail,
            to: [recipient.email],
            subject: input.subject,
            react: (
              <NewsletterCampaignEmail
                brandName={branding.brandName}
                logoUrl={branding.logoLightUrl}
                heading={input.heading}
                body={input.body}
                ctaLabel={input.ctaLabel}
                ctaUrl={input.ctaUrl}
              />
            ),
          });

          if (response.error) {
            return {
              status: "failed" as const,
              email: recipient.email,
              reason: response.error.message,
            };
          }

          return {
            status: "sent" as const,
            email: recipient.email,
            reason: null,
          };
        } catch (error) {
          return {
            status: "failed" as const,
            email: recipient.email,
            reason: (error as Error).message,
          };
        }
      }),
    );

    for (const result of batchResults) {
      if (result.status === "sent") {
        summary.sent += 1;
      } else {
        summary.failed += 1;
        if (summary.errors.length < 20) {
          summary.errors.push(
            `${result.email}: ${result.reason ?? "Unknown error"}`,
          );
        }
      }
    }
  }

  return summary;
}
