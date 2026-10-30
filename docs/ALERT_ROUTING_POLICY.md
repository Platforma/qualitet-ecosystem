# ALERT ROUTING POLICY

## WERSJA

1.0

---

# CEL

Każdy alert systemowy musi mieć:

- właściciela
- priorytet
- miejsce wyświetlenia
- skrzynkę docelową
- instrukcję rozwiązania

---

# ROUTING

## HENRYK

Adres:

henryk@qualitet-market.com

Otrzymuje:

CRITICAL

Typy:

- bezpieczeństwo
- utrata danych
- awaria MongoDB
- awaria AI
- awaria płatności
- alarm biznesowy

---

## OWNER

Adres:

owner@qualitet-market.com

Otrzymuje:

HIGH
CRITICAL

Typy:

- deploy
- konfiguracja
- integracje
- problemy systemowe

---

## ALERT CENTER

Adres:

alerts@qualitet-market.com

Otrzymuje:

INFO
WARNING
HIGH
CRITICAL

Typy:

- wszystkie alerty

---

## SECURITY

Adres:

security@qualitet-market.com

Otrzymuje:

HIGH
CRITICAL

Typy:

- logowania
- błędy uprawnień
- próby włamania
- zmiana sekretów

---

## AI CENTER

Adres:

ai@qualitet-market.com

Otrzymuje:

INFO
WARNING

Typy:

- raport AI
- analiza rynku
- analiza trendów
- ukończone zadania agentów

---

## FINANCE

Adres:

faktury@qualitet-market.com

Otrzymuje:

WARNING
HIGH

Typy:

- Stripe
- faktury
- subskrypcje
- płatności

---

# POZIOMY ALERTÓW

INFO

- raport
- analiza
- ukończone zadanie

WARNING

- brak konfiguracji
- brak danych
- wygasająca usługa

HIGH

- niedziałająca integracja
- błędny deploy
- problem produkcyjny

CRITICAL

- utrata danych
- zagrożenie bezpieczeństwa
- brak działania platformy

---

# SYSTEM UZUPEŁNIJ

Jeżeli alert oznaczony jest:

ACTION_REQUIRED

System automatycznie tworzy:

[UZUPEŁNIJ]

oraz:

- opis problemu
- instrukcję
- link
- formularz
- test poprawności

---

# HENRYK COMMAND CENTER

Adres:

henryk.qualitet-market.com

Widoki:

- Wszystkie Alerty
- Bezpieczeństwo
- Integracje
- AI
- Biznes
- Finanse
- Świat
- Trendy

---

# KOLEKCJA MONGODB

alert_memory

Pola:

id
type
severity
module
source
message
owner
status
createdAt
resolvedAt

---

# STATUSY

OPEN

IN_PROGRESS

ACTION_REQUIRED

RESOLVED

ARCHIVED

