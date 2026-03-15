# Appoline MVP

Appoline is a mobile-first language coach prototype focused on **social fluency** (Romantic, Humor, Charisma) with gamified progression and an integrated chatbot + voice playback.

## Features in this MVP

- Mode-based missions: **Romantic / Humor / Charisma**
- Gamification loop: streak, XP, confidence score
- Integrated chat replies through `/api/chat`
- Integrated text-to-speech playback through `/api/tts`
- Instant feedback after each user turn
- Local persistence in `localStorage` (`appolineProgress`)

## Run locally

1. Export your keys as environment variables (do **not** hardcode keys into source files):

```bash
export OPENAI_API_KEY="your-openai-key"
export ELEVENLABS_API_KEY="your-elevenlabs-key"
# Optional overrides
export OPENAI_MODEL="gpt-4o-mini"
export ELEVENLABS_VOICE_ID="EXAVITQu4vr4xnSDxMaL"
```

2. Start the app server:

```bash
python3 server.py
```

3. Open:

- `http://localhost:4173`

## How to test buttons and chatbot

1. **Start 3-min practice**
   - Click it and confirm mission + starter assistant prompt appear.
2. **Send**
   - Type a message and click Send.
   - Expected: your message appears, then Appoline API reply appears.
3. **Test Chat API**
   - Click button.
   - Expected: status turns success and assistant test response appears.
4. **Speak last reply**
   - Click after at least one assistant response.
   - Expected: ElevenLabs audio plays.
5. **Daily Challenge**
   - Click button and confirm XP/Confidence increase + success status.
6. **Clear chat**
   - Click button and confirm chat pane clears and status updates.

## Project files

- `index.html` — UI structure and interactive controls
- `styles.css` — mobile-first styling and interaction states
- `app.js` — frontend app logic + API calls
- `server.py` — static file server + secure API proxy endpoints

## Security note

Keep API keys in environment variables only. Never commit them into frontend JavaScript or repository history.
