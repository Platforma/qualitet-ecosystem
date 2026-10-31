# Memory Engine

Implementacja: `backend/memory/memory.engine.js`.
Walidacja sekcji i wymaganych pól: `backend/memory/memory.schema.json`.
Typy domenowe dla kodu TypeScript: `backend/memory/*.model.ts`.

## Zasady

- Sekcje: users, projects, companies, prompts, agents, tasks, history, logs.
- Każdy rekord jest izolowany przez serwerowy `ownerId`.
- Każdy zapis ma `key`, obiekt `data`, `tags`, `createdAt` i `updatedAt`.
- Aktualizacja waliduje wynik scalony; archiwizacja jest miękka.
- Zadania, historia i logi wygasają po 90 dniach; inne sekcje nie mają TTL.
- Indeksy są tworzone przez `ensureIndexes()` i nie kasują istniejących danych.
- Wyszukiwanie jest ograniczone do właściciela i do 500 rekordów przed
  filtrowaniem; wynik jest ograniczony do 200 rekordów.

## Granice

Silnik wymaga adaptera zgodnego z interfejsem kolekcji MongoDB. Nie otwiera
samodzielnie połączenia, nie interpretuje żądań HTTP i nie zastępuje
uwierzytelniania. Połączenie i API dostarcza warstwa backendowa.
