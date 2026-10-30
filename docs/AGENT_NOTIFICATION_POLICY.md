# AGENT NOTIFICATION POLICY

## WERSJA

1.0

---

# CEL

System agentów AI musi automatycznie powiadamiać:

- Henryka
- Owner Studio
- Administratorów
- System alertów

o wszystkich ważnych zdarzeniach.

---

# CENTRUM POWIADOMIEŃ

Adresy:

henryk@qualitet-market.com

owner@qualitet-market.com

alerts@qualitet-market.com

security@qualitet-market.com

ai@qualitet-market.com

---

# POZIOMY ALERTÓW

## INFO

Informacyjne.

Przykłady:

- wygenerowano raport
- ukończono analizę
- zapisano pamięć

Powiadomienia:

- Dashboard
- Historia

---

## WARNING

Wymaga uwagi.

Przykłady:

- brak konfiguracji
- brak integracji
- niepełne dane

Powiadomienia:

- Dashboard
- Alert Center
- owner@

---

## HIGH

Wysoki priorytet.

Przykłady:

- nieudany deploy
- awaria integracji
- błąd MongoDB

Powiadomienia:

- owner@
- alerts@
- Dashboard

---

## CRITICAL

Krytyczne.

Przykłady:

- wyciek danych
- utrata połączenia
- awaria systemu
- problem bezpieczeństwa

Powiadomienia:

- henryk@
- owner@
- alerts@
- security@

---

# AGENT AI QUALITET

Powiadamia o:

- błędach agentów
- konfliktach danych
- brakach konfiguracji

---

# AI DEVELOPER

Powiadamia o:

- błędach kodu
- niezgodności architektury
- błędach wdrożenia

---

# AI GRAFIK SZEF

Powiadamia o:

- zakończeniu generacji
- błędach grafik
- brakujących zasobach

---

# AI SEO

Powiadamia o:

- spadkach SEO
- brakujących metadanych
- problemach indeksacji

---

# AI MARKETING

Powiadamia o:

- kończących się budżetach
- słabej skuteczności kampanii
- nowych możliwościach reklamowych

---

# AUTO COMPLETE

Jeżeli agent wykryje problem:

Status:

ACTION_REQUIRED

System tworzy:

[UZUPEŁNIJ]

oraz:

- opis problemu
- instrukcję
- link
- formularz
- test poprawności

---

# DASHBOARD HENRYKA

henryk.qualitet-market.com

Wyświetla:

- wszystkie alerty
- wszystkie błędy
- wszystkie zadania
- wszystkie integracje
- wszystkie powiadomienia AI

---

# DASHBOARD OWNER

owner.qualitet-market.com

Wyświetla:

- alerty systemowe
- alerty biznesowe
- alerty bezpieczeństwa

---

# PRZECHOWYWANIE

Kolekcja:

alert_memory

Pola:

id

source

agent

severity

message

status

createdAt

resolvedAt

---

# STATUSY

OPEN

IN_PROGRESS

COMPLETED

IGNORED

ARCHIVED

---

# ZASADA GŁÓWNA

Żaden ważny problem nie może pozostać bez powiadomienia.

Jeżeli system wykryje problem:

1. Utwórz alert.
2. Zapisz do MongoDB.
3. Wyświetl w Henryk Command Center.
4. Dodaj przycisk UZUPEŁNIJ.
5. Dodaj instrukcję rozwiązania.
