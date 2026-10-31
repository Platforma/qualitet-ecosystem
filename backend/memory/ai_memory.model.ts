import schema from "./memory.schema.json";

export type MemorySection =
  | "users"
  | "projects"
  | "companies"
  | "prompts"
  | "agents"
  | "tasks"
  | "history"
  | "logs";

export interface MemoryRecord<
  TData extends Record<string, unknown> = Record<string, unknown>,
> {
  _id?: unknown;
  ownerId: string;
  key: string;
  data: TData;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
  expiresAt?: Date;
}

export const memorySections = schema.sections;