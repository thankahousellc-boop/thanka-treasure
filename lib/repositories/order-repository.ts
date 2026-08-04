import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  or,
  sql,
} from "drizzle-orm";

import { getDb } from "@/db";
import {
  customers,
  inventory,
  orderEvents,
  orderItems,
  orders,
} from "@/db/schema";
import type { Session } from "@/lib/auth";
import { requireAdminSession } from "@/lib/repositories/authz";

// Fallback order email for anonymous walk-in POS sales.
const POS_WALK_IN_EMAIL = "walk-in@pos.local";

type InStoreOrderItemInput = {
  variantId: string;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
};

type CreateInStoreOrderInput = {
  items: InStoreOrderItemInput[];
  paymentMethod: "cash" | "card" | "other";
  discountTotal?: number;
  customer?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
};

type CheckoutOrderItemInput = {
  variantId: string | null;
  productTitle: string;
  variantTitle: string | null;
  sku: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  frameSnapshot?: {
    id: string;
    name: string;
    imageUrl?: string | null;
    priceDelta: number;
  } | null;
};

type CreateFromCheckoutSessionInput = {
  sessionId: string;
  paymentIntentId: string | null;
  email: string;
  paymentStatus: "pending" | "paid";
  currency: string;
  subtotal: number;
  taxTotal: number;
  shippingTotal: number;
  discountTotal: number;
  grandTotal: number;
  shippingAddress: unknown;
  billingAddress: unknown;
  items: CheckoutOrderItemInput[];
};

type AdminOrderSort = "newest" | "oldest" | "total_desc" | "total_asc";

type ListForAdminInput = {
  query?: string;
  status?: string;
  paymentStatus?: string;
  sort?: AdminOrderSort;
  limit?: number;
};

type AdminOrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

type AdminFulfillmentStatus =
  | "unfulfilled"
  | "partial"
  | "fulfilled"
  | "restocked";

function buildAdminOrderFilters(input: ListForAdminInput) {
  const filters = [];

  if (input.query && input.query.trim().length > 0) {
    const needle = `%${input.query.trim()}%`;
    filters.push(
      or(ilike(orders.orderNumber, needle), ilike(orders.email, needle)),
    );
  }

  if (input.status && input.status !== "all") {
    filters.push(eq(orders.status, input.status));
  }

  if (input.paymentStatus && input.paymentStatus !== "all") {
    filters.push(eq(orders.paymentStatus, input.paymentStatus));
  }

  return filters;
}

function createOrderNumber() {
  const now = new Date();
  const year = now.getUTCFullYear().toString();
  const month = (now.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = now.getUTCDate().toString().padStart(2, "0");
  const random = crypto
    .randomUUID()
    .replace(/-/g, "")
    .slice(0, 8)
    .toUpperCase();

  return `TT-${year}${month}${day}-${random}`;
}

export const orderRepository = {
  async findByIdForCustomer(orderId: string, session: Session) {
    if (!session.user) {
      throw new Error("Unauthorized");
    }

    const db = getDb();
    const [order] = await db
      .select({
        order: orders,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(
        and(eq(orders.id, orderId), eq(customers.profileId, session.user.id)),
      )
      .limit(1);

    return order?.order ?? null;
  },

  async listForCustomer(session: Session, limit = 20) {
    if (!session.user) {
      throw new Error("Unauthorized");
    }

    const db = getDb();
    const boundedLimit = Math.min(Math.max(limit, 1), 100);

    return db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        currency: orders.currency,
        grandTotal: orders.grandTotal,
        createdAt: orders.createdAt,
      })
      .from(orders)
      .innerJoin(customers, eq(customers.id, orders.customerId))
      .where(
        and(
          eq(customers.profileId, session.user.id),
          isNull(customers.deletedAt),
          isNull(orders.deletedAt),
        ),
      )
      .orderBy(desc(orders.createdAt))
      .limit(boundedLimit);
  },

  async findByIdForAdmin(orderId: string, session?: Session) {
    await requireAdminSession(session);

    const db = getDb();
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    return order ?? null;
  },

  async findByStripeSessionId(sessionId: string) {
    const db = getDb();
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, sessionId))
      .limit(1);

    return order ?? null;
  },

  async listForAdmin(input: ListForAdminInput = {}, session?: Session) {
    await requireAdminSession(session);

    const db = getDb();
    const filters = buildAdminOrderFilters(input);
    const whereClause = filters.length > 0 ? and(...filters) : undefined;
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 250);
    const sort = input.sort ?? "newest";

    const baseQuery = db
      .select({
        id: orders.id,
        orderNumber: orders.orderNumber,
        email: orders.email,
        status: orders.status,
        paymentStatus: orders.paymentStatus,
        fulfillmentStatus: orders.fulfillmentStatus,
        currency: orders.currency,
        grandTotal: orders.grandTotal,
        source: orders.source,
        createdAt: orders.createdAt,
      })
      .from(orders);

    const filteredQuery = whereClause
      ? baseQuery.where(whereClause)
      : baseQuery;

    let orderedQuery;
    switch (sort) {
      case "oldest":
        orderedQuery = filteredQuery.orderBy(asc(orders.createdAt));
        break;
      case "total_desc":
        orderedQuery = filteredQuery.orderBy(
          desc(orders.grandTotal),
          desc(orders.createdAt),
        );
        break;
      case "total_asc":
        orderedQuery = filteredQuery.orderBy(
          asc(orders.grandTotal),
          desc(orders.createdAt),
        );
        break;
      case "newest":
      default:
        orderedQuery = filteredQuery.orderBy(desc(orders.createdAt));
        break;
    }

    const [rows, totalRow] = await Promise.all([
      orderedQuery.limit(limit),
      (whereClause
        ? db
            .select({ total: sql<number>`count(*)` })
            .from(orders)
            .where(whereClause)
        : db.select({ total: sql<number>`count(*)` }).from(orders)
      ).then((result) => result[0]),
    ]);

    return {
      rows,
      total: Number(totalRow?.total ?? 0),
    };
  },

  async getAdminStats(session?: Session) {
    await requireAdminSession(session);

    const db = getDb();

    const [totalRow, paidRow, pendingFulfillmentRow, cancelledRow] =
      await Promise.all([
        db
          .select({ total: sql<number>`count(*)` })
          .from(orders)
          .then((rows) => rows[0]),
        db
          .select({ total: sql<number>`count(*)` })
          .from(orders)
          .where(eq(orders.paymentStatus, "paid"))
          .then((rows) => rows[0]),
        db
          .select({ total: sql<number>`count(*)` })
          .from(orders)
          .where(inArray(orders.fulfillmentStatus, ["unfulfilled", "partial"]))
          .then((rows) => rows[0]),
        db
          .select({ total: sql<number>`count(*)` })
          .from(orders)
          .where(eq(orders.status, "cancelled"))
          .then((rows) => rows[0]),
      ]);

    return {
      total: Number(totalRow?.total ?? 0),
      paid: Number(paidRow?.total ?? 0),
      pendingFulfillment: Number(pendingFulfillmentRow?.total ?? 0),
      cancelled: Number(cancelledRow?.total ?? 0),
    };
  },

  async findDetailForAdmin(orderId: string, session?: Session) {
    const order = await this.findByIdForAdmin(orderId, session);
    if (!order) {
      return null;
    }

    const db = getDb();

    const [customer, items, events] = await Promise.all([
      order.customerId
        ? db
            .select({
              id: customers.id,
              email: customers.email,
              firstName: customers.firstName,
              lastName: customers.lastName,
              phone: customers.phone,
              totalOrders: customers.totalOrders,
              totalSpent: customers.totalSpent,
            })
            .from(customers)
            .where(eq(customers.id, order.customerId))
            .limit(1)
            .then((rows) => rows[0] ?? null)
        : Promise.resolve(null),
      db
        .select({
          id: orderItems.id,
          productTitle: orderItems.productTitle,
          variantTitle: orderItems.variantTitle,
          sku: orderItems.sku,
          quantity: orderItems.quantity,
          unitPrice: orderItems.unitPrice,
          totalPrice: orderItems.totalPrice,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id))
        .orderBy(asc(orderItems.createdAt)),
      db
        .select({
          id: orderEvents.id,
          eventType: orderEvents.eventType,
          description: orderEvents.description,
          actor: orderEvents.actor,
          createdAt: orderEvents.createdAt,
        })
        .from(orderEvents)
        .where(eq(orderEvents.orderId, order.id))
        .orderBy(desc(orderEvents.createdAt))
        .limit(100),
    ]);

    return {
      order,
      customer,
      items,
      events,
    };
  },

  async updateOrderStatus(
    orderId: string,
    status: AdminOrderStatus,
    actor = "admin",
    session?: Session,
  ) {
    await requireAdminSession(session);

    const db = getDb();

    const updatedRows = await db
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id });

    if (updatedRows.length === 0) {
      return false;
    }

    await this.appendEvent(orderId, {
      eventType: "admin.order.status.updated",
      description: `Order status updated to ${status}.`,
      actor,
      metadata: { status },
    });

    return true;
  },

  async updateFulfillmentStatus(
    orderId: string,
    fulfillmentStatus: AdminFulfillmentStatus,
    actor = "admin",
    session?: Session,
  ) {
    await requireAdminSession(session);

    const db = getDb();

    const updatedRows = await db
      .update(orders)
      .set({
        fulfillmentStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id });

    if (updatedRows.length === 0) {
      return false;
    }

    await this.appendEvent(orderId, {
      eventType: "admin.order.fulfillment.updated",
      description: `Fulfillment status updated to ${fulfillmentStatus}.`,
      actor,
      metadata: { fulfillmentStatus },
    });

    return true;
  },

  async updateAdminNotes(
    orderId: string,
    notes: string | null,
    actor = "admin",
    session?: Session,
  ) {
    await requireAdminSession(session);

    const db = getDb();

    const updatedRows = await db
      .update(orders)
      .set({
        notes,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, orderId))
      .returning({ id: orders.id });

    if (updatedRows.length === 0) {
      return false;
    }

    await this.appendEvent(orderId, {
      eventType: "admin.order.notes.updated",
      description: notes
        ? "Internal notes updated by admin."
        : "Internal notes cleared by admin.",
      actor,
    });

    return true;
  },

  async appendEvent(
    orderId: string,
    input: {
      eventType: string;
      description: string;
      actor?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const db = getDb();

    await db.insert(orderEvents).values({
      orderId,
      eventType: input.eventType,
      description: input.description,
      actor: input.actor ?? "system",
      metadata: input.metadata ?? {},
      updatedAt: new Date(),
    });
  },

  async createFromCheckoutSession(input: CreateFromCheckoutSessionInput) {
    const existing = await this.findByStripeSessionId(input.sessionId);
    if (existing) {
      return { order: existing, created: false };
    }

    const db = getDb();

    const result = await db.transaction(async (tx) => {
      const [customer] = await tx
        .insert(customers)
        .values({
          email: input.email,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: customers.email,
          set: {
            updatedAt: new Date(),
          },
        })
        .returning({ id: customers.id });

      if (!customer) {
        throw new Error("Unable to resolve customer for order creation.");
      }

      const [createdOrder] = await tx
        .insert(orders)
        .values({
          orderNumber: createOrderNumber(),
          customerId: customer.id,
          email: input.email,
          status: input.paymentStatus === "paid" ? "confirmed" : "pending",
          paymentStatus: input.paymentStatus,
          fulfillmentStatus: "unfulfilled",
          currency: input.currency,
          subtotal: input.subtotal,
          taxTotal: input.taxTotal,
          shippingTotal: input.shippingTotal,
          discountTotal: input.discountTotal,
          grandTotal: input.grandTotal,
          stripePaymentIntentId: input.paymentIntentId,
          stripeCheckoutSessionId: input.sessionId,
          shippingAddress: input.shippingAddress,
          billingAddress: input.billingAddress,
          updatedAt: new Date(),
        })
        .onConflictDoNothing({
          target: orders.stripeCheckoutSessionId,
        })
        .returning();

      if (!createdOrder) {
        const [existingOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.stripeCheckoutSessionId, input.sessionId))
          .limit(1);

        if (!existingOrder) {
          throw new Error("Unable to create order from checkout session.");
        }

        return { order: existingOrder, created: false as const };
      }

      if (input.items.length > 0) {
        await tx.insert(orderItems).values(
          input.items.map((item) => ({
            orderId: createdOrder.id,
            variantId: item.variantId,
            productTitle: item.productTitle,
            variantTitle: item.variantTitle,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            frameSnapshot: item.frameSnapshot ?? null,
            updatedAt: new Date(),
          })),
        );
      }

      await tx
        .update(customers)
        .set({
          totalOrders: sql`${customers.totalOrders} + 1`,
          totalSpent: sql`${customers.totalSpent} + ${input.grandTotal}`,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));

      await tx.insert(orderEvents).values({
        orderId: createdOrder.id,
        eventType: "checkout.session.completed",
        description:
          input.paymentStatus === "paid"
            ? "Stripe checkout session completed and payment captured."
            : "Stripe checkout session completed; payment pending confirmation.",
        actor: "stripe-webhook",
        metadata: {
          sessionId: input.sessionId,
          paymentIntentId: input.paymentIntentId,
          paymentStatus: input.paymentStatus,
        },
        updatedAt: new Date(),
      });

      return { order: createdOrder, created: true as const };
    });

    return result;
  },

  // Records a completed in-store (POS) sale: deducts stock, creates a paid +
  // fulfilled order tagged source="in_store", and logs the event — all in one
  // transaction so a stock shortfall rolls the whole sale back.
  async createInStoreOrder(input: CreateInStoreOrderInput) {
    await requireAdminSession();

    if (input.items.length === 0) {
      throw new Error("Cannot complete a sale with no items.");
    }

    const db = getDb();

    return db.transaction(async (tx) => {
      const email = input.customer?.email?.trim() || POS_WALK_IN_EMAIL;

      let customerId: string | null = null;
      // Only attach/create a customer for a named (non-walk-in) sale.
      if (input.customer?.email?.trim()) {
        const [customer] = await tx
          .insert(customers)
          .values({
            email,
            firstName: input.customer.firstName ?? null,
            lastName: input.customer.lastName ?? null,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: customers.email,
            set: { updatedAt: new Date() },
          })
          .returning({ id: customers.id });
        customerId = customer?.id ?? null;
      }

      // Deduct stock first — a shortfall throws and aborts the sale.
      for (const item of input.items) {
        const updated = await tx
          .update(inventory)
          .set({
            quantity: sql`${inventory.quantity} - ${item.quantity}`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(inventory.variantId, item.variantId),
              // Live checkout holds, computed inline rather than read from
              // `variant_availability`: this UPDATE holds a row lock on the
              // inventory row, which serialises it against concurrent sales.
              // A view cannot be locked.
              gte(
                sql`${inventory.quantity} - (
                  select coalesce(sum(cr.quantity), 0)
                  from checkout_reservations cr
                  where cr.variant_id = ${inventory.variantId}
                    and cr.status = 'open'
                    and cr.expires_at > now()
                )`,
                item.quantity,
              ),
            ),
          )
          .returning({ id: inventory.id });

        if (updated.length === 0) {
          throw new Error(`Insufficient stock for ${item.productTitle}.`);
        }
      }

      const subtotal = input.items.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      );
      const discountTotal = Math.max(0, input.discountTotal ?? 0);
      const grandTotal = Math.max(0, subtotal - discountTotal);

      const [createdOrder] = await tx
        .insert(orders)
        .values({
          orderNumber: createOrderNumber(),
          customerId,
          email,
          status: "confirmed",
          paymentStatus: "paid",
          fulfillmentStatus: "fulfilled",
          currency: "USD",
          subtotal,
          taxTotal: 0,
          shippingTotal: 0,
          discountTotal,
          grandTotal,
          source: "in_store",
          paymentMethod: input.paymentMethod,
          updatedAt: new Date(),
        })
        .returning();

      if (!createdOrder) {
        throw new Error("Unable to create in-store order.");
      }

      await tx.insert(orderItems).values(
        input.items.map((item) => ({
          orderId: createdOrder.id,
          variantId: item.variantId,
          productTitle: item.productTitle,
          variantTitle: item.variantTitle,
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.unitPrice * item.quantity,
          updatedAt: new Date(),
        })),
      );

      if (customerId) {
        await tx
          .update(customers)
          .set({
            totalOrders: sql`${customers.totalOrders} + 1`,
            totalSpent: sql`${customers.totalSpent} + ${grandTotal}`,
            updatedAt: new Date(),
          })
          .where(eq(customers.id, customerId));
      }

      await tx.insert(orderEvents).values({
        orderId: createdOrder.id,
        eventType: "pos.sale.completed",
        description: `In-store sale completed (${input.paymentMethod}).`,
        actor: "admin",
        metadata: { source: "in_store", paymentMethod: input.paymentMethod },
        updatedAt: new Date(),
      });

      return createdOrder;
    });
  },

  async markCheckoutExpired(sessionId: string) {
    const db = getDb();

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, sessionId))
      .limit(1);

    if (!order) {
      return null;
    }

    if (order.status === "cancelled" && order.paymentStatus === "failed") {
      return { order, changed: false as const };
    }

    await db
      .update(orders)
      .set({
        status: "cancelled",
        paymentStatus: "failed",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await this.appendEvent(order.id, {
      eventType: "checkout.session.expired",
      description: "Stripe checkout session expired before payment completion.",
      actor: "stripe-webhook",
      metadata: { sessionId },
    });

    return { order, changed: true as const };
  },

  async markPaymentStatusByPaymentIntent(
    paymentIntentId: string,
    input: {
      paymentStatus: "pending" | "paid" | "failed" | "refunded";
      status?: "pending" | "confirmed" | "cancelled";
      eventType: string;
      description: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const db = getDb();

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.stripePaymentIntentId, paymentIntentId))
      .limit(1);

    if (!order) {
      return null;
    }

    const nextStatus =
      input.status ??
      (input.paymentStatus === "failed"
        ? "cancelled"
        : input.paymentStatus === "paid"
          ? "confirmed"
          : order.status);

    if (
      order.paymentStatus === input.paymentStatus &&
      order.status === nextStatus
    ) {
      return { order, changed: false as const };
    }

    await db
      .update(orders)
      .set({
        paymentStatus: input.paymentStatus,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await this.appendEvent(order.id, {
      eventType: input.eventType,
      description: input.description,
      actor: "stripe-webhook",
      metadata: {
        paymentIntentId,
        ...(input.metadata ?? {}),
      },
    });

    return {
      order: {
        ...order,
        paymentStatus: input.paymentStatus,
        status: nextStatus,
      },
      changed: true as const,
    };
  },

  async markPaymentStatusByCheckoutSession(
    sessionId: string,
    input: {
      paymentStatus: "pending" | "paid" | "failed" | "refunded";
      status?: "pending" | "confirmed" | "cancelled";
      eventType: string;
      description: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const db = getDb();

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.stripeCheckoutSessionId, sessionId))
      .limit(1);

    if (!order) {
      return null;
    }

    const nextStatus =
      input.status ??
      (input.paymentStatus === "failed"
        ? "cancelled"
        : input.paymentStatus === "paid"
          ? "confirmed"
          : order.status);

    if (
      order.paymentStatus === input.paymentStatus &&
      order.status === nextStatus
    ) {
      return { order, changed: false as const };
    }

    await db
      .update(orders)
      .set({
        paymentStatus: input.paymentStatus,
        status: nextStatus,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    await this.appendEvent(order.id, {
      eventType: input.eventType,
      description: input.description,
      actor: "stripe-webhook",
      metadata: {
        sessionId,
        ...(input.metadata ?? {}),
      },
    });

    return {
      order: {
        ...order,
        paymentStatus: input.paymentStatus,
        status: nextStatus,
      },
      changed: true as const,
    };
  },
};
