# Vedic Pandit — वैदिक पंडित

A .NET 8 + Angular 19 website for **drik panchang**, **muhurat search**, **mantra uchcharan** (chant-along with
per-word highlighting in 9 scripts) and **PanditJi**, a Claude-powered guide to the Dharma Granths that answers
from a verse library with exact citations instead of inventing shlokas.

## What makes it accurate

Panchang is computed astronomically for any location, not copied from a printed table.

| Component | Method |
|---|---|
| Sun | Truncated VSOP87 (Meeus ch. 32), ~1″ |
| Moon | ELP-2000/82 main terms (Meeus ch. 47), ~10″ |
| Ayanamsa | Lahiri (Chitrapaksha), calibrated |
| Sunrise | Upper limb + refraction (−0.833°) |
| Time | ΔT applied (TT vs UT), IANA time zones |

Verified against Drik Panchang (New Delhi):

- **26 Oct 2026** — tithi, nakshatra, yoga and karana end times all within 1 minute.
- **All 12 sankrantis of 2026** — within ±1 minute.
- **Festivals** are fixed by the correct kaal rather than sunrise alone:
  - madhyahna: Ram Navami, Ganesh Chaturthi
  - aparahna: Dussehra
  - pradosh: Diwali, Dhanteras, Karwa Chauth, Holika Dahan
  - nishita: Janmashtami, Maha Shivaratri, including the case where Ashtami spans neither midnight
  - Result for 2026: Diwali on Nov 8, Janmashtami on Sep 4, Dussehra on Oct 20.
- **Adhik masa** detected (Adhik Jyeshtha 17 May – 15 Jun 2026).

These cases live in `tests/VedicPandit.Tests/PanchangAccuracyTests.cs`.

The engine exists twice with identical math:

- **C#** — `src/VedicPandit.Infrastructure/Astronomy` and `Panchang` (authoritative, used by the API and PanditJi).
- **TypeScript** — `vedic-pandit-client/src/app/core/astro`. It powers the live sky dial and lets the site run fully in the browser when the API is not reachable (demo mode).

> **Note:** keep the two in sync when changing rules.

## Features

- **Panchang**:
  - The five limbs with end times; kshaya tithis listed when two fall in one day.
  - Rahu Kaal, Yamaganda, Gulika, Abhijit and Brahma muhurat.
  - Day and night choghadiya, with the current slot highlighted.
  - Masa (Purnimanta or Amanta), Vikram and Shaka samvat, ritu, ayana, sun and moon rashi.
  - Sankranti moments, festivals and vrats.
- **Muhurat finder**:
  - 9 occasions: vivah, griha pravesh, vehicle, property, namakaran, mundan, annaprashan, vidyarambh, business.
  - Skips Kharmas, Chaturmas and Adhik masa where tradition requires.
  - Excludes Rahu, Yamaganda, Gulika and Bhadra.
  - Every window comes with its reasons. Rules are data in `MuhuratRules.cs` so a pandit can edit them.
- **Mantra uchcharan**:
  - 10 mantras with sources (Rigveda 3.62.10, 7.59.12…).
  - Karaoke highlighting timed by syllable count, speed control and a japa counter (mala ring).
  - Optional voice guide.
  - Text in Devanagari, IAST, simple Roman, Kannada, Telugu, Tamil, Bengali, Gujarati or Malayalam.
  - Add `audioUrl` + forced-alignment timings for recorded chants.
- **Granth**:
  - The complete Bhagavad Gita (all 701 verses, read chapter by chapter) and key Upanishad verses.
  - English translation of the Gita by Swami Sivananda; Hindi for selected verses.
  - BM25 search plus direct references ("Gita 2.47").
  - More texts can be added as JSON (see *Growing the knowledge base*).
- **PanditJi**:
  - Claude with tool use: `get_panchang`, `find_muhurat`, `get_mantra`, `search_scriptures`.
  - Answers stream over SignalR; panchang, muhurat, mantra and verse cards render alongside the text.
  - Voice input and read-aloud via the browser Web Speech API in 8 Indian languages.
  - The system prompt forbids inventing shlokas and requires citations from tool results.
- **UI**:
  - 8 languages: हिन्दी, English, ಕನ್ನಡ, தமிழ், తెలుగు, मराठी, বাংলা, ગુજરાતી.
  - Sanskrit names shown in the reader's own script.
  - Self-hosted fonts, keyboard accessible, responsive to 360 px.

## Dakshina and the Android app

- **Dakshina** (`/dakshina`, gold button beside the language and city pickers):
  - Shagun amounts (₹11 to ₹1,100) or any amount you type.
  - A UPI QR code for that amount, the UPI ID `shuklaekant@okhdfcbank` with a Copy button, and, on phones, **Pay with UPI app**, which opens GPay, PhonePe, Paytm or BHIM with the details filled in.
  - The UPI ID and payee name are set in `vedic-pandit-client/src/app/core/app-info.ts`.
- **Android app:** the same Angular code wrapped with Capacitor, the same setup as Cassette.fm.
  - GitHub Actions builds the APK and publishes it as a Release.
  - The website's **Get App** button downloads the newest APK on Android, shows Add to Home Screen steps on iPhone, and shows a QR code to scan on a computer.
  - Setup is in **[ANDROID.md](ANDROID.md)**.

## Put it online (so PanditJi answers everything)

See **[DEPLOY.md](DEPLOY.md)**: get a Claude API key, deploy to Render with one click, then set the `API_URL`
repository variable so the GitHub Pages site and the Android app use it.

## Run it

**Prerequisites:** .NET 8 SDK and Node 20+. The backend uses **no NuGet packages**, only what ships with the SDK.

### 1. API

```bash
cd src/VedicPandit.WebAPI
dotnet user-secrets set "Claude:ApiKey" "sk-ant-..."      # optional; without it PanditJi uses built-in answers
dotnet run                                                # http://localhost:5000  (try /api/health)
```

Content (mantras, verses) is loaded from the JSON files in `SeedData/` at startup and held in memory; there is no
database to set up. Imported texts and the chat log are written to the `data/` folder (`Content:DataFolder`).
`VedicPandit.http` has ready-made requests for every endpoint.

### 2. Web app

```bash
cd vedic-pandit-client
npm install
npm start                                                 # http://localhost:4200 → talks to :5000
```

### 3. Tests

```bash
dotnet run --project tests/VedicPandit.Tests
```

29 tests: panchang accuracy against Drik Panchang (sunrise, tithi, nakshatra, yoga, karana, sankrantis, new moons,
festivals, Adhik masa), muhurat rules, the content store and verse search, and PanditJi's tool loop with a scripted
Claude (scripture, panchang, muhurat and mantra tools, API failure, no-key mode). The GitHub workflow `ci.yml` runs them on every push.

### Single deployable

```bash
cd vedic-pandit-client && npm run build:api               # builds Angular into WebAPI/wwwroot
cd ../src/VedicPandit.WebAPI && dotnet publish -c Release
```

Or use Docker: `docker build -t vedic-pandit . && docker run -p 8080:8080 -e Claude__ApiKey=sk-ant-... vedic-pandit`.

## API

| Endpoint | Purpose |
|---|---|
| `GET /api/panchang?date=2026-10-26&lat=25.3176&lng=82.9739&tz=Asia/Kolkata&system=Purnimanta` | Daily panchang |
| `GET /api/panchang/month?year=2026&month=11&...` | Month calendar |
| `GET /api/muhurat/events` | Supported occasions |
| `GET /api/muhurat?event=Vivah&from=2026-11-01&to=2027-01-31&...` | Muhurat windows |
| `GET /api/mantras`, `GET /api/mantras/{slug}` | Mantra library |
| `GET /api/scriptures`, `/api/scriptures/{code}/verses`, `/api/scriptures/search?q=` | Verse library |
| `POST /api/scriptures/import` (header `X-Admin-Key`) | Add verses (JSON like `SeedData/scriptures/*.json`) |
| `GET /api/health` | `{status, ai}`; `ai` is true when a Claude key is set |
| `POST /api/chat` | Non-streaming bot (mobile / WhatsApp integrations) |
| `WS /hubs/panditji` → `Ask({text, language, latitude, longitude, timeZone, sessionId})` | Streaming bot; server pushes `botEvent` |

## Growing the knowledge base

PanditJi only cites what is in the verse library, so answer quality grows with the corpus.

1. Add public-domain texts (Valmiki Ramayana, the principal Upanishads, Yoga Sutras…) either as a file in
   `SeedData/scriptures/` (then run `python3 tools/build_client_data.py` so the website and app get it too) or live through
   `/api/scriptures/import`. `tools/import_gita.py` shows how the Gita was converted from the bhagavadgita.io dataset.
2. Have every translation reviewed by a scholar before it goes live.
3. When the corpus passes a few thousand verses, swap `ScriptureRetriever` (BM25, in memory) for a vector store (pgvector / Azure AI Search) behind the same `IScriptureRetriever` interface.

## Changes from the original specification

| Spec | Here | Why |
|---|---|---|
| "Kashi Vishwanath Rishikul vs Shri Rishikesh" data | Computed drik panchang with a Purnimanta/Amanta switch | Those panchangs publish no API. North-Indian panchangs differ mainly in the month convention, which is exposed as an option. |
| Deepgram/Whisper STT | Browser Web Speech API | Free and instant in Chrome, Edge and Safari. Add a server STT for Firefox later (`AudioService` hook). |
| Single intent classifier, then fixed handlers | Claude tool use (multi-step) | A question can need a panchang and a muhurat and a verse; the model chooses and the tools stay deterministic. |
| Tailwind | Hand-written design tokens (`styles.css`) | Small CSS, no build plugin; the palette and type scale are in one place. |
| `localhost` hub URL hard-coded | `API_URL` setting, same-origin by default, `:5000` in dev | Deployable as-is. |
| SQL database | JSON files loaded into memory | The content is read-mostly; no database to host, and the backend builds without NuGet. |

## Known limits

- Muhurat does **not** check lagna shuddhi, Guru/Shukra asta or personal kundali. The UI and bot say so.
- Festival rules cover the major pan-Indian observances. Regional dates (e.g. Gujarati new year, Bengali Durga Puja calendar) need their own rules.
- Rule changes must be made in both C# and TS engines.
- PanditJi cites only verses in the library (the full Gita plus 7 Upanishad verses today). For other texts it answers
  from general knowledge and says so.
- Hindi translations exist only for 20 hand-picked Gita verses; other verses show English, and PanditJi answers in Hindi itself.
- Translations: Swami Sivananda (died 1963) is in the public domain in India; check the rules for other countries before
  publishing there. The Sanskrit text and dataset are public domain (Unlicense).

## Verified

- `dotnet build`: 0 warnings, 0 errors. 29/29 tests pass.
- The running API was tested over HTTP: every endpoint, input validation, admin-only import, CORS for the Pages site and the app.
- PanditJi was tested end to end against a mock of the Anthropic streaming API (exact event format, tool calls split
  across chunks): REST, SignalR streaming, scripture/panchang/muhurat/mantra tools, conversation memory, chat log.
- The website was tested in Chromium both ways it will run: served by the .NET app (Docker/Render) and on a separate
  address calling the API (GitHub Pages / Android app), including the chat and the full Gita.
- Not testable here: the real Claude API (needs your key) and the APK build (needs the Android SDK; GitHub builds it).
