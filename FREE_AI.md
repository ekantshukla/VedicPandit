# Free AI for PanditJi: Google Gemini (no server, no card)

PanditJi answers **any** question with Google Gemini's free API. The website and the Android app call Gemini
directly, and Gemini uses the app's own tools for panchang, muhurat, rashifal, mantras and Gita verses, so dates
and shlokas still come from calculation and the library.

After every answer PanditJi suggests the **three questions you are most likely to ask next**; tap one to ask it.

Without a key, PanditJi gives his built-in answers (panchang, muhurat, rashifal, mantras, Gita search), still with
suggested next questions.

## Setup (about 5 minutes)

1. **Get a free Gemini key** at **https://aistudio.google.com/apikey**: sign in with your Google account and
   click **Create API key**. Copy it (it starts with `AIza`). No credit card is needed.
2. In your GitHub repo: **Settings → Secrets and variables → Actions → Secrets → New repository secret**.
   - Name: `FREE_AI_KEY`
   - Value: the key from step 1
3. **Actions → Deploy website to GitHub Pages → Run workflow**, then **Actions → Build Android app → Run workflow**.
4. Open the website and tap PanditJi. Under his name it now says **Online · answers any question** (green dot).
   Install the new APK from the release for the app.

## Try it on one device first (no rebuild)

Open the website on a computer, press F12 → Console, and run:

```js
localStorage.setItem('vp.aiKey', 'AIza_your_key_here'); location.reload();
```

Only that browser uses the key. `localStorage.removeItem('vp.aiKey')` undoes it.

## Which Gemini model

The default is `gemini-3.1-flash-lite`: fast, on the free tier, and with the most free questions per day.
To use another model, add a repository **variable** (Settings → Secrets and variables → Actions → Variables)
named `AI_MODEL`, for example `gemini-3-flash-preview` or `gemini-flash-latest` (smarter, fewer free questions per day).
Your free limits are shown at https://aistudio.google.com/rate-limit. Model names change over time; if PanditJi
stops answering, check the model list in AI Studio and update `AI_MODEL`.

## Other free providers

Any OpenAI-compatible API with tool calling works. Set the variables `AI_BASE_URL` and `AI_MODEL` and put that
provider's key in `FREE_AI_KEY`:

| Provider | Key from | `AI_BASE_URL` | `AI_MODEL` (example) |
|---|---|---|---|
| Google Gemini (default) | aistudio.google.com/apikey | `https://generativelanguage.googleapis.com/v1beta/openai` | `gemini-3.1-flash-lite` |
| Groq | console.groq.com | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile` |
| OpenRouter | openrouter.ai → Keys | `https://openrouter.ai/api/v1` | any model whose id ends in `:free` |

## Good to know

- **Free limits.** Free keys allow a limited number of questions per minute and per day. When the limit is reached,
  PanditJi gives a built-in answer and says the AI is busy; it works again after the limit resets (midnight Pacific time for Gemini).
- **The key is inside the app.** Anyone who digs into the website code can copy it. A free key has no billing,
  so the worst case is that someone uses up your daily limit; then make a new key and update the secret.
  To keep the key private, run the .NET server instead (below): the key then stays on the server.
- **Server option.** On Render (see DEPLOY.md), set `FreeAI__ApiKey` (and optionally `FreeAI__BaseUrl`,
  `FreeAI__Model`) instead of `Claude__ApiKey`. Set the `API_URL` repository variable to the server's address.
  If both the server and `FREE_AI_KEY` are set, the app uses the server whenever it is awake.
