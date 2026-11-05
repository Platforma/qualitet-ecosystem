# AI API

Implementacja Node.js znajduje się w `backend/routes/ai.routes.js` i jest
montowana pod `/api/ai/*` przez `backend/server.js`.

## Uwierzytelnianie

Każda trasa wymaga `Authorization: Bearer <AI_API_TOKEN>`. Jeżeli zmienna nie
jest skonfigurowana, endpointy AI zwracają `503`; błędny token zwraca `401`.
Żądania JSON mają limit 256 KiB. Nie przekazuj tokenu w URL ani nie loguj go.

## Endpointy

| Metoda | Ścieżka | Zastosowanie |
|---|---|---|
| GET | `/api/ai/health` | Stan Ollama, model i konfiguracja pamięci |
| GET | `/api/ai/status` | Rejestr agentów i dostępność Ollama |
| GET | `/api/ai/tasks` | Lista zadań, `q`, `limit` |
| GET | `/api/ai/logs` | Lista logów AI, `q`, `limit` |
| GET | `/api/ai/memory/:section` | Lista/wyszukiwanie albo odczyt przez `?key=` |
| POST | `/api/ai/memory/:section` | Utworzenie rekordu walidowanego pamięci |
| PATCH | `/api/ai/memory/:section/:key` | Częściowa aktualizacja danych |
| DELETE | `/api/ai/memory/:section/:key` | Miękka archiwizacja |
| POST | `/api/ai/chat` | Routing do agenta, Ollama i zapis wyniku |

`POST /api/ai/chat` przyjmuje `{ "prompt": "...", "agent"?: "AI_*",
"messages"?: [{ "role": "user|assistant", "content": "..." }] }`.
Odpowiedź zawiera `taskId`, `agent`, `routeReason`, `model` i `response`.

## Statusy

`/health` zwraca `200` dla dostępności endpointu i osobne statusy zależności;
`200` nie oznacza, że pamięć i model są gotowe do pracy. Błędy wejścia to `400`,
brak auth `401`, brak/konflikt rekordu `404`/`409`, brak konfiguracji `503`.