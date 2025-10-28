# medinote

Phase-1 scaffolding for the medinote web app. Built with Vite, React, TypeScript, and Tailwind CSS 4.1.

## Getting started

1. Install dependencies with `npm install`.
2. Run the development server using `npm run dev`.
3. Visit the printed local URL to explore the UI scaffolding.

## What is included

- Voice recorder, transcript editor, AI toolbar, SOAP preview, and sample loaders rendered with disabled controls.
- Tailwind-only styling via `@import "tailwindcss";` and React 19 function components.
- Public fixtures under `public/fixtures` to support future mock data loading.

## Next steps

- Connect real MediaRecorder and speech-to-text flows.
- Wire AI-driven helpers for SOAP generation and proofreading.
- Decide on persistence for saved notes and sample playback.
