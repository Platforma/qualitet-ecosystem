import type { Document, ObjectId } from "mongodb";

export const orderStatuses = [
  "pending_payment",
  "paid",
  "processing",
  "fulfilled",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export interface OrderItemModel {
  productId: string;
  name: string;
  sku?: string;
  supplierCompanyId?: string;
  quantity: number;
  unitPrice: number;
  currency: string;
}

export interface OrderModel extends Document {
  _id?: ObjectId;
  customerId: string;
  items: OrderItemModel[];
  subtotal: number;
  total: number;
  currency: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}
