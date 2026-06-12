import { CheckoutSuccessStatus } from "@/components/shop/checkout-success-status";
import { orderRepository } from "@/lib/repositories/order-repository";

type CheckoutSuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    return (
      <section className="container-page py-14 md:py-20">
        <h1 className="font-serif text-4xl text-ink md:text-5xl">
          Order Confirmed
        </h1>
        <p className="mt-4 max-w-2xl text-base text-ink-soft">
          Payment was completed. Your order details will appear shortly.
        </p>
      </section>
    );
  }

  const order = await orderRepository.findByStripeSessionId(sessionId);

  return (
    <section className="container-page py-14 md:py-20">
      <CheckoutSuccessStatus
        sessionId={sessionId}
        initialOrder={
          order
            ? {
                orderNumber: order.orderNumber,
                status: order.status,
                paymentStatus: order.paymentStatus,
                fulfillmentStatus: order.fulfillmentStatus,
                currency: order.currency,
                grandTotal: order.grandTotal,
                createdAt: order.createdAt.toISOString(),
              }
            : null
        }
      />
    </section>
  );
}
