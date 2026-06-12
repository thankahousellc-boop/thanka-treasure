import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { formatCurrency } from "@/lib/utils/formatters";

type OrderItem = {
  productTitle: string;
  variantTitle: string | null;
  quantity: number;
  totalPrice: number;
};

type OrderShippedEmailProps = {
  shopName: string;
  logoUrl: string | null;
  orderNumber: string;
  currency: string;
  grandTotal: number;
  shippedAt: string;
  orderUrl: string | null;
  items: OrderItem[];
};

export function OrderShippedEmail({
  shopName,
  logoUrl,
  orderNumber,
  currency,
  grandTotal,
  shippedAt,
  orderUrl,
  items,
}: OrderShippedEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Order {orderNumber} has shipped</Preview>
      <Body style={body}>
        <Container style={container}>
          {logoUrl ? (
            <Section style={logoWrap}>
              <Img src={logoUrl} alt={shopName} height={48} style={logoStyle} />
            </Section>
          ) : (
            <Text style={brandWordmark}>{shopName}</Text>
          )}
          <Heading style={heading}>Your order is on the way</Heading>
          <Text style={paragraph}>
            Great news from {shopName}: order {orderNumber} was marked as
            shipped on {shippedAt}.
          </Text>

          {orderUrl ? (
            <Text style={paragraph}>
              You can review your order status here:{" "}
              <Link href={orderUrl}>{orderUrl}</Link>
            </Text>
          ) : null}

          <Hr style={divider} />

          <Section>
            <Heading as="h2" style={sectionHeading}>
              Shipment summary
            </Heading>
            {items.map((item, index) => (
              <Section
                key={`${item.productTitle}-${index}`}
                style={itemSection}
              >
                <Text style={itemTitle}>{item.productTitle}</Text>
                {item.variantTitle ? (
                  <Text style={itemSubtle}>{item.variantTitle}</Text>
                ) : null}
                <Text style={itemSubtle}>Qty {item.quantity}</Text>
                <Text style={itemSubtle}>
                  Line total: {formatCurrency(item.totalPrice, currency)}
                </Text>
              </Section>
            ))}
            <Text style={total}>
              Order total: {formatCurrency(grandTotal, currency)}
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body = {
  backgroundColor: "#f5f5f4",
  fontFamily: "-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
  margin: 0,
  padding: "24px 0",
};

const container = {
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

const heading = {
  color: "#7f1d1d",
  fontSize: "24px",
  margin: "0 0 12px",
};

const sectionHeading = {
  color: "#111827",
  fontSize: "16px",
  margin: "0 0 8px",
};

const paragraph = {
  color: "#1f2937",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "0 0 8px",
};

const divider = {
  borderColor: "#e7e5e4",
  margin: "16px 0",
};

const itemSection = {
  borderBottom: "1px solid #f1f5f9",
  marginBottom: "10px",
  paddingBottom: "10px",
};

const itemTitle = {
  color: "#111827",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const itemSubtle = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0 0 4px",
};

const total = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "700",
  margin: "10px 0 0",
};
