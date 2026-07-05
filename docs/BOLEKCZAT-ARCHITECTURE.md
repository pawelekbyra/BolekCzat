# BolekCzat — webowy interfejs Agenta Bolka

> **Status:** decyzja architektoniczna / plan integracji.  
> To repo jest forkiem LibreChat przygotowywanym jako docelowy web UI dla ekosystemu Agenta Bolka.
>
> `BolekCzat` nie jest mózgiem Bolka. Mózgiem pozostaje `pawelekbyra/BolekAI` / `kulfon`.

---

## 1. Cel repo

`BolekCzat` ma być produkcyjnym interfejsem webowym do rozmowy z Bolkiem.

Docelowo obsługuje:

- webowy chat podobny do ChatGPT,
- historię rozmów,
- sidebar i organizację konwersacji,
- auth i sesje użytkownika,
- UX rozmowy z agentem,
- streaming odpowiedzi,
- upload plików, jeśli będzie potrzebny,
- konfigurację Bolka jako custom OpenAI-compatible endpoint.

Bazą technologiczną jest LibreChat, bo rozwiązuje trudne elementy UI, auth, historii rozmów i obsługi wielu providerów LLM bez pisania wszystkiego od zera.

---

## 2. Czym BolekCzat NIE jest

`BolekCzat` nie jest:

- mózgiem Bolka,
- źródłem prawdy o pamięci Bolka,
- miejscem na sekrety operacyjne,
- systemem wykonującym refundy, deploye, maile albo akcje finansowe,
- approval gate,
- bazą wiedzy/RAG,
- systemem workflow,
- executor kodowania.

`BolekCzat` jest twarzą Bolka, nie zamiennikiem Bolka.

---

## 3. Miejsce w sieci repozytoriów

```txt
pawelekbyra/BolekAI
= mózg Bolka
= Cloudflare Worker `kulfon`
= Telegram bot
= D1 memory
= narzędzia
= Polutek ops
= approval gate
= OpenAI-compatible adapter `/v1/chat/completions`

pawelekbyra/BolekCzat
= web UI Bolka
= fork LibreChat
= rozmowy, historia, auth, UX

pawelekbyra/BolekFlow
= workflow automation
= fork n8n
= automatyzacje, webhooki, integracje, human-in-the-loop

pawelekbyra/BolekKB
= knowledge base / RAG
= fork AnythingLLM
= dokumenty, notatki, wiedza, źródła

pawelekbyra/BolekDev
= coding executor
= branche, testy, commity, PR-y
```

Zasada:

```txt
BolekAI myśli i decyduje.
BolekCzat pokazuje rozmowę.
BolekFlow automatyzuje procesy.
BolekKB przechowuje wiedzę.
BolekDev koduje.
```

---

## 4. Docelowy przepływ rozmowy

```txt
Użytkownik
  ↓
BolekCzat / LibreChat UI
  ↓ OpenAI-compatible request
kulfon / BolekAI `/v1/chat/completions`
  ↓
Orchestrator Bolka
  ↓             ↓             ↓
BolekKB         BolekFlow      BolekDev / narzędzia
wiedza          workflow       kod / GitHub / Vercel
  ↓             ↓             ↓
BolekAI składa odpowiedź
  ↓
BolekCzat pokazuje odpowiedź użytkownikowi
```

`BolekCzat` wysyła wiadomości do Bolka przez adapter kompatybilny z OpenAI Chat Completions API.

Planowany endpoint produkcyjny:

```txt
Base URL: https://kulfon.pawel-perfect.workers.dev/v1
Chat endpoint: /chat/completions
Model: bolek
Authorization: Bearer <BOLEK_OPENAI_ADAPTER_KEY>
```

---

## 5. Konfiguracja LibreChat jako klienta Bolka

Docelowa konfiguracja custom endpointu:

```txt
Name: Agent Bolek
Type: OpenAI-compatible custom endpoint
Base URL: https://kulfon.pawel-perfect.workers.dev/v1
Endpoint: /chat/completions
Model: bolek
API key: BOLEK_OPENAI_ADAPTER_KEY
```

Ważne:

- klucz adaptera nie jest tym samym co sekrety Stripe, Clerk, Vercel, Resend, home.pl ani Polutka,
- LibreChat/BolekCzat zna tylko klucz do rozmowy z Bolkiem,
- wszystkie akcje operacyjne idą przez BolekAI,
- klient web nie może omijać approval gate.

---

## 6. Kontrakt między BolekCzat a BolekAI

Minimalny kontrakt opiera się na OpenAI-compatible Chat Completions:

```http
POST /v1/chat/completions
Authorization: Bearer <BOLEK_OPENAI_ADAPTER_KEY>
Content-Type: application/json
```

Przykład requestu:

```json
{
  "model": "bolek",
  "stream": true,
  "messages": [
    { "role": "user", "content": "Cześć Bolek, co dziś powinienem zrobić?" }
  ]
}
```

Odpowiedzialność `BolekCzat`:

- wysłać wiadomości użytkownika,
- obsłużyć streaming,
- zapisać historię UI po swojej stronie,
- zapewnić wygodne UX,
- nie interpretować samodzielnie ryzyka narzędzi.

Odpowiedzialność `BolekAI`:

- zmapować wiadomości na format wewnętrzny,
- rozpoznać intencję,
- dobrać narzędzia,
- sprawdzić politykę i approval gate,
- wykonać dozwolone akcje,
- zwrócić odpowiedź.

---

## 7. Pamięć i historia rozmów

Są dwa różne poziomy pamięci:

```txt
BolekCzat
= historia konwersacji w UI
= wątki, sidebar, komfort użytkownika

BolekAI / D1
= operacyjna pamięć Bolka
= fakty o użytkowniku
= zadania, notatki, przypomnienia, pending actions
```

Nie wolno zakładać, że historia w LibreChat jest automatycznie źródłem prawdy dla pamięci Bolka.

Jeżeli jakaś informacja ma zostać trwałą pamięcią Bolka, musi przejść przez narzędzia/pamięć `BolekAI`, nie tylko przez zapis rozmowy w UI.

---

## 8. Bezpieczeństwo

Zasady:

- `BolekCzat` nie dostaje sekretów produkcyjnych narzędzi.
- `BolekCzat` nie wykonuje bezpośrednio akcji finansowych, deployów, maili ani mutacji danych.
- Mutujące akcje zawsze przechodzą przez BolekAI i jego approval gate.
- Wiadomości `system`, `tool` i nietypowe role z klienta web są traktowane przez BolekAI jako niezaufany kontekst.
- Użytkownik w czacie nie może wymusić pominięcia zasad bezpieczeństwa przez prompt injection.
- CORS dla adaptera powinien być zawężony do dokładnego originu deploymentu BolekCzat.
- Klucz `BOLEK_OPENAI_ADAPTER_KEY` jest odwoływalny i nie daje dostępu do innych systemów.

---

## 9. Czego nie vendorować do BolekAI

Nie przenosimy LibreChat do `BolekAI`.

Powody:

- LibreChat jest dużą aplikacją produktową,
- ma własny backend, frontend, konfigurację i deployment,
- łatwiej aktualizować go jako osobny fork,
- awaria UI nie powinna rozwalać mózgu Bolka,
- BolekAI ma pozostać lekkim orchestratoriem.

`BolekAI` wystawia adapter. `BolekCzat` konsumuje adapter.

---

## 10. Kolejność prac

```txt
1. Zachować fork LibreChat i nie mieszać go z BolekAI.
2. Dodać jasną dokumentację roli BolekCzat.
3. Skonfigurować custom OpenAI-compatible endpoint do kulfonu.
4. Ustawić BOLEK_OPENAI_ADAPTER_KEY po stronie kulfonu.
5. Ustawić dokładny BOLEK_CORS_ORIGIN dla deploymentu BolekCzat.
6. Uruchomić lokalny test rozmowy przez /v1/chat/completions.
7. Uruchomić deployment preview BolekCzat.
8. Dopiero potem brandować UI, auth i onboarding.
9. Na końcu dopracować historię rozmów, role użytkowników i produkcyjne UX.
```

---

## 11. Definition of Done dla integracji

Integracja `BolekCzat` z `BolekAI` jest gotowa, gdy:

- użytkownik może zalogować się do BolekCzat,
- BolekCzat ma skonfigurowany endpoint `Agent Bolek`,
- wiadomości idą do `kulfon /v1/chat/completions`,
- streaming działa stabilnie,
- błędny token daje 401,
- brak konfiguracji daje czytelny błąd,
- BolekAI nadal wymaga zgody dla ryzykownych akcji,
- klient web nie ma dostępu do sekretów narzędziowych,
- podstawowe rozmowy działają tak samo jak przez Telegram,
- README lub onboarding jasno mówi, że BolekCzat jest interfejsem, a nie mózgiem.

---

## 12. Zasada nadrzędna

```txt
BolekCzat ma być najlepszym oknem rozmowy z Bolkiem.
Nie ma przejmować decyzji, sekretów ani operacji.
Cała inteligencja operacyjna zostaje w BolekAI.
```