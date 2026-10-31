import type { MemoryRecord } from "./ai_memory.model";

export type OwnerMemory = MemoryRecord<{
  userId: string;
  preferences?: Record<string, unknown>;
  instructions?: string[];
}>;