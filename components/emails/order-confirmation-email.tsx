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
  unitPrice: number;
  totalPrice: number;
};

type OrderConfirmationEmailProps = {
  shopName: string;
  logoUrl: string | null;
  orderNumber: string;
  orderDate: string;
  currency: string;
  shippingAddress: string | null;
  orderUrl: string | null;
  items: OrderItem[];
  subtotal: number;
  shippingTotal: number;
  taxTotal: number;
  discountTotal: number;
  grandTotal: number;
};

export function OrderConfirmationEmail({
  shopName,
  logoUrl,
  orderNumber,
  orderDate,
  currency,
  shippingAddress,
  orderUrl,
  items,
  subtotal,
  shippingTotal,
  taxTotal,
  discountTotal,
  grandTotal,
}: OrderConfirmationEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Order {orderNumber} confirmed</Preview>
      <Body style={body}>
        <Container style={container}>
          {logoUrl ? (
            <Section style={logoWrap}>
              <Img src={logoUrl} alt={shopName} height={48} style={logoStyle} />
            </Section>
          ) : (
            <Text style={brandWordmark}>{shopName}</Text>
          )}
          <Heading style={heading}>Your order is confirmed</Heading>
          <Text style={paragraph}>Thank you for shopping with {shopName}.</Text>
          <Text style={paragraph}>Order: {orderNumber}</Text>
          <Text style={paragraph}>Date: {orderDate}</Text>

          {orderUrl ? (
            <Text style={paragraph}>
              View your orders: <Link href={orderUrl}>{orderUrl}</Link>
            </Text>
          ) : null}

          <Hr style={divider} />

          <Section>
            <Heading as="h2" style={sectionHeading}>
              Items
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
                <Text style={itemSubtle}>
                  Qty {item.quantity} x{" "}
                  {formatCurrency(item.unitPrice, currency)}
                </Text>
                <Text style={itemTotal}>
                  {formatCurrency(item.totalPrice, currency)}
                </Text>
              </Section>
            ))}
          </Section>

          <Hr style={divider} />

          <Section>
            <Text style={line}>
              Subtotal: {formatCurrency(subtotal, currency)}
            </Text>
            <Text style={line}>
              Shipping: {formatCurrency(shippingTotal, currency)}
            </Text>
            <Text style={line}>Tax: {formatCurrency(taxTotal, currency)}</Text>
            {discountTotal > 0 ? (
              <Text style={line}>
                Discount: -{formatCurrency(discountTotal, currency)}
              </Text>
            ) : null}
            <Text style={total}>
              Total: {formatCurrency(grandTotal, currency)}
            </Text>
          </Section>

          {shippingAddress ? (
            <>
              <Hr style={divider} />
              <Heading as="h2" style={sectionHeading}>
                Shipping address
              </Heading>
              <Text style={paragraph}>{shippingAddress}</Text>
            </>
          ) : null}
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

const itemTotal = {
  color: "#111827",
  fontSize: "13px",
  fontWeight: "600",
  margin: "0",
};

const line = {
  color: "#111827",
  fontSize: "14px",
  margin: "0 0 6px",
};

const total = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "700",
  margin: "10px 0 0",
};
