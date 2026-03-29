# ToneForge AI – Visual to Sound Engine

Cyber/neon web app for creators to generate vibe-based background tones, ambient layers, and short-form-ready visual projects.

## Stack
- React + Tailwind (frontend)
- Node.js + Express API (backend)
- Cloudinary upload integration

## Features
- Upload image/GIF/video (single or batch mode)
- Category + mood + duration controls
- Template mode (Dark Reel Pack, Kids Story Pack, Motivation Viral Pack)
- Auto vibe detection toggle
- Ambient layer/effect selection
- Processing state + preview player (9:16)
- Project list with status + download links
- Cloudinary optimized URL output (`q_auto,f_auto`)

## Run locally
```bash
npm install
cp .env.example .env
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:8787

## Deploy
- One-click style deploy: connect repo to Vercel/Render/Railway.
- Build command: `npm run build`
- Start command: `npm run start`

## Cloudinary
Set these env vars:
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

If Cloudinary isn't configured, app still works with local previews and in-memory projects.
