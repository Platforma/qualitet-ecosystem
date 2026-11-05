# Shop Builder — raport wdrożeniowy

Data weryfikacji: 2026-11-05

Raport opisuje konfigurację repozytorium i dostępne lokalne testy. Nie potwierdza stanu kont Render, Cloudflare ani MongoDB Atlas. Nie odczytano ani nie umieszczono tu wartości sekretów.

## 1. URL Render

Blueprint deklaruje usługę `qualitet-shop-builder` w `render.yaml`, z katalogiem głównym `apps/shop-qualitetmarket`, poleceniem budowania `npm ci --include=dev && npm run build`, poleceniem startowym `npm run start` i health checkiem `/login`.

Przewidywany domyślny adres:

`https://qualitet-shop-builder.onrender.com`

Render przypisuje rzeczywisty adres `onrender.com` po utworzeniu usługi. Należy potwierdzić go w Dashboard → usługa `qualitet-shop-builder` → Settings. Sama deklaracja w `render.yaml` nie dowodzi, że usługa została utworzona.

## 2. Domena niestandardowa

Docelowa domena Shop Builder:

`shop.qualitet-market.com`

W Render dodaj `shop.qualitet-market.com` do usługi `qualitet-shop-builder`. Blueprint nie deklaruje domen niestandardowych. Po dodaniu domeny Render pokaże rekord DNS i cel, który należy ustawić w Cloudflare.

## 3. Rekord DNS Cloudflare

Utwórz rekord zgodny z wartością wskazaną przez Render:

| Typ | Nazwa | Cel / wartość | Proxy |
|---|---|---|---|
| CNAME | `shop` | adres usługi pokazany w Render, przewidywany `qualitet-shop-builder.onrender.com` | DNS only na czas konfiguracji i weryfikacji TLS |

Nie twórz rekordu A na podstawie zgadywanego adresu IP. Po potwierdzeniu domeny i HTTPS w Render można osobno rozważyć włączenie proxy Cloudflare i ponownie zweryfikować routing oraz TLS.

W bieżącym sprawdzeniu nie potwierdzono rekordu A/CNAME dla `shop.qualitet-market.com`. Brak lokalnych danych API Cloudflare uniemożliwił odczyt strefy w panelu dostawcy.

## 4. Wymagane ENV usługi Shop Builder

`render.yaml` wymienia pięć zmiennych; każda ma `sync: false`, więc jej wartość trzeba ustawić osobno w środowisku usługi Render:

| Zmienna | Wymagana | Przeznaczenie |
|---|---:|---|
| `MONGODB_URI` | Tak | URI klastra MongoDB; przechowuj jako sekret. |
| `MONGODB_DATABASE` | Zalecana | Jawna nazwa współdzielonej bazy. Ustaw taką samą nazwę w aplikacjach, które mają współdzielić dane. |
| `SHOP_SESSION_SECRET` | Tak | Sekret podpisujący sesje Shop; wymagane co najmniej 32 bajty. |
| `SHOP_OWNER_EMAIL` | Tak | Adres konta właściciela Shop. |
| `SHOP_OWNER_PASSWORD_HASH` | Tak | Hash scrypt w formacie `scrypt$<salt hex>$<hash hex>`; nie wpisuj jawnego hasła. |

`PORT` i `NODE_ENV` są obsługiwane przez środowisko Render/Next.js i nie są zadeklarowane jako ręcznie ustawiane ENV w blueprintcie.

## 5. MongoDB

**Połączenie produkcyjne: niepotwierdzone.** W lokalnym środowisku nie były dostępne `MONGODB_URI` ani `MONGODB_DATABASE`, a konto Atlas nie zostało sprawdzone. Kod Shop wymaga `MONGODB_URI`; bez połączenia logowanie nie może utworzyć rekordu sesji.

Przed wdrożeniem ustaw URI, nazwę bazy, dostęp sieciowy dla usługi Render i użytkownika bazy o ograniczonych uprawnieniach. Następnie zweryfikuj logi usługi i wykonaj test połączenia po deployu.

## 6. Logowanie

**Kod logowania istnieje, ale działania na produkcji nie potwierdzono.** Endpoint `POST /api/auth/login` weryfikuje e-mail i hash hasła, wymaga poprawnego źródła żądania, zapisuje sesję w MongoDB oraz ustawia ciasteczko `HttpOnly`, `SameSite=Strict` i w produkcji `Secure`. Implementacja ma również ograniczanie nieudanych prób logowania.

Do działania potrzebne są kompletne wartości `SHOP_OWNER_EMAIL`, `SHOP_OWNER_PASSWORD_HASH`, `SHOP_SESSION_SECRET`, `MONGODB_URI` i dostępna baza. Brak dostępnych lokalnie poświadczeń produkcyjnych uniemożliwił wykonanie testu logowania live.

## Stan wdrożenia

- Konfiguracja usługi w `render.yaml`: **jest**.
- Build, lint i typecheck sklepu: **PASS** według lokalnej weryfikacji projektu.
- Usługa Render utworzona i aktywna: **niepotwierdzone**.
- Wartości ENV ustawione w Render: **niepotwierdzone**.
- Domena przypisana w Render: **niepotwierdzone**.
- DNS Cloudflare dla `shop.qualitet-market.com`: **niepotwierdzony**.
- MongoDB produkcyjne: **niepotwierdzone**.
- Logowanie produkcyjne: **nieprzetestowane**.

### Zalecana kolejność uruchomienia

1. Utwórz lub potwierdź usługę `qualitet-shop-builder` z blueprintu Render.
2. Ustaw pięć ENV wymaganych przez Shop Builder.
3. Potwierdź, że `/login` zwraca prawidłową odpowiedź i usługa łączy się z MongoDB.
4. Dodaj `shop.qualitet-market.com` w ustawieniach usługi Render.
5. Utwórz w Cloudflare rekord CNAME `shop` dokładnie do celu podanego przez Render, początkowo z proxy wyłączonym.
6. Poczekaj na weryfikację domeny i TLS w Render; następnie przetestuj stronę i logowanie przez HTTPS.
