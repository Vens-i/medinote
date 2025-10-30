# medinote

medinote is a Vite + React + TypeScript application that converts a clinician’s voice note into a cleaned transcript and a SOAP summary while keeping protected health information local to the device.

## Getting started

1. Install dependencies with `npm install`.
2. Launch the dev server via `npm run dev`.
3. Open the printed URL in Chrome (Early Preview build recommended).

## Current capabilities

- Record a single 60-second clip using the MediaRecorder API, with live level metering and cancel controls.
- Transcribe, proofread, and compose SOAP notes locally via Chrome Built-in AI when available.
- Fall back to manual mode that works entirely offline—type or paste a transcript, generate a templated SOAP outline, and export results.
- Save notes to IndexedDB, including audio blobs, transcripts, cleaned drafts, and SOAP objects. Notes can be reloaded, deleted individually, or wiped in bulk.
- Export SOAP output as JSON or printable text and copy individual sections to the clipboard.

## Local AI setup

On-device inference requires Chrome Built-in AI Early Preview. Follow the steps in [`docs/ondevice-ai.md`](docs/ondevice-ai.md) to enable the Prompt, Proofreader, and Rewriter tokens. When the banner in medinote shows **Local AI ready**, all inference happens locally and no network calls are made.

## Testing checklist

- Record a short clip (10–20 seconds), transcribe it, run the proofreader, and generate a SOAP note.
- Disable the Chrome AI flags to confirm manual mode still allows typed transcripts, template SOAP generation, and exports.
- Simulate timeouts or failures (e.g., by toggling manual mode mid-run) and verify the UI shows a retry banner with dismiss options.
- Save a note, reload the page, and confirm the entry reappears in the sidebar with its transcript and SOAP content intact.
- Export SOAP to JSON and text, then reopen the files to ensure the data matches the preview.
