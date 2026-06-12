import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from "@react-email/components";

type NewsletterCampaignEmailProps = {
  brandName: string;
  logoUrl: string | null;
  heading: string;
  body: string;
  ctaLabel: string | null;
  ctaUrl: string | null;
};

export function NewsletterCampaignEmail({
  brandName,
  logoUrl,
  heading,
  body,
  ctaLabel,
  ctaUrl,
}: NewsletterCampaignEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>{heading}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          {logoUrl ? (
            <Section style={logoWrap}>
              <Img
                src={logoUrl}
                alt={brandName}
                height={48}
                style={logoStyle}
              />
            </Section>
          ) : (
            <Text style={brandWordmark}>{brandName}</Text>
          )}
          <Heading style={headingStyle}>{heading}</Heading>
          <Section>
            {body
              .split("\n")
              .filter((line) => line.trim().length > 0)
              .map((line, index) => (
                <Text key={index} style={paragraphStyle}>
                  {line}
                </Text>
              ))}
          </Section>
          {ctaLabel && ctaUrl ? (
            <Section style={buttonWrapStyle}>
              <Button href={ctaUrl} style={buttonStyle}>
                {ctaLabel}
              </Button>
            </Section>
          ) : null}
          <Text style={footerStyle}>
            You are receiving this email because you subscribed to {brandName}{" "}
            updates.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const bodyStyle = {
  backgroundColor: "#f5f5f4",
  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const containerStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e7e5e4",
  borderRadius: "8px",
  margin: "0 auto",
  maxWidth: "620px",
  padding: "24px",
};

const logoWrap = {
  margin: "0 0 16px",
};

const logoStyle = {
  height: "48px",
  width: "auto",
  display: "block",
};

const brandWordmark = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "700" as const,
  letterSpacing: "0.06em",
  textTransform: "uppercase" as const,
  margin: "0 0 16px",
};

const headingStyle = {
  color: "#7f1d1d",
  fontSize: "24px",
  margin: "0 0 12px",
};

const paragraphStyle = {
  color: "#1f2937",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0 0 10px",
};

const buttonWrapStyle = {
  margin: "18px 0",
};

const buttonStyle = {
  backgroundColor: "#7f1d1d",
  borderRadius: "6px",
  color: "#ffffff",
  display: "inline-block",
  fontSize: "14px",
  fontWeight: "600",
  padding: "12px 18px",
  textDecoration: "none",
};

const footerStyle = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "18px",
  margin: "18px 0 0",
};
