# QUALITET Ecosystem — Production Checklist

Stan sprawdzenia: 2026-11-04. Zakres: wyłącznie MongoDB, Ollama i Render.

## Podsumowanie stanu

- Kod i konfiguracja wdrożeniowa zostały odczytane lokalnie; nie uzyskano dostępu do kont Render, MongoDB Atlas ani serwera Ollama.
- Zmienne środowiskowe sprawdzono bez odczytywania ich wartości. W lokalnym środowisku nie są ustawione zmienne wymagane do połączenia z produkcyjnymi usługami.
- `render.yaml` deklaruje usługi, polecenia i zmienne, ale `sync: false` oznacza, że wartości sekretów trzeba ustawić osobno w Render.
- Poniższe procenty są szacunkową oceną gotowości wdrożeniowej, a nie odczytem stanu usług. 100% wymaga ustawionej konfiguracji produkcyjnej i pomyślnego testu live.

## 1. MongoDB

### Czego brakuje

- [ ] Produkcyjnego URI i użytkownika bazy danych.
- [ ] Potwierdzenia połączenia z aplikacji wdrożonej na Render.
- [ ] Potwierdzenia, że Command Center, Shop Builder i AI Backend korzystają z tej samej bazy.
- [ ] Weryfikacji reguł sieciowych Atlas, TLS, uprawnień użytkownika, kopii zapasowych i polityki retencji.
- [ ] Testu inicjalizacji kolekcji oraz indeksów na docelowym koncie.

Ustaw `MONGODB_DATABASE` na tę samą nazwę dla wszystkich usług. To istotne, ponieważ AI Backend domyślnie wybiera `qualitet_memory`, gdy nazwa nie wynika z URI, a aplikacje webowe używają bazy wskazanej w URI. Jawna, wspólna wartość eliminuje tę rozbieżność.

### Zmienne ENV

| Zmienna | Wymagana | Zastosowanie |
|---|---:|---|
| `MONGODB_URI` | Tak | URI połączenia MongoDB Atlas lub innego osiągalnego klastra; przechowuj wyłącznie jako sekret Render. |
| `MONGODB_DATABASE` | Zalecana | Wspólna nazwa bazy danych dla trzech usług; ustaw identycznie w każdej. |

Użytkownik MongoDB powinien mieć dostęp tylko do wymaganej bazy oraz możliwość tworzenia kolekcji i indeksów. Kod aplikacji tworzy część kolekcji i indeksów przy inicjalizacji; nie zastępuje to konfiguracji klastra ani weryfikacji uprawnień.

### Kolekcje

**Aplikacja / Command Center** — kolekcje używane lub inicjalizowane przez aktualną warstwę bazy:

`users`, `roles`, `permissions`, `auth_sessions`, `auth_attempts`, `companies`, `suppliers`, `partners`, `advertisers`, `company_memberships`, `categories`, `products`, `carts`, `orders`, `stores`, `leads`, `crm_contacts`, `outreach_campaigns`, `campaigns`, `ad_accounts`, `subscriptions`, `invoices`, `payments`, `memory_entries`, `ai_memory`, `history_events`, `audit_logs`, `alerts`, `ai_agents`, `ai_tasks`, `integrations`, `integration_configs`, `owner_settings`, `marketplace_ads`, `analytics_events`, `system_health`.

**Trwała pamięć AI** — sekcje z `backend/memory/memory.schema.json` zapisują osobne kolekcje:

| Sekcja API | Kolekcja MongoDB |
|---|---|
| `users` | `memory_users` |
| `projects` | `memory_projects` |
| `companies` | `memory_companies` |
| `prompts` | `memory_prompts` |
| `agents` | `memory_agents` |
| `tasks` | `memory_tasks` |
| `history` | `memory_history` |
| `logs` | `memory_logs` |

**Shop Builder** korzysta dodatkowo z `shop_categories`, `shop_sessions`, `shop_login_attempts` i `customers`; współdzieli `stores`, `products` i `orders`. Kolekcje MongoDB powstają przy pierwszym zapisie lub utworzeniu indeksu — ich obecności nie potwierdzono na produkcyjnej bazie.

### Indeksy

Warstwa Command Center tworzy poniższe indeksy podczas inicjalizacji bazy. MongoDB tworzy też domyślny indeks `_id_`.

| Kolekcja | Klucze indeksów |
|---|---|
| `users` | `{ email: 1 }` **unique** |
| `roles`, `permissions` | `{ key: 1 }` **unique** |
| `auth_sessions` | `{ sessionId: 1 }` **unique**; `{ expiresAt: 1 }` TTL `0`; `{ userId: 1, revokedAt: 1 }` |
| `auth_attempts` | `{ key: 1 }` **unique**; `{ expiresAt: 1 }` TTL `0` |
| `ai_agents` | `{ agentId: 1 }` **unique** |
| `ai_tasks` | `{ taskId: 1 }` **unique**; `{ status: 1, createdAt: -1 }` |
| `memory_entries` | `{ key: 1 }` **unique**; `{ type: 1, updatedAt: -1 }` |
| `ai_memory` | `{ key: 1, ownerId: 1 }` **unique**; `{ ownerId: 1, type: 1, updatedAt: -1 }` |
| `integrations` | `{ provider: 1 }` **unique** |
| `integration_configs` | `{ provider: 1 }` **unique**; `{ updatedAt: -1 }` |
| `audit_logs` | `{ createdAt: -1 }`; `{ actorId: 1, createdAt: -1 }` |
| `notifications` | `{ recipientId: 1, createdAt: -1 }`; `{ recipientId: 1, readAt: 1 }` |
| `system_health` | `{ checkedAt: -1 }` |
| `companies` | `{ email: 1 }`; `{ ownerUserId: 1, status: 1 }`; `{ status: 1, type: 1, createdAt: -1 }` |
| `suppliers` | `{ companyId: 1 }` **unique**; `{ status: 1, createdAt: -1 }` |
| `partners`, `advertisers` | `{ userId: 1 }`; `{ companyId: 1 }` |
| `crm_contacts` | `{ email: 1 }`; `{ companyId: 1 }` |
| `leads` | `{ status: 1, createdAt: -1 }`; `{ email: 1 }`; `{ website: 1 }` |
| `outreach_campaigns` | `{ status: 1, createdAt: -1 }` |
| `campaigns` | `{ advertiserId: 1, status: 1, createdAt: -1 }`; `{ status: 1, startsAt: 1 }` |
| `products` | `{ name: 1 }`; `{ status: 1 }`; `{ status: 1, archivedAt: 1, createdAt: -1 }`; `{ supplierCompanyId: 1, sku: 1 }` |
| `carts` | `{ customerId: 1, status: 1 }`; `{ updatedAt: -1 }` |
| `orders` | `{ customerId: 1, createdAt: -1 }`; `{ status: 1, createdAt: -1 }` |
| `payments` | `{ orderId: 1, createdAt: -1 }`; `{ status: 1, createdAt: -1 }` |
| `stores` | `{ name: 1 }` w aplikacji; Shop dodaje `{ ownerUserId: 1, createdAt: -1 }`, `{ ownerUserId: 1, slug: 1 }`, `{ domain: 1 }` |
| `categories` | `{ slug: 1 }`; `{ parentId: 1 }` |
| `subscriptions` | `{ userId: 1, status: 1 }`; `{ companyId: 1, status: 1 }`; `{ currentPeriodEnd: 1 }` |
| `invoices` | `{ invoiceNumber: 1 }` **unique**; `{ userId: 1, createdAt: -1 }`; `{ status: 1, dueAt: 1 }` |
| `marketplace_ads` | `{ marketplace: 1, status: 1 }` |
| `memory_users`, `memory_projects`, `memory_companies`, `memory_prompts`, `memory_agents`, `memory_tasks`, `memory_history`, `memory_logs` | `{ ownerId: 1, key: 1 }` **unique**; `{ ownerId: 1, archivedAt: 1, updatedAt: -1 }`; dla `memory_tasks`, `memory_history`, `memory_logs`: `{ expiresAt: 1 }` TTL `0` |
| `shop_categories` | `{ storeId: 1, slug: 1 }` **unique**; `{ ownerUserId: 1, storeId: 1, createdAt: -1 }` |
| `shop_sessions` | `{ sessionId: 1 }` **unique**; `{ expiresAt: 1 }` TTL `0`; `{ userId: 1, revokedAt: 1 }` |
| `shop_login_attempts` | `{ key: 1 }` **unique**; `{ expiresAt: 1 }` TTL `0` |

Indeksy aplikacyjne są zakładane przez kod przy inicjalizacji albo dostępie do danej funkcji. Indeksy pamięci AI powstają przy pierwszym uwierzytelnionym użyciu API pamięci/zadań. Przed produkcyjnym ruchem sprawdź ich utworzenie w Atlas; nie twórz ponownie indeksu `unique`, jeśli istnieją duplikaty danych.

## 2. Ollama

### Modele

- `OLLAMA_MODEL` jest wymaganym aliasem/model-tag dla czatu; repozytorium nie wybiera ani nie pobiera modelu produkcyjnego.
- `OLLAMA_EMBEDDING_MODEL` jest opcjonalny i potrzebny, jeśli wdrożenie ma korzystać z endpointu embeddingów.
- Testy używają `phi3` jako atrapowego modelu odpowiedzi. Nie potwierdza to jego instalacji ani przydatności produkcyjnej.
- Wybierz model odpowiedni do dostępnej pamięci RAM/VRAM i wymagań jakościowych, pobierz go na hoście Ollama, a następnie potwierdź dostępność przez `GET /api/tags`.

### API używane przez backend

| Endpoint Ollama | Użycie |
|---|---|
| `GET /api/version` | Health check Ollama |
| `GET /api/tags` | Sprawdzenie zainstalowanych modeli |
| `POST /api/chat` | Rozmowy agentów |
| `POST /api/embed` | Embeddingi, funkcja opcjonalna |

Backend udostępnia chronione trasy `GET /api/ai/health`, `GET /api/ai/status` i `POST /api/ai/chat`. Żądania do tych tras wymagają nagłówka HTTP `Authorization` zawierającego wartość skonfigurowanego `AI_API_TOKEN`.

### URL i ENV

| Zmienna | Wymagana | Wartość/uwaga |
|---|---:|---|
| `OLLAMA_URL` | Tak | Bazowy `http(s)://host:port`, bez `/api`, query string i danych logowania. Lokalny domyślny adres `http://127.0.0.1:11434` nie zadziała jako adres zdalnego serwera Render. |
| `OLLAMA_MODEL` | Tak | Nazwa zainstalowanego modelu czatu. |
| `OLLAMA_EMBEDDING_MODEL` | Opcjonalna | Nazwa zainstalowanego modelu embeddingów, jeśli używany jest `/api/embed`. |
| `OLLAMA_TIMEOUT_MS` | Opcjonalna | Limit czasu żądań generowania; domyślnie `120000` ms. |
| `OLLAMA_MODEL_<AGENT_ID>` | Opcjonalna | Nadpisanie modelu dla konkretnego agenta, np. `OLLAMA_MODEL_AI_OWNER`; w przeciwnym razie używany jest `OLLAMA_MODEL`. |

Ollama nie jest usługą zdefiniowaną w `render.yaml`. Potrzebny jest osobny osiągalny host Ollama, a backend na Render musi mieć do niego trasę sieciową. Nie wystawiaj niezabezpieczonego API Ollama do publicznego Internetu; użyj prywatnej sieci albo kontrolowanej bramy HTTPS. Publiczny URL `ai.qualitet-market.com` nie jest obecnie skonfigurowany jako usługa ani route w blueprintie.

## 3. Render

### Usługi zdefiniowane w `render.yaml`

Wszystkie trzy usługi mają `runtime: node`, `plan: free` i `autoDeployTrigger: off`.

| Usługa | `rootDir` | Health check |
|---|---|---|
| `qualitet-henryk-command-center` | `apps/henryk-command-center-next` | `/api/health` |
| `qualitet-shop-builder` | `apps/shop-qualitetmarket` | `/login` |
| `qualitet-ai-backend` | `backend` | `/` |

Health check AI Backend sprawdza HTTP na `/`, nie dostępność MongoDB ani Ollama. Po wdrożeniu sprawdź również chronione `/api/ai/health` i `/api/ai/status`.

### Domeny

Blueprint nie deklaruje żadnej `domains:` ani nie potwierdza utworzenia usług na koncie Render. Docelowe mapowanie zapisane w pamięci projektu:

| Rola | Docelowa domena | Usługa |
|---|---|---|
| Marketplace/public portal | `qualitet-market.com` | Command Center / publiczna aplikacja |
| Owner Center | `admin.qualitet-market.com` | Command Center |
| Shop Builder | `shop.qualitet-market.com` | Shop Builder |
| AI API | Brak skonfigurowanej domeny | AI Backend; użyj przypisanego URL Render przez HTTPS |

Render może przypisać usłudze domyślny adres `*.onrender.com`, ale dokładne adresy i dostępność slugów wymagają sprawdzenia na koncie. Po utworzeniu usług dodaj domeny niestandardowe w Render i Cloudflare, zweryfikuj DNS/TLS oraz ustaw `AI_BACKEND_URL` na HTTPS-owy adres AI Backend.

### Build i start commands

| Usługa | Build Command | Start Command |
|---|---|---|
| Command Center | `npm ci --include=dev && npm run build` | `npm run start` |
| Shop Builder | `npm ci --include=dev && npm run build` | `npm run start` |
| AI Backend | `npm ci --include=dev && npm run build` | `npm run start` |

Polecenia i `rootDir` pochodzą z `render.yaml`. Shop używa skryptu buildu `next build --webpack`; Command Center używa `next build`.

### Zmienne Render

Ustaw sekrety w ustawieniach Render dla każdej usługi; nie wpisuj wartości do tego pliku ani repozytorium.

**Command Center**

`MONGODB_URI`, `MONGODB_DATABASE`, `SESSION_SECRET`, `OWNER_EMAIL`, `OWNER_PASSWORD_HASH`, `AI_BACKEND_URL`, `AI_API_TOKEN`.

**Shop Builder**

`MONGODB_URI`, `MONGODB_DATABASE`, `SHOP_SESSION_SECRET`, `SHOP_OWNER_EMAIL`, `SHOP_OWNER_PASSWORD_HASH`.

**AI Backend**

`MONGODB_URI`, `MONGODB_DATABASE`, `AI_API_TOKEN`, `AI_OWNER_ID`, `OLLAMA_URL`, `OLLAMA_MODEL`.

- `AI_API_TOKEN` musi być identyczny w Command Center i AI Backend (oraz w innych konsumentach AI, które wywołują backend).
- `AI_BACKEND_URL` powinien wskazywać działający URL HTTPS AI Backend, bez nieosiągalnego dla aplikacji `localhost`.
- `MONGODB_URI` i `MONGODB_DATABASE` muszą wskazywać tę samą bazę we wszystkich usługach, które współdzielą dane.
- `OLLAMA_URL` musi być osiągalny z usługi AI Backend; samo ustawienie zmiennej nie instaluje ani nie uruchamia modelu.
- `SESSION_SECRET` i `SHOP_SESSION_SECRET` ustaw jako osobne, silne sekrety; nie używaj wartości przykładowych.
- Hash właściciela ustaw zgodnie z mechanizmem logowania aplikacji; nie umieszczaj jawnego hasła w ENV ani w repozytorium.
- Dla embeddingów dodaj w AI Backend `OLLAMA_EMBEDDING_MODEL`; `OLLAMA_TIMEOUT_MS` i per-agent `OLLAMA_MODEL_<AGENT_ID>` są opcjonalne.

### Kroki przed produkcyjnym wdrożeniem

1. Utwórz/wybierz produkcyjną bazę MongoDB, ogranicz dostęp sieciowy do potrzebnych usług i przygotuj użytkownika aplikacji.
2. Wybierz wspólną nazwę `MONGODB_DATABASE`, dodaj `MONGODB_URI` i nazwę bazy jako sekrety/ENV wszystkich trzech usług.
3. Przygotuj osiągalny host Ollama, pobierz i sprawdź model czatu, a następnie skonfiguruj `OLLAMA_URL` i `OLLAMA_MODEL` w AI Backend.
4. Utwórz trzy usługi z blueprintu Render, sprawdź ich `rootDir`, Build/Start Commands i health checks.
5. Ustaw pozostałe zmienne usług, w tym wspólny `AI_API_TOKEN`, sekrety sesji i dane właściciela.
6. Zweryfikuj build i deploy każdej usługi, logi startowe oraz health checks.
7. Wykonaj test połączenia MongoDB i potwierdź automatyczne utworzenie oczekiwanych kolekcji i indeksów.
8. Wywołaj chronione `/api/ai/health` i `/api/ai/status`; sprawdź osiągalność Ollama i obecność modelu.
9. Dodaj domeny niestandardowe, skonfiguruj DNS w Cloudflare i potwierdź HTTPS oraz routing dla marketplace, Owner Center i Shop Builder.
10. Włącz auto-deploy dopiero po zatwierdzeniu procesu publikacji; obecnie blueprint ma `autoDeployTrigger: off`.

## Raport gotowości

Szacunek poniżej dotyczy gotowości operacyjnej do produkcji, nie procentu ukończenia funkcji produktu. Nie wykonano kontroli konta Render, MongoDB Atlas, DNS ani zdalnego Ollama.

| Obszar | Ready | Główne blokery |
|---|---:|---|
| OWNER CENTER | 50% | Usługa i ENV są opisane, ale brakuje potwierdzonych sekretów i testu produkcyjnego. |
| SHOP BUILDER | 50% | Build i definicja usługi istnieją; połączenie z docelową bazą i wdrożenie niezweryfikowane. |
| SUPPLIER | 40% | Funkcje zależą od wspólnej bazy; nie potwierdzono produkcyjnych danych ani procesu live. |
| ADVERTISER | 30% | Integracje reklamowe i usługa runtime nie zostały potwierdzone w tym sprawdzeniu. |
| AI CENTER | 50% | Backend, endpointy i model klienta istnieją; brak poświadczeń i testu live MongoDB/Ollama. |
| MONGODB | 50% | Kod inicjalizacji i indeksów istnieje; brak skonfigurowanego lokalnie URI oraz testu produkcyjnego. |
| OLLAMA | 50% | Klient i API są zaimplementowane; nie wskazano produkcyjnego hosta ani modelu. |
| RENDER | 50% | Blueprint ma trzy usługi, ENV i komendy; brak potwierdzonego deployu, domen i konfiguracji sekretów. |
| **PRODUCTION** | **35%** | Brak weryfikacji live, wartości ENV, połączeń z usługami i produkcyjnych domen. |

Status procentowy jest orientacyjną oceną na podstawie dostępnej konfiguracji repozytorium. Nie oznacza, że usługi są aktywne lub że wdrożenie produkcyjne zostało wykonane.
