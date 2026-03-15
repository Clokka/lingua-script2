# Appoline MVP (No backend setup needed)

Appoline is a mobile-first language coach focused on social fluency with chat + voice practice.

## Easiest way to use it

1. Open `index.html` in your browser.
2. Click **API Keys**.
3. Paste your OpenAI key + ElevenLabs key.
4. Click **Save Keys**.
5. Start chatting.

That’s it — no Python server, no terminal required.

## What works

- Romantic / Humor / Charisma practice modes
- Streak, XP, confidence tracking
- Chat replies from OpenAI
- Voice playback from ElevenLabs
- Saved progress in your browser (`localStorage`)

## Security note

This no-backend mode stores and uses your keys in the browser for convenience.
For production/public use, move keys to a backend proxy server.
