import type { MemoryRecord } from "./ai_memory.model";

export type AgentMemory = MemoryRecord<{
  agentId: string;
  name: string;
  role: string;
  status?: string;
  capabilities?: string[];
}>;
