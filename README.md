# Holographic MIDI Visualizer

A desktop-browser visualizer that plays local MP3, WAV, or OGG audio against a matching MID/MIDI score. The audio clock drives a deterministic four-act Three.js performance, and the same stage can be captured as WebM or optionally transcoded to MP4.

The score is an expressive visualization, not publication-grade music engraving. The V1 target is current desktop Chrome and Microsoft Edge; mobile optimization is intentionally out of scope.

## Prerequisites

- Node.js 20 or newer and npm 10 or newer.
- A current desktop Chrome or Microsoft Edge installation with WebGL 2, Web Audio, `canvas.captureStream`, and WebM/Opus `MediaRecorder` support.
- About 35 MB of additional memory/network transfer when optional MP4 conversion first loads the FFmpeg core and WASM bundle.

## Install and run locally

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. To exercise the production bundle instead:

```powershell
npm run build
npm run preview
```

The built-in **Project Signal Etude** pair is available from **Load built-in demo** and is useful for a first run.

## Use your own audio and MIDI

1. Choose an MP3, WAV, or OGG music file.
2. Choose its matching `.mid` or `.midi` score.
3. Start playback, pause, or seek with the bottom timeline. A seek rebuilds the animation from absolute logical time rather than replaying missed frames.
4. Adjust calibration if the score and audio do not begin together.

The app does not transcribe audio. For the best match, obtain a legitimately licensed MIDI made for the same recording/arrangement, or create one in a DAW by setting the recording's tempo map, entering/importing the notes, aligning the first intended downbeat, and exporting a Standard MIDI File. A MIDI for a different performance may have the right notes but still drift.

### Calibration workflow

Start with offset `0` and speed `1`:

- If the visuals begin before the audio event, increase **Calibration offset**. If they begin late, decrease it. The visual clock is `(audio time - offset) × speed`.
- Compare a second landmark near the end. If the start matches but the end does not, adjust **Visual speed multiplier** in small steps. This changes MIDI/animation timing only; the audio remains at normal speed.
- Recheck the beginning and end after each speed change, then fine-tune offset again.

A single offset and speed cannot continuously align a live performance whose tempo drifts relative to the MIDI. That requires a tempo map or dynamic time warping, neither of which is in V1.

## Export

- **WebM** is the primary path. Chrome/Edge capture the 30 FPS stage and Web Audio in real time using VP9/VP8 plus Opus where supported.
- **MP4** is optional. Choosing it first records WebM, then lazily loads FFmpeg/WASM and transcodes in the browser. FFmpeg is not downloaded or evaluated during initial preview or WebM-only export.
- Both `1280 × 720` and `1920 × 1080` are supported. Export is real time, so keep the tab visible and avoid other GPU-heavy work until the download action appears.
- If MP4 conversion fails, the captured WebM remains available. Cancellation restores the previous preview time and unlocks the controls.

### Exact manual MP4 procedure

1. Run `npm run build` and `npm run preview`, then open the printed URL in the browser being accepted.
2. Load the built-in demo and confirm play, pause, and timeline seek.
3. Select **1280 × 720**, choose **MP4 (lazy FFmpeg conversion)**, and select **Start export**.
4. Wait through both **Capture phase** and **MP4 transcode phase**. Download the MP4, confirm it is non-empty, and play it in a local player with both video and audio.
5. Repeat with **1920 × 1080**. Confirm that controls are enabled again after each run.
6. Repeat in the other supported browser. Record its exact version and any deviation; do not report this checklist as passed without a human completing it.

## Tests

```powershell
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run e2e
```

`npm run e2e` builds the production app and runs the stable built-in-demo and 720p WebM flows in Playwright-managed Chromium. Per-act screenshots, traces, video, downloads, and performance JSON are generated under ignored `test-results/`/`playwright-report/` directories and are not committed.

Additional acceptance commands:

```powershell
npm run e2e:chrome       # stable flows in installed Google Chrome
npm run e2e:edge         # stable flows in installed Microsoft Edge
npm run e2e:performance  # hardware-dependent 1920×1080 viewport budget probe
npm run e2e:manual       # headed, long-running Chrome + Edge acceptance automation
```

The `@manual` flow exercises local-file intake, play/pause/seek, four acts, 1080p WebM, and 720p MP4; the stable flow already covers 720p WebM. It is excluded from the stable CI command because FFmpeg/WASM and real-time encoders are hardware-sensitive. A headed automated run is evidence distinct from the human MP4 procedure above.

## Performance budget and reference result

The `@performance` probe warms the built production app, seeks the built-in demo to the perform act, samples browser animation frames for three seconds in a 1920×1080 viewport, reads Three.js renderer counters, performs five boot→perform seek cycles, samples peak JS heap when Chrome exposes it, and verifies that no FFmpeg/worker script was initially requested.

Reference desktop recorded on 2026-08-13:

- Windows 11 10.0.26200, AMD Ryzen 7 5800H (8 cores/16 threads), 31.9 GiB RAM, NVIDIA GeForce RTX 3060 Laptop GPU (driver 31.0.15.4630).
- Google Chrome 151.0.7922.108, automated headless run through Playwright 1.62.1, production build, 1920×1080 browser viewport, High preview quality.
- Average: **164.82 FPS** after a 2-second warm-up; **24 draw calls**, **8 geometries**, **18 textures**, **13,779,367-byte peak JS heap**.
- Five repeated seek cycles stayed at **8 geometries / 18 textures** with no monotonic growth.
- Initial entry chunk: **1,225.77 kB minified / 345.13 kB gzip**. The initial network loaded only the hashed application entry; FFmpeg worker/core/WASM assets were emitted as separate lazy assets, including a **32,232.42 kB** WASM file, and were not requested by preview.

This is automated reference-machine evidence, not a guarantee for every computer. The enforced budgets are at least 50 FPS, at most 120 draw calls during `perform`, no monotonic geometry/texture growth, and no initial FFmpeg request. Re-run the probe on the release hardware when graphics drivers or rendering dependencies change.

## Browser acceptance status

Automated evidence and human acceptance are tracked separately:

- Playwright-managed Chromium 151.0.7922.34: built-in demo, play/pause, four absolute-time seeks, per-act screenshots, 720p WebM MIME/size/download, preview restoration, and local-origin-only network audit pass.
- Installed Chrome 151.0.7922.108: the same stable two-test production suite passed automatically.
- Installed Edge 151.0.4129.78: the stable suite passed automatically; separate tagged runs also passed local OGG/MIDI intake with all four acts and a non-empty 1080p WebM with preview restoration.
- Edge MP4 automation was stopped after more than 100 seconds without a terminal result. It is **not** recorded as passed and remains on the exact human checklist above.
- Human validation of downloaded 720p/1080p files and MP4 playback remains a release checklist item unless a named tester records completion; automation is not represented as a manual pass.

## Privacy

Selected audio and MIDI are read into browser memory and represented with local object URLs. Preview, seeking, WebM capture, and optional MP4 transcode happen in the browser. The application has no backend, account system, analytics, upload endpoint, or cloud storage. The built-in demo and lazy FFmpeg assets are fetched only from the same app origin. `npm install` may contact the npm registry for developer dependencies, but running the app does not send user media anywhere.

## Known limitations

- A live or rubato performance that drifts against a fixed MIDI cannot be corrected throughout by one offset/speed pair.
- MIDI drives an expressive 3D score; notation is not publication-grade.
- Export is real time and depends on browser codec, WebGL, GPU, memory, and tab-throttling behavior.
- MP4 adds a large lazy WASM runtime and may fail on memory-constrained machines; WebM remains the supported fallback.
- No mobile performance target, audio transcription, accounts, uploads, cloud storage, or free-form keyframe editor is included.

Committed media provenance and licenses are listed in [`docs/assets.md`](docs/assets.md).
