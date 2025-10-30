# Chrome Built-in AI Early Preview Setup

The medinote AI pipeline runs entirely on-device using Chrome's Prompt, Proofreader, and Rewriter tokens. Follow the steps below to enable the Early Preview in a local test environment. Names of flags and tokens may change between Chrome builds—double-check release notes if anything looks different.

## 1. Install an Early Preview build

Use the latest Chrome Canary (macOS/Windows) or Chromium build (Linux) that advertises "Chrome Built-in AI" support. Stable releases typically do **not** ship the Prompt API yet.

## 2. Enable required feature flags

Navigate to `chrome://flags` and enable the following entries:

| Flag | Suggested value |
| --- | --- |
| `Prompt API for Gemini Nano` | **Enabled** |
| `Enable on-device Genie model downloads` | **Enabled** |
| `Optimization guide on-device model execution` | **Enabled** |
| `Enforce device only AI inference` | **Enabled** |

After toggling the flags, relaunch Chrome when prompted. Flag names may shift between milestones—search for keywords like *Prompt API*, *on-device*, or *Gemini Nano* if you do not see the exact entries above.

## 3. Trigger model download (first run only)

Open `chrome://components`, find **Optimization Guide On Device Model**, and click **Check for update**. Keep Chrome open while the device model downloads. Model size is roughly 1–2 GB.

## 4. Verify availability inside medinote

Launch medinote in the same browser window and open DevTools ➝ Console. Run the checks below:

```js
await window.ai?.canCreate?.({ model: 'gemini-nano', device: 'device' });
// → { available: 'yes' } means the Prompt API is ready.

typeof window.ai?.proofreader?.local === 'function';
// → true confirms the Proofreader token.
```

If any call returns `undefined` or `{ available: 'no' }`, reload the page after the model finishes downloading or double-check the flags.

## 5. Troubleshooting

- **Prompt API blocked** – Ensure you are using a profile with the same flags. Flags are profile-specific.
- **Model pending download** – Watch the status column in `chrome://components`. Download resumes automatically after restarts.
- **Device-only inference required** – medinote disables cloud fallbacks by design. All AI buttons remain disabled until `supportsLocalAI()` passes.

## 6. Privacy reminder

When the banner shows *Local AI ready*, medinote keeps recordings, transcripts, and generated SOAP notes on your device. No network calls are made for transcription, proofread, or SOAP composition.
