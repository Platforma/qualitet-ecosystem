# QUALITET Ecosystem — Deployment Checklist

Stan konfiguracji repozytorium: 2026-11-04. To instrukcja wdrożenia, nie potwierdzenie istniejących usług. Wartości ENV sprawdzono bez odczytywania ich treści; wymagane zmienne nie są ustawione w lokalnym środowisku. Żadna usługa, domena ani połączenie produkcyjne nie zostały zweryfikowane.

## 1. Wszystkie ENV dla MongoDB

| Zmienna | Wymagana | Ustawienie |
|---|---:|---|
| `MONGODB_URI` | Tak | URI klastra produkcyjnego; przechowuj jako sekret w każdej usłudze Render korzystającej z bazy. |
| `MONGODB_DATABASE` | Zalecana | Jedna, identyczna nazwa bazy we wszystkich usługach. Ustaw ją jawnie: AI Backend może inaczej domyślnie użyć `qualitet_memory`, gdy nazwa nie jest w URI. |

**Kroki**

1. Utwórz bazę/klaster i osobnego użytkownika aplikacji z dostępem tylko do wymaganej bazy.
2. Skonfiguruj dozwolony dostęp sieciowy dla usług wdrożonych na Render; nie pozostawiaj szerokiego dostępu jako stałej konfiguracji produkcyjnej.
3. Ustaw te same `MONGODB_URI` i `MONGODB_DATABASE` w Command Center, Shop Builder i AI Backend.
4. Wdróż usługi i sprawdź ich logi oraz health checki. Następnie przetestuj inicjalizację kolekcji/indeksów i odczyt/zapis na bazie produkcyjnej.
5. Skonfiguruj kopie zapasowe, retencję i monitoring w dostawcy MongoDB.

Kod zakłada część kolekcji i indeksów podczas inicjalizacji lub pierwszego użycia. Nie potwierdzono żadnej z tych operacji na docelowej bazie.

## 2. Wszystkie ENV dla Ollama

| Zmienna | Wymagana | Gdzie ustawić / przeznaczenie |
|---|---:|---|
| `OLLAMA_URL` | Tak dla AI Backend | Bazowy URL osiągalnego z Render hosta Ollama, np. `https://ollama.example.com`; bez `/api`, query string i danych logowania. Nie używaj `localhost` dla oddzielnej usługi Render. |
| `OLLAMA_MODEL` | Tak dla AI Backend | Nazwa istniejącego modelu czatu. Repozytorium nie wybiera ani nie pobiera modelu. |
| `OLLAMA_EMBEDDING_MODEL` | Opcjonalna | Model embeddingów, jeśli używana jest funkcja `/api/embed`. |
| `OLLAMA_TIMEOUT_MS` | Opcjonalna | Limit czasu żądań generowania; domyślnie `120000` ms. |
| `OLLAMA_MODEL_<AGENT_ID>` | Opcjonalna | Nadpisanie modelu dla pojedynczego agenta, np. `OLLAMA_MODEL_AI_OWNER`; domyślnie używany jest `OLLAMA_MODEL`. |

**Gdzie Ollama ENV są potrzebne**

- **AI Backend:** `OLLAMA_URL`, `OLLAMA_MODEL`; opcjonalnie embedding, timeout i nadpisania modelu.
- **Command Center:** `OLLAMA_URL` i `OLLAMA_MODEL` są także odczytywane przez istniejące narzędzia Owner Center do testowania promptów/propozycji zmian. Ustaw je, jeśli te funkcje mają łączyć się bezpośrednio z Ollama. Jeżeli skonfigurowano systemowe wartości w Owner Center, aplikacja może użyć ich zamiast ENV.
- **Shop Builder:** nie znaleziono bezpośredniego użycia zmiennych Ollama.

**API używane przez backend:** `GET /api/version`, `GET /api/tags`, `POST /api/chat`; opcjonalnie `POST /api/embed`. Wybierz model zgodny z dostępną pamięcią i obciążeniem hosta, pobierz go na hoście Ollama i potwierdź przez `GET /api/tags`. `phi3` występuje w testach jako model testowy, nie jako zatwierdzony wybór produkcyjny.

Ollama nie jest usługą zdefiniowaną w `render.yaml`. Należy zapewnić osobny host osiągalny sieciowo z AI Backend i odpowiednie zabezpieczenie połączenia. Nie wystawiaj niezabezpieczonego API Ollama publicznie.

## 3. Wszystkie ENV dla Render

Wartości w blueprintcie mają `sync: false`, więc same nie zostaną wygenerowane. Ustaw je w ustawieniach Render odpowiedniej usługi; nie zapisuj sekretów w repozytorium. `PORT` jest dostarczany przez Render — nie trzeba ustawiać go ręcznie.

### `qualitet-henryk-command-center`

Wymienione w `render.yaml`:

- `MONGODB_URI`
- `MONGODB_DATABASE`
- `SESSION_SECRET`
- `OWNER_EMAIL`
- `OWNER_PASSWORD_HASH`
- `AI_BACKEND_URL`
- `AI_API_TOKEN`

Dodatkowo, jeśli używane są bezpośrednie funkcje Ollama w Owner Center:

- `OLLAMA_URL`
- `OLLAMA_MODEL`

`SESSION_SECRET` powinien być długim, losowym sekretem (co najmniej 32 bajty). `AI_API_TOKEN` musi być identyczny jak w AI Backend. `AI_BACKEND_URL` powinien wskazywać HTTPS-owy URL AI Backend.

### `qualitet-shop-builder`

- `MONGODB_URI`
- `MONGODB_DATABASE`
- `SHOP_SESSION_SECRET`
- `SHOP_OWNER_EMAIL`
- `SHOP_OWNER_PASSWORD_HASH`

Ustaw osobny, losowy `SHOP_SESSION_SECRET` (co najmniej 32 bajty) oraz hash hasła właściciela zgodny z mechanizmem logowania aplikacji.

### `qualitet-ai-backend`

- `MONGODB_URI`
- `MONGODB_DATABASE`
- `AI_API_TOKEN`
- `AI_OWNER_ID`
- `OLLAMA_URL`
- `OLLAMA_MODEL`

Opcjonalnie dodaj `OLLAMA_EMBEDDING_MODEL`, `OLLAMA_TIMEOUT_MS` i `OLLAMA_MODEL_<AGENT_ID>` dla wybranych agentów. `AI_API_TOKEN` musi być zgodny z Command Center. Nie umieszczaj jawnych haseł, tokenów ani URI w plikach projektu.

## 4. Usługi Render do utworzenia

Blueprint `render.yaml` deklaruje trzy usługi webowe Node.js, każdą w planie `free` i z `autoDeployTrigger: off`:

| Usługa | Katalog główny | Health check |
|---|---|---|
| `qualitet-henryk-command-center` | `apps/henryk-command-center-next` | `/api/health` |
| `qualitet-shop-builder` | `apps/shop-qualitetmarket` | `/login` |
| `qualitet-ai-backend` | `backend` | `/` |

Utwórz je z blueprintu Render wskazującego repozytorium i gałąź do wdrożenia, a następnie uzupełnij wszystkie ENV powyżej. Sam health check `/` AI Backend nie weryfikuje MongoDB ani Ollama. Po deployu sprawdź również chronione `/api/ai/health` i `/api/ai/status`.

## 5. Domeny do przypisania

`render.yaml` nie zawiera deklaracji domen niestandardowych. Są to cele zapisane w konfiguracji projektu, a nie potwierdzone rekordy DNS:

| Domena | Przypisz do usługi | Uwagi |
|---|---|---|
| `qualitet-market.com` | `qualitet-henryk-command-center` | Publiczny portal / Marketplace. |
| `admin.qualitet-market.com` | `qualitet-henryk-command-center` | Owner Center na tej samej usłudze. |
| `shop.qualitet-market.com` | `qualitet-shop-builder` | Shop Builder. |
| `ai.qualitet-market.com` | Opcjonalnie `qualitet-ai-backend` | Tylko jeśli chcesz dedykowany host API; po skonfigurowaniu ustaw `AI_BACKEND_URL` na ten HTTPS-owy adres. W przeciwnym razie użyj adresu `*.onrender.com`. |

W Render dodaj domeny niestandardowe do wskazanych usług, a następnie skonfiguruj wymagane rekordy DNS w Cloudflare i zweryfikuj TLS/HTTPS oraz routing. Dokładne wartości rekordów pobierz z Render dla utworzonych usług. `live.qualitet-market.com` nie ma odpowiadającej mu usługi w obecnym blueprintcie — nie kieruj go do niepowiązanej usługi.

## 6. Build Commands

| Usługa | Build Command |
|---|---|
| Command Center | `npm ci --include=dev && npm run build` |
| Shop Builder | `npm ci --include=dev && npm run build` |
| AI Backend | `npm ci --include=dev && npm run build` |

Te komendy są zgodne z aktualnym `render.yaml`. Build Shop uruchamia `next build --webpack`.

## 7. Start Commands

| Usługa | Start Command |
|---|---|
| Command Center | `npm run start` |
| Shop Builder | `npm run start` |
| AI Backend | `npm run start` |

## Kolejność uruchomienia produkcji

1. Skonfiguruj MongoDB, użytkownika, dostęp sieciowy oraz kopie zapasowe.
2. Przygotuj osiągalny i zabezpieczony host Ollama; zainstaluj wybrany model i sprawdź `GET /api/tags`.
3. Utwórz trzy usługi Render z blueprintu.
4. Ustaw wspólne ENV MongoDB, sekrety sesji, dane właścicieli, wspólny `AI_API_TOKEN` i URL Ollama zgodnie z tabelami.
5. Ustaw Build/Start Commands i health checki, wykonaj deploy i sprawdź logi.
6. Zweryfikuj połączenia MongoDB/Ollama, inicjalizację kolekcji/indeksów oraz status `/api/ai/health` i `/api/ai/status`.
7. Przypisz domeny i zweryfikuj DNS, TLS oraz dostęp do każdej usługi.
8. Pozostaw `autoDeployTrigger: off`, dopóki proces publikacji nie zostanie świadomie włączony.

## Raport gotowości

Wyniki są szacunkową gotowością wdrożeniową na podstawie konfiguracji repozytorium, nie potwierdzeniem stanu usług. W lokalnym środowisku nie znaleziono wymaganych ENV; nie sprawdzono kont Render, MongoDB Atlas, hosta Ollama ani DNS.

| Obszar | Ready |
|---|---:|
| Mongo | 50% |
| Ollama | 50% |
| Render | 50% |
| Production | 35% |
