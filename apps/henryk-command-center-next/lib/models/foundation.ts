import type { Document, ObjectId } from "mongodb";
import type { CartModel } from "./cart";
import type { OrderModel } from "./order";
import type { PaymentModel } from "./payment";
import type { ProductModel } from "./product";

export const foundationCollections = [
  "users",
  "roles",
  "permissions",
  "companies",
  "suppliers",
  "partners",
  "advertisers",
  "campaigns",
  "products",
  "categories",
  "stores",
  "carts",
  "orders",
  "payments",
  "subscriptions",
  "invoices",
  "notifications",
  "audit_logs",
  "ai_tasks",
  "ai_memory",
] as const;

export type UserRole = "owner" | "admin" | "user";
export type RecordStatus =
  | "active"
  | "pending"
  | "rejected"
  | "suspended"
  | "archived";

export interface User extends Document {
  _id?: ObjectId;
  email: string;
  name: string;
  role: UserRole;
  status: "active" | "disabled";
  passwordHash: string;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
}

export interface Role extends Document {
  _id?: ObjectId;
  key: UserRole;
  name: string;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission extends Document {
  _id?: ObjectId;
  key: string;
  resource: string;
  action: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Company extends Document {
  _id?: ObjectId;
  name: string;
  slug?: string;
  ownerUserId?: string;
  email?: string;
  phone?: string;
  website?: string;
  country?: string;
  status?: "pending" | "active" | "rejected" | "suspended";
  createdAt: Date;
  updatedAt?: Date;
}

export interface Supplier extends Document {
  _id?: ObjectId;
  companyId: string;
  contactName?: string;
  email?: string;
  status: "active" | "pending" | "suspended" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface Partner extends Document {
  _id?: ObjectId;
  companyId?: string;
  userId?: string;
  status: "active" | "pending" | "suspended" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface Advertiser extends Document {
  _id?: ObjectId;
  companyId?: string;
  userId?: string;
  status: "active" | "pending" | "suspended" | "archived";
  createdAt: Date;
  updatedAt: Date;
}

export interface Campaign extends Document {
  _id?: ObjectId;
  name: string;
  advertiserId: string;
  status: "draft" | "active" | "paused" | "completed";
  budget?: number;
  currency?: string;
  startsAt?: Date;
  endsAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category extends Document {
  _id?: ObjectId;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  status?: "active" | "archived";
  createdAt: Date;
  updatedAt?: Date;
}

export interface Store extends Document {
  _id?: ObjectId;
  ownerUserId: string;
  name: string;
  slug?: string;
  domain?: string;
  status: "draft" | "active" | "suspended";
  createdAt: Date;
  updatedAt?: Date;
}

export type Product = ProductModel;
export type Cart = CartModel;
export type Order = OrderModel;
export type Payment = PaymentModel;

export interface Subscription extends Document {
  _id?: ObjectId;
  userId?: string;
  companyId?: string;
  plan: string;
  status: "trialing" | "active" | "past_due" | "cancelled" | "expired";
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice extends Document {
  _id?: ObjectId;
  invoiceNumber: string;
  subscriptionId?: string;
  userId?: string;
  amount: number;
  currency: string;
  status: "draft" | "open" | "paid" | "void" | "uncollectible";
  dueAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification extends Document {
  _id?: ObjectId;
  recipientId: string;
  type: string;
  title: string;
  message: string;
  readAt?: Date;
  createdAt: Date;
}

export interface AuditLog extends Document {
  _id?: ObjectId;
  actorId: string;
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface AiTask extends Document {
  _id?: ObjectId;
  taskId: string;
  agentId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiMemory extends Document {
  _id?: ObjectId;
  key: string;
  ownerId: string;
  type: string;
  content: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}
