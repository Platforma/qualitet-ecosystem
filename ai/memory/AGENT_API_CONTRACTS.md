# Kontrakty API agentów

## Wspólne

- Transport JSON przez HTTPS w środowisku zdalnym.
- Każde żądanie `/api/ai/*` wymaga `Authorization: Bearer <AI_API_TOKEN>`.
- Token nie jest przyjmowany z query string, zapisywany w pamięci ani logowany.
- Dane wejściowe są walidowane przed wywołaniem Ollama lub MongoDB.
- Odpowiedzi błędów nie zawierają URI, tokenów ani stack trace.
- Identyfikator właściciela jest ustalany po stronie serwera.

## Chat / routing

`POST /api/ai/chat`

Żądanie: `{ "prompt": string, "agent"?: AgentId, "messages"?: Message[] }`.
Prompt ma 1–20 000 znaków, historia maksymalnie 50 wpisów user/assistant.
Backend dodaje system prompt z repozytorium; klient nie może nadpisać system
role. Nieznany agent zwraca 400. Brak `agent` uruchamia router intencji.

Odpowiedź: `{ taskId, agent, routeReason, model, response }`.
Wykonanie zapisuje status task/history/logs w Memory API.

## Status

- `GET /api/ai/status` zwraca zarejestrowane agenty i health Ollama.
- `GET /api/ai/health` zwraca dostępność Ollama, model i stan konfiguracji
  pamięci. To kontrola statusu, nie gotowość produkcyjna.
- `GET /api/ai/tasks` oraz `GET /api/ai/logs` wymagają działającej pamięci.

## Pamięć

Kontrakty CRUD opisano w `ai/agents/MEMORY_API.md`. Zapisy są ograniczone do
właściciela, mają schemat i obsługują miękką archiwizację.