import type { MemoryRecord } from "./ai_memory.model";

export type TrendMemory = MemoryRecord<{
  trendId: string;
  source?: string;
  summary?: string;
  observedAt?: string;
}>;