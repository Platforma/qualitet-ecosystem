import type { MemoryRecord } from "./ai_memory.model";

export type CompanyMemory = MemoryRecord<{
  companyId: string;
  name?: string;
  profile?: Record<string, unknown>;
}>;