# Henryk Technical Master

## Runtime

- Główna aplikacja interfejsu: Next.js App Router w
  `apps/henryk-command-center-next`.
- API AI jest w backendzie Node.js: `backend/server.js` montuje
  `backend/routes/ai.routes.js`.
- Agent Router: `backend/services/agent-router.service.js`.
- Klient Ollama: `backend/services/ollama.service.js`.
- Pamięć: `backend/memory/memory.engine.js`,
  `backend/memory/memory.schema.json` i adapter MongoDB.
- Prompty: `ai/agents/prompts/`; Modelfiles: `ai/modelfiles/`.

## Konfiguracja AI

- `OLLAMA_URL`: bazowy URL API Ollama; domyślnie `http://127.0.0.1:11434`.
- `OLLAMA_MODEL`: model domyślny.
- `OLLAMA_EMBEDDING_MODEL`: model embeddingów; domyślnie model ustawiony przez
  `OLLAMA_MODEL`.
- `OLLAMA_MODEL_<AGENT_ID>`: opcjonalny model dla agenta.
- `OLLAMA_TIMEOUT_MS`: timeout generacji/chat/embeddingu.
- `MONGODB_URI`: połączenie MongoDB, wymagane dla zadań i trwałej pamięci.
- `MONGODB_DATABASE`: nazwa bazy; gdy brak, używa się bazy z URI lub
  `qualitet_memory`.
- `AI_API_TOKEN`: wymagany bearer token API; bez konfiguracji `/api/ai/*`
  zwraca 503.
- `AI_OWNER_ID`: serwerowy zakres danych, domyślnie `owner`.

Nie zapisuj rzeczywistych sekretów w repozytorium, przykładach, logach ani
promptach. Nie deklaruj, że MongoDB lub Ollama działa, dopóki health check nie
potwierdzi połączenia.