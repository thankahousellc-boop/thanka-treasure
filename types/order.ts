export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  currency: string;
  grandTotal: number;
  createdAt: string;
};
