import type { Document, ObjectId } from "mongodb";

export const paymentStatuses = [
  "created",
  "processing",
  "succeeded",
  "failed",
  "cancelled",
  "refunded",
] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export interface PaymentModel extends Document {
  _id?: ObjectId;
  orderId: string;
  customerId: string;
  provider: "stripe";
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripeCheckoutSessionId?: string;
  stripePaymentIntentId?: string;
  createdAt: Date;
  updatedAt: Date;
}
