# ArtisanAI — AI-First Artisan Commerce Platform

A runnable full-stack prototype for the SIH concept **AI-Driven Market Linkage and Smart Cataloging Mobile Application for Marginalized Artisans**.

## AI features enabled

- 🔎 **AI Search Assistant** — natural-language search with budget/category/occasion intent extraction.
- 🎙️ **Voice AI** — browser speech recognition for hands-free search and seller navigation, plus browser text-to-speech replies when supported.
- 📷 **AI Product Vision** — analyzes an uploaded artisan product image and can auto-fill product name, category, material, description, tags and keywords when Gemini Vision is configured.
- ✨ **Image Enhancement Studio** — quality enhancement, lighting adjustment, auto-crop and clean marketplace background canvas using Sharp.
- ✍️ **AI Product Description** — generates listing copy, care instructions and SEO text.
- 💰 **AI Fair Pricing** — estimates a fair price using material cost, labor hours and demand.
- 📣 **AI Marketing** — WhatsApp copy, Instagram caption and short video script.
- 🏷️ **AI Tags** — generates searchable craft tags.
- 🌐 **AI Translation** — Tamil, Hindi, Kannada, Telugu, Malayalam, Marathi, Bengali and English.
- 📊 **AI Business Insight** — seller-focused catalog and pricing suggestions.
- 💬 **AI Chat Assistant** — general marketplace and seller guidance.
- 🔄 **Online + offline fallback** — if Gemini is not configured or the Gemini request fails, deterministic local rules keep the core AI workflows usable instead of returning a blank feature.

## Architecture

```text
React/Vite frontend
       │
       ├── Voice AI (browser SpeechRecognition + SpeechSynthesis)
       │
       └── /api → Node/Express backend
                    │
                    ├── Gemini/Gemini Vision (optional online AI)
                    ├── Local fallback logic (works without Gemini)
                    └── Sharp image processing
```

**Important:** a hosted website still needs a network connection to reach the hosted backend/API. The offline fallback means the backend can still execute many AI-style functions without a Gemini key or Gemini connectivity. Fully offline hosted-device AI would require packaging a local ML model into the device/server.

## Requirements

- Node.js 20+
- npm 10+

## Run locally

```bash
npm install
npm run install:all
npm run dev
```

Frontend: `http://localhost:5173`
Backend: `http://localhost:4000`

### Gemini setup (optional)

Copy `server/.env.example` to `server/.env` and add a server-side Gemini key:

```env
GEMINI_API_KEY=your_key_here
```

Never put the Gemini key in React/Vite client code and never commit a real `.env` file.

## Demo accounts

- Artisan: `artisan@demo.com` / `Artisan@123`
- Customer: `customer@demo.com` / `Customer@123`
- Admin: `admin@demo.com` / `Admin@123`

## AI status

Open `/api/ai/status` on the backend to see whether the server is using Gemini or the local fallback.

## Production checklist

- Move JSON storage to PostgreSQL/MySQL.
- Use object storage for product images.
- Add real payment gateway and webhook verification.
- Add OTP/email verification.
- Add Redis-backed rate limiting/session revocation.
- Add malware/content scanning for uploads.
- Use HTTPS and secure production secrets.
- For true background removal and higher-quality image restoration, plug a dedicated image segmentation/enhancement model into `server/src/index.js`.
