# AUTO COMPLETE ENGINE

## WERSJA

1.0

---

# CEL

AUTO COMPLETE ENGINE jest odpowiedzialny za automatyczne wykrywanie:

- braków konfiguracji
- błędów systemowych
- brakujących integracji
- braków bezpieczeństwa
- braków dokumentacji
- braków infrastruktury

oraz przygotowanie gotowej instrukcji naprawy.

---

# STATUSY

## OK

Element działa poprawnie.

Przykład:

Cloudflare ✅

MongoDB ✅

GitHub ✅

---

## WARNING

Element wymaga uwagi.

Przykład:

Certyfikat wygasa za 14 dni.

---

## ACTION_REQUIRED

Wymagane działanie właściciela.

Przykład:

Brak Stripe API.

System musi wygenerować:

UZUPEŁNIJ

---

## CRITICAL

Błąd krytyczny.

Przykład:

MongoDB Offline.

Render Offline.

Brak SSL.

---

# OBSZARY KONTROLI

## DNS

Sprawdzaj:

- domeny
- subdomeny
- rekordy A
- rekordy CNAME
- rekordy MX

---

## SSL

Sprawdzaj:

- HTTPS
- certyfikaty
- datę wygaśnięcia

---

## CLOUDFLARE

Sprawdzaj:

- SSL
- WAF
- DNS
- Bot Protection

---

## MONGODB

Sprawdzaj:

- połączenie
- kolekcje
- backupy

---

## GITHUB

Sprawdzaj:

- repozytoria
- workflow
- deploy

---

## RENDER

Sprawdzaj:

- status usług
- deploye
- logi

---

## STRIPE

Sprawdzaj:

- klucze API
- webhooki
- subskrypcje

---

## DISCORD

Sprawdzaj:

- webhooki
- status połączeń

---

## AI

Sprawdzaj:

- Ollama
- modele
- Memory Layer
- Agent Router

---

# MODUŁ UZUPEŁNIJ

Jeżeli system wykryje problem:

tworzy wpis:

Status:

ACTION_REQUIRED

---

# FORMAT

Problem:

Brak Stripe API

Dlaczego ważne:

Bez tego nie można pobierać płatności.

Instrukcja:

1. Wejdź do Stripe Dashboard
2. Otwórz API Keys
3. Skopiuj Secret Key
4. Wklej do konfiguracji

Link:

https://dashboard.stripe.com

Test:

Sprawdź połączenie API.

Przycisk:

[UZUPEŁNIJ]

---

# BEZPIECZNY CYKL AUDYTU I NAPRAWY

Ta specyfikacja nie nadaje agentowi uprawnień do samodzielnych zmian w
produkcji. Raport musi odróżniać wynik sprawdzenia od przypuszczenia. Nie
wyświetlaj wartości sekretów; zapis, deploy i operacje destrukcyjne wymagają
oddzielnej zgody właściciela.

## Self repair

1. Zapisz stan Git i zidentyfikuj zmiany użytkownika.
2. Odtwórz problem i znajdź przyczynę na podstawie kodu/logu.
3. Przygotuj najmniejszy diff ograniczony do zgłoszonego obszaru.
4. Nie nadpisuj niepowiązanych plików ani nie usuwaj istniejącej logiki.
5. Zatrzymaj się, gdy naprawa wymaga sekretu, decyzji produktowej lub ryzykownej
   zmiany produkcyjnej.

## Self validation

- Waliduj format żądania i odpowiedzi, typy i granice danych.
- Uruchamiaj test jednostkowy lub integracyjny zakresu zmiany.
- Uruchamiaj lint, TypeScript i build, jeśli są dostępne i nie modyfikują
  obszarów poza zakresem.
- Raportuj komendę, kod wyjścia i ograniczenia; nie oznaczaj testu jako
  zaliczonego bez jego uruchomienia.

## File scan

- Ogranicz skan do repozytorium i wskazanych katalogów.
- Wykrywaj pliki zerowej długości, placeholdery, TODO/FIXME, puste JSON-y,
  nieużywane duplikaty oraz brakujące testy.
- Pomijaj `node_modules`, artefakty builda, sekrety, pliki binarne i katalogi
  ignorowane przez Git.
- Raportuj ścieżki i rozmiary; nie wypisuj zawartości `.env`.

## Project audit

Sprawdzaj osobno UI, backend, API, integracje, bazę, auth, testy i deploy.
Widoczny komponent nie jest dowodem działającej funkcji; statyczny status nie
jest potwierdzeniem integracji. Oceny procentowe muszą jawnie podawać kryteria
i zakres.

## Dependency audit

- Używaj manifestu i lockfile jako źródła wersji.
- Wykrywaj brakujące, nieużywane i przestarzałe zależności oraz znane alerty,
  jeżeli dostępny jest lokalny audytor.
- Nie aktualizuj pakietów ani lockfile w trybie audytu.
- Nie pobieraj ani nie uruchamiaj niezaufanych skryptów instalacyjnych.

## Security audit

- Sprawdzaj auth, role, walidację, limity, logowanie sekretów, CORS, SSRF,
  injection, retencję i najmniejsze uprawnienia.
- Sekrety oznaczaj wyłącznie jako „skonfigurowane / puste / brak”, nigdy ich
  nie ujawniaj.
- Nie wykonuj exploitów, testów na zewnętrznych systemach ani zmian uprawnień.
- Wysokiego ryzyka naprawy przedstaw do zatwierdzenia przed wdrożeniem.

## Format wyniku

`OBSZAR`, `DOWÓD`, `STATUS`, `RYZYKO`, `PROPONOWANA NAPRAWA`, `WALIDACJA`,
`WYMAGANA ZGODA`.

---

# AUTOMATYCZNE AKCJE

System może:

- tworzyć alert
- wysłać email
- zapisać do MongoDB
- wyświetlić w Dashboardzie Henryka

---

# MONGODB

Kolekcja:

alert_memory

Przykładowy rekord:

Status

Severity

Module

Problem

Instruction

CreatedAt

ResolvedAt

---

# HENRYK COMMAND CENTER

Wszystkie problemy trafiają do:

henryk.qualitet-market.com

Zakładka:

AUTO UZUPEŁNIJ

Widoczne:

- nowe problemy
- problemy otwarte
- problemy rozwiązane

---

# CEL KOŃCOWY

Henryk nie szuka problemów.

System sam:

- wykrywa
- analizuje
- raportuje
- tworzy instrukcję
- przygotowuje rozwiązanie

a właściciel otrzymuje gotowy przycisk:

UZUPEŁNIJ