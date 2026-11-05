# Memory Schema

Źródłem konfiguracji jest `backend/memory/memory.schema.json`.

| Sekcja | Kolekcja | Wymagane pola `data` |
|---|---|---|
| users | `memory_users` | `userId` |
| projects | `memory_projects` | `projectId` |
| companies | `memory_companies` | `companyId` |
| prompts | `memory_prompts` | `promptId`, `name`, `content` |
| agents | `memory_agents` | `agentId`, `name`, `role` |
| tasks | `memory_tasks` | `taskId`, `agentId`, `status` |
| history | `memory_history` | `eventType`, `occurredAt` |
| logs | `memory_logs` | `level`, `message`, `occurredAt` |

Każda kolekcja przechowuje dokumenty o wspólnym kształcie:

- `ownerId`: niepusty identyfikator nadawany przez serwer.
- `key`: unikalny w zakresie właściciela, maksymalnie 128 znaków.
- `data`: obiekt JSON, maksymalnie 256 KiB.
- `tags`: opcjonalna lista maksymalnie 30 tagów.
- `createdAt`, `updatedAt`: daty zarządzane przez silnik.
- `archivedAt`: data miękkiej archiwizacji.
- `expiresAt`: pole TTL tylko dla tasks, history i logs.

Indeks unikalny obejmuje `{ ownerId: 1, key: 1 }`, więc identyczny klucz może
istnieć dla innego właściciela. Nie przechowuj danych logowania, sekretów,
pełnych danych płatniczych ani niepotrzebnych danych wrażliwych.
