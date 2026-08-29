# ArtisanAI — Run & Deploy

## Local
- Node.js 20+ and npm are recommended.
- Run `npm install` then `npm run install:all`.
- Copy `server/.env.example` to `server/.env`.
- Optionally set `GEMINI_API_KEY` for live Gemini AI. Without a key, supported AI features use local fallbacks.
- Run `npm run dev` and open `http://localhost:5173`.
- On Windows, double-click `start-windows.bat`.

## Production
Run `npm install`, `npm run install:all`, `npm run build`, then start with `NODE_ENV=production npm start`. Express serves the built React app from the same host.

## AI behavior
- Voice input/output uses browser Web Speech APIs where supported.
- Image enhancement runs locally on the Node server using Sharp.
- Descriptions, pricing, translation, marketing, tags, search intent, image understanding and chat use Gemini when configured.
- Local deterministic fallbacks keep supported functions usable without Gemini/network access.
- Current market data should be connected to a live provider for real-world price intelligence; the fallback does not invent live market data.

## Security
Keep `server/.env` private, never expose `GEMINI_API_KEY` in React, replace `JWT_SECRET` in production, and use HTTPS plus a production database/object storage for a real deployment.
