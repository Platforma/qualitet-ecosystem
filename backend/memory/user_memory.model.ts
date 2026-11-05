import type { MemoryRecord } from "./ai_memory.model";

export type UserMemory = MemoryRecord<{
  userId: string;
  preferences?: Record<string, unknown>;
  facts?: string[];
}>;