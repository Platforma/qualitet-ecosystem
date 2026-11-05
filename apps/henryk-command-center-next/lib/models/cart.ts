import type { Document, ObjectId } from "mongodb";

export const cartStatuses = ["active", "converted", "abandoned"] as const;
export type CartStatus = (typeof cartStatuses)[number];

export interface CartItemModel {
  productId: string;
  quantity: number;
  addedAt: Date;
}

export interface CartModel extends Document {
  _id?: ObjectId;
  customerId: string;
  items: CartItemModel[];
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
}
