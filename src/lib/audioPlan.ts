// Planning constants for the upcoming MediaRecorder integration.
// These numbers give engineers and designers a shared contract.

export const AUDIO_MIME_TYPE = 'audio/webm;codecs=opus'
export const MAX_RECORDING_SECONDS = 60
export const TARGET_CLIP_SIZE_BYTES = 1_000_000 // Aim for <= 1 MB per clip
export const MAX_CLIPS_PER_NOTE = 1

/**
 *  Recording roadmap
 *  -----------------
 *  1. Detect `MediaRecorder` support and fall back gracefully if missing.
 *  2. Request microphone access through `navigator.mediaDevices.getUserMedia`.
 *  3. Start a single `MediaRecorder` instance per note and stream into memory.
 *  4. Enforce the 60 second cap with a timer that stops and finalizes the blob.
 *  5. Export the blob as WebM Opus and make sure it stays under 1 MB.
 *  6. Attach the blob to the active note for upload or local persistence later.
 *
 *  None of this runs yet. The UI calls into these constants to stay aligned.
 */
