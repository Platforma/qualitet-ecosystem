import type { MemoryRecord } from "./ai_memory.model";

export type ProjectMemory = MemoryRecord<{
  projectId: string;
  name?: string;
  context?: string;
  decisions?: string[];
}>;