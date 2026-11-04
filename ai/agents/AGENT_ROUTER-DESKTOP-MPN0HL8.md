# Agent Router

Implementacja wykonawcza: `backend/services/agent-router.service.js`.
Kontrakt jest synchroniczny i bez skutków ubocznych: klasyfikuje tekst, zwraca
identyfikator agenta oraz powód routingu. Nie wywołuje Ollama ani nie zapisuje
zadań. Wykonanie realizuje chronione API `backend/routes/ai.routes.js`.

## Reguły routingu

| Intencja | Agent |
|---|---|
| Grafika, logo, baner, branding | `AI_GRAFIK_SZEF` |
| Kod, programowanie, API, błąd | `AI_DEVELOPER` |
| Marketing, kampania, reklama | `AI_MARKETING` |
| SEO, pozycjonowanie, indeksacja | `AI_SEO` |
| Biznes, strategia, rentowność | `AI_BIZNES` |
| Cloudflare, DNS, SSL, WAF | `AI_CLOUD` |
| CRM, kontakt, lead, pipeline | `AI_CRM` |
| Sprzedaż, oferta, konwersja | `AI_SALES` |
| Social media, Instagram, TikTok, LinkedIn | `AI_SOCIAL_MEDIA` |
| Badania, konkurencja, trendy | `AI_RESEARCH` |
| Wsparcie, reklamacja, problem użytkownika | `AI_SUPPORT` |
| Helpdesk, ticket, incydent | `AI_HELPDESK` |
| Treść, artykuł, opis, redakcja | `AI_CONTENT` |
| Właściciel, decyzja zarządcza | `AI_OWNER` |
| Brak dopasowania / nieprawidłowe wejście | `AI_QUALITET` |

Pierwsze dopasowanie w uporządkowanej tabeli wygrywa; dlatego konkretne domeny
(np. social media i Cloudflare) poprzedzają ogólne hasła marketingowe. Tekst
jest normalizowany z polskich znaków i bez rozróżniania wielkości liter.

## Kontrakt

`routeAgent(text)` zwraca `{ id, role, reason }`.
`listAgents()` zwraca zarejestrowane identyfikatory.
`getAgentPrompt(id)` ładuje wyłącznie znany prompt z `ai/agents/prompts/`.
Nieznane identyfikatory są odrzucane, a nie używane jako ścieżka pliku.

## Wykonanie

1. `/api/ai/chat` weryfikuje token serwerowy i waliduje rozmiar/kształt żądania.
2. Router wybiera specjalistę albo `AI_QUALITET`; jawne `agent` musi być z rejestru.
3. System prompt specjalisty jest dodany przez backend; klient nie może go podmienić.
4. Zadanie, historia i log są zapisywane przez pamięć MongoDB z zakresem `ownerId`.
5. Ollama zwraca odpowiedź; stan zadania przechodzi do `completed` lub `failed`.

Routing nie jest autoryzacją. Każdy endpoint AI wymaga `AI_API_TOKEN`.
