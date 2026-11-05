# Memory API

API jest implementowane przez `backend/memory/memory.engine.js` i udostępnione
przez `backend/routes/ai.routes.js`. Dostęp wymaga nagłówka
`Authorization: Bearer <AI_API_TOKEN>`. Bez tokenu API zwraca `503`; błędny
token zwraca `401`. Właściciel jest ustawiany po stronie serwera przez
`AI_OWNER_ID`, a nie przyjmowany z body.

## Sekcje

`users`, `projects`, `companies`, `prompts`, `agents`, `tasks`, `history`,
`logs`. Schemat i nazwy kolekcji są w `backend/memory/memory.schema.json`.
Każda sekcja ma oddzielną kolekcję `memory_<section>` w bazie z
`MONGODB_DATABASE`, bazie wskazanej w URI lub `qualitet_memory`, jeśli URI nie
zawiera nazwy bazy.

## Endpointy

- `GET /api/ai/memory/:section?q=&limit=` — wyszukiwanie i lista.
- `GET /api/ai/memory/:section?key=` — odczyt jednego aktywnego rekordu.
- `POST /api/ai/memory/:section` — utworzenie `{ "key", "data", "tags"? }`.
- `PATCH /api/ai/memory/:section/:key` — częściowa aktualizacja `data` i
  opcjonalna aktualizacja `tags`.
- `DELETE /api/ai/memory/:section/:key` — miękka archiwizacja; bez usuwania
  dokumentu z MongoDB.
- `GET /api/ai/tasks?limit=&q=` — zadania AI.
- `GET /api/ai/logs?limit=&q=` — logi AI.
- `GET /api/ai/status` i `/api/ai/health` — stan agentów, Ollama i pamięci.

Body ma limit 256 KiB; pojedyncze `data` ma limit 256 KiB, klucz 128 znaków,
tagi 30 pozycji po maksymalnie 64 znaki. Wszystkie odczyty i zapisy są
ograniczone do `ownerId`. Lista ma limit maksymalnie 200 rekordów; wyszukiwanie
tekstowe pobiera najwyżej 500 aktywnych rekordów do filtrowania.

## Retencja i indeksy

Indeksy są zakładane leniwie przy pierwszym żądaniu: unikalny
`{ ownerId, key }`, indeks listowania po właścicielu/statusie/czasie oraz TTL
90 dni dla `tasks`, `history` i `logs`. Kolekcje użytkowników, projektów,
firm, promptów i agentów nie są automatycznie usuwane.

Nie zapisuj haseł, tokenów, kluczy API ani pełnych danych płatniczych. Treści
zadań AI mogą zawierać dane użytkownika: przed włączeniem API należy ustalić
podstawę, retencję i zasady dostępu do bazy.
