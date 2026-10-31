# Uwierzytelnianie API AI

## Konfiguracja

Wymagany jest serwerowy `AI_API_TOKEN` i opcjonalny `AI_OWNER_ID`. Token musi
być losowy, długi, przechowywany tylko w secret store procesu backendu i
rotowany po podejrzeniu ujawnienia. Nie wstawiaj go do frontendowego `NEXT_PUBLIC_*`,
promptów, Modelfile, logów, repozytorium ani query string.

## Weryfikacja

`backend/routes/ai.routes.js` akceptuje wyłącznie `Authorization: Bearer`.
Porównuje skróty o stałej długości przez `timingSafeEqual`. Niezgodny token
otrzymuje `401`, brak konfiguracji otrzymuje `503`. Żądania mają limit 256 KiB.

## Zakres danych

`ownerId` jest pobierany z konfiguracji serwera, nie z payloadu. Każde
zapytanie pamięci filtruje po `ownerId`. Tożsamość tokenu jest pojedynczym
administracyjnym sekretem API, a nie systemem kont użytkowników ani RBAC.
Przed użyciem wielotenantowym wymagane jest indywidualne uwierzytelnianie i
autoryzacja.

## Ograniczenia i operacje

- API powinno być wystawione przez HTTPS poza localhost.
- Bez `AI_API_TOKEN` żadne endpointy `/api/ai/*` nie są aktywne.
- Nie uruchamiaj prawdziwych zadań AI w środowisku testowym bez odrębnej zgody.
- Rotacja tokenu wymaga aktualizacji secret store i kontrolowanego restartu.
- Nie wykonuj deployu ani zmian uprawnień z poziomu tego kontraktu.