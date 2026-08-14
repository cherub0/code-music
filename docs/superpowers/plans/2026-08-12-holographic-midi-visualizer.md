# Holographic MIDI Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a desktop web app that loads local audio and MIDI, performs a four-act Three.js holographic code-to-score animation in sync with the music, and exports WebM or MP4.

**Architecture:** Keep file loading, MIDI normalization, transport timing, score layout, performance choreography, rendering, and export as isolated TypeScript modules. React owns controls and application state; Three.js owns only the stage; an absolute media-clock-derived `PerformanceFrame` makes preview seeking and deterministic export share the same render path.

**Tech Stack:** Vite, React, TypeScript, Three.js, `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing`, `@tonejs/midi`, Zustand, GSAP, Vitest, Testing Library, Playwright, `@ffmpeg/ffmpeg`.

## Global Constraints

- Target desktop Chrome and Edge only for V1.
- Audio and MIDI remain local to the browser; no upload or backend is permitted.
- Supported audio inputs: MP3, WAV, and OGG; supported score inputs: MID and MIDI.
- Preview uses audio time as the master clock and must rebuild visuals from absolute logical time after seek.
- V1 supports 1280×720 and 1920×1080 export.
- WebM is the primary export; MP4 is an optional, lazily loaded FFmpeg/WASM transcode.
- The score is an expressive visualization, not publication-grade engraving.
- Mobile optimization, automatic audio transcription, accounts, cloud storage, and a free-form keyframe editor are out of scope.
- Any committed music, MIDI, font, or 3D asset must include source and license metadata.

---

## File Structure

```text
src/
  app/App.tsx                    App composition and top-level state transitions
  app/App.test.tsx               Main happy-path UI test
  features/files/fileTypes.ts    Input validation and local asset types
  features/files/loadLocal.ts    Object URL and ArrayBuffer loading
  features/files/FilePanel.tsx   Audio/MIDI pickers and demo loader
  features/midi/types.ts         Normalized score contracts
  features/midi/parseMidi.ts     MIDI-to-seconds normalization
  features/midi/parseMidi.test.ts
  features/transport/clock.ts    Absolute logical-time calculation
  features/transport/clock.test.ts
  features/transport/useTransport.ts
  features/score/layout.ts       Note-to-3D score mapping and windowing
  features/score/layout.test.ts
  features/performance/frame.ts  Four-act deterministic state calculation
  features/performance/frame.test.ts
  features/performance/seed.ts   Seeded deterministic random generator
  features/stage/HologramStage.tsx
  features/stage/CodeTerminal.tsx
  features/stage/ScoreRibbon.tsx
  features/stage/ShardField.tsx
  features/stage/CameraRig.tsx
  features/stage/StageEffects.tsx
  features/controls/ControlPanel.tsx
  features/controls/Timeline.tsx
  features/export/capabilities.ts
  features/export/recordWebm.ts
  features/export/transcodeMp4.ts
  features/export/ExportPanel.tsx
  features/export/export.test.ts
  store/useAppStore.ts            Serializable app/session state
  styles/app.css                  Cyberpunk desktop layout
  test/fixtures/simple.mid        Tiny synthetic fixture
  test/setup.ts
public/demo/                      Redistributable demo audio/MIDI and licenses
e2e/happy-path.spec.ts
e2e/export.spec.ts
```

---

### Task 1: Runnable Shell and File Intake

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/App.test.tsx`
- Create: `src/features/files/fileTypes.ts`, `src/features/files/loadLocal.ts`, `src/features/files/FilePanel.tsx`
- Create: `src/store/useAppStore.ts`, `src/styles/app.css`, `src/test/setup.ts`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `validateAudioFile(file: File): FileValidation`
- Produces: `validateMidiFile(file: File): FileValidation`
- Produces: `readMidiBytes(file: File): Promise<ArrayBuffer>`
- Produces: `createAudioSource(file: File): { url: string; dispose(): void }`

- [ ] **Step 1: Scaffold Vite dependencies and test configuration**

Create `package.json` with scripts `dev`, `build`, `test`, `test:watch`, `typecheck`, and `e2e`. Pin the chosen major versions and install:

```powershell
npm install react react-dom three @react-three/fiber @react-three/drei @react-three/postprocessing postprocessing @tonejs/midi zustand gsap troika-three-text
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom @types/three playwright @playwright/test
```

Configure Vitest for `jsdom` with `src/test/setup.ts` importing `@testing-library/jest-dom/vitest`.

- [ ] **Step 2: Write failing file validation tests**

In `src/app/App.test.tsx`, verify invalid audio is rejected and valid MP3 plus MIDI enables initialization:

```tsx
it('enables initialization only after valid audio and MIDI are selected', async () => {
  render(<App />);
  const audio = new File(['audio'], 'demo.mp3', { type: 'audio/mpeg' });
  const midi = new File([0x4d, 0x54, 0x68, 0x64], 'demo.mid', { type: 'audio/midi' });
  await userEvent.upload(screen.getByLabelText('选择音乐文件'), audio);
  await userEvent.upload(screen.getByLabelText('选择 MIDI 文件'), midi);
  expect(screen.getByRole('button', { name: '启动演出' })).toBeEnabled();
});
```

- [ ] **Step 3: Run the test and verify failure**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because `App` and file validation do not exist.

- [ ] **Step 4: Implement the smallest file-intake shell**

Define:

```ts
export type FileValidation = { ok: true } | { ok: false; message: string };
export type LocalAudio = { file: File; url: string; dispose: () => void };
export type LocalMidi = { file: File; bytes: ArrayBuffer };
```

Accept extensions case-insensitively, reject empty files, and cap initial file sizes at 250 MB for audio and 20 MB for MIDI with actionable Chinese messages. Store only serializable metadata in Zustand; keep `File`, object URLs, audio elements, and Three.js objects outside the store.

- [ ] **Step 5: Add the desktop cyberpunk shell**

Implement a fixed left control panel, central stage placeholder, bottom timeline placeholder, local-processing notice, and disabled export control. Use semantic labels and visible keyboard focus. Do not add Three.js yet.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm test -- src/app/App.test.tsx
npm run typecheck
npm run build
git add package.json package-lock.json vite.config.ts tsconfig.json index.html src .gitignore
git commit -m "feat: scaffold local audio and MIDI intake"
```

Expected: tests, typecheck, and production build pass.

---

### Task 2: MIDI Normalization

**Files:**
- Create: `src/features/midi/types.ts`
- Create: `src/features/midi/parseMidi.ts`
- Create: `src/features/midi/parseMidi.test.ts`
- Create: `src/test/fixtures/simple.mid`
- Modify: `src/app/App.tsx`

**Interfaces:**
- Consumes: `LocalMidi.bytes: ArrayBuffer`
- Produces: `parseMidi(bytes: ArrayBuffer): NormalizedScore`
- Produces: `NormalizedScore = { durationSeconds: number; notes: NoteEvent[]; tracks: ScoreTrack[] }`
- Produces: `NoteEvent = { id: string; trackId: string; pitch: number; velocity: number; startSeconds: number; durationSeconds: number }`

- [ ] **Step 1: Generate a tiny deterministic MIDI fixture**

Add a one-bar fixture containing C4 at 0 seconds and E4 at 0.5 seconds, including different velocities. Generate it once using `@tonejs/midi`, commit the binary, and document the notes in the test.

- [ ] **Step 2: Write failing parser tests**

```ts
it('normalizes notes into seconds and stable IDs', () => {
  const score = parseMidi(fixtureBytes);
  expect(score.notes.map(({ pitch, startSeconds }) => ({ pitch, startSeconds }))).toEqual([
    { pitch: 60, startSeconds: 0 },
    { pitch: 64, startSeconds: 0.5 },
  ]);
  expect(score.notes[0].id).toBe('track-0:note-0');
});

it('rejects a MIDI with no playable notes', () => {
  expect(() => parseMidi(emptyMidiBytes)).toThrow('MIDI 中没有可播放的音符');
});
```

- [ ] **Step 3: Run the tests and verify failure**

Run: `npm test -- src/features/midi/parseMidi.test.ts`

Expected: FAIL because `parseMidi` is missing.

- [ ] **Step 4: Implement normalization**

Use `@tonejs/midi` to convert notes to seconds. Clamp velocity to `[0, 1]`, duration to at least `0.01`, sort by `startSeconds`, and calculate duration from the last note end. Preserve track name and instrument metadata in `ScoreTrack`, but keep raw library objects out of the result.

- [ ] **Step 5: Connect parsing to file intake**

After a MIDI selection, parse it once and show track count, note count, and duration. On error, keep any valid audio selection and display the parser message next to the MIDI picker.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm test -- src/features/midi/parseMidi.test.ts src/app/App.test.tsx
npm run typecheck
git add src/features/midi src/test/fixtures src/app/App.tsx
git commit -m "feat: normalize MIDI into timed note events"
```

---

### Task 3: Absolute Transport Clock and Calibration

**Files:**
- Create: `src/features/transport/clock.ts`
- Create: `src/features/transport/clock.test.ts`
- Create: `src/features/transport/useTransport.ts`
- Create: `src/features/controls/ControlPanel.tsx`
- Create: `src/features/controls/Timeline.tsx`
- Modify: `src/app/App.tsx`, `src/store/useAppStore.ts`

**Interfaces:**
- Produces: `logicalTime(audioTime: number, offsetSeconds: number, speed: number): number`
- Produces: `useTransport(audioUrl: string | null): TransportController`
- Produces: `TransportController = { state; duration; currentTime; play(); pause(); seek(seconds); setSpeed(speed); audioElement }`

- [ ] **Step 1: Write failing clock tests**

```ts
it.each([
  [10, 0, 1, 10],
  [10, 1.5, 1, 8.5],
  [10, 0, 0.5, 5],
])('maps audio time to logical performance time', (audio, offset, speed, expected) => {
  expect(logicalTime(audio, offset, speed)).toBe(expected);
});

it('never returns a negative logical time', () => {
  expect(logicalTime(0.2, 1, 1)).toBe(0);
});
```

- [ ] **Step 2: Run the tests and verify failure**

Run: `npm test -- src/features/transport/clock.test.ts`

Expected: FAIL because `logicalTime` is missing.

- [ ] **Step 3: Implement the pure clock and media controller**

Use the formula `max(0, (audioTime - offsetSeconds) * speed)`. The controller owns one `HTMLAudioElement`, listens for `timeupdate`, `durationchange`, `ended`, and `error`, and revokes listeners on disposal. Seeking sets `audio.currentTime` directly; rendering later reads absolute time rather than accumulated deltas.

- [ ] **Step 4: Add calibration and timeline UI**

Provide offset range `-10.00` to `+10.00` seconds in `0.01` increments and speed `0.50` to `2.00` in `0.001` increments. Timeline drag pauses only while dragging, seeks on every pointer move with throttling, and resumes if playback was active before the drag.

- [ ] **Step 5: Test seek and pause state**

Use a fake `HTMLAudioElement` in `useTransport` tests to verify play, pause, seek, rate changes, and cleanup. Assert that the UI exposes the current time and formatted duration.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm test -- src/features/transport src/app/App.test.tsx
npm run typecheck
git add src/features/transport src/features/controls src/app/App.tsx src/store/useAppStore.ts
git commit -m "feat: add calibrated media transport"
```

---

### Task 4: Score Layout and Deterministic Performance Frame

**Files:**
- Create: `src/features/score/layout.ts`
- Create: `src/features/score/layout.test.ts`
- Create: `src/features/performance/seed.ts`
- Create: `src/features/performance/frame.ts`
- Create: `src/features/performance/frame.test.ts`

**Interfaces:**
- Consumes: `NormalizedScore`
- Produces: `layoutScore(score: NormalizedScore, options: LayoutOptions): ScoreLayout`
- Produces: `visibleNotes(layout: ScoreLayout, time: number, windowSeconds: number): PositionedNote[]`
- Produces: `performanceFrame(time: number, duration: number, seed: number): PerformanceFrame`
- Produces: `PerformanceFrame = { act: 'boot' | 'fracture' | 'assemble' | 'perform'; actProgress: number; terminalOpacity: number; fractureProgress: number; assemblyProgress: number; cameraProgress: number }`

- [ ] **Step 1: Write failing layout tests**

```ts
it('maps pitch, time, duration, and velocity to visual properties', () => {
  const [note] = layoutScore(oneNoteScore, defaults).notes;
  expect(note.position.y).toBeCloseTo(0);       // C4 is the chosen baseline
  expect(note.position.z).toBeCloseTo(0);       // starts at zero
  expect(note.glow).toBeCloseTo(0.8);
  expect(note.trailLength).toBeGreaterThan(0);
});

it('returns only notes in the active time window', () => {
  expect(visibleNotes(longLayout, 30, 8).every(n => n.startSeconds >= 22 && n.startSeconds <= 38)).toBe(true);
});
```

- [ ] **Step 2: Write failing performance-frame tests**

Verify exact act boundaries at 0%, 12%, 28%, and 45% of track duration, and verify the same time plus seed returns byte-for-byte equal frame data. The original 2026-08-12 plan then said every track shorter than 20 seconds should use fixed boundaries `0–2`, `2–5`, `5–8`, then perform.

**2026-08-13 final-review correction (not the original rule):** that broad short-track statement was incomplete. The implemented and tested rule is: durations `>= 20s` use `12% / 28% / 45%`; durations `>= 8s` and `< 20s` use fixed `0 / 2 / 5 / 8` second boundaries; durations `< 8s` use `20% / 50% / 80%` of total duration so a non-empty perform act remains. The 4-second licensed demo therefore switches at `0.8 / 2.0 / 3.2` seconds and shows all four acts.

- [ ] **Step 3: Run tests and verify failure**

Run: `npm test -- src/features/score src/features/performance`

Expected: FAIL because layout and frame functions are missing.

- [ ] **Step 4: Implement score mapping and windowing**

Use C4/MIDI 60 as vertical baseline; map each semitone to `0.18` world units. Map score time to ribbon distance at `1.5` world units per second. Clamp visual velocity to `0.15–1.0`. The original start-time-only binary-search window was corrected during final review: a note is visible when `[noteStart, noteEnd]` overlaps the inclusive visible window, and a prebuilt interval index avoids a full-score scan on each frame. Instanced-mesh capacity uses the same overlap semantics through an offline sweep of expanded note intervals.

- [ ] **Step 5: Implement seeded choreography**

Implement a small Mulberry32 generator. Choreography functions must be pure and use absolute `time`; do not call `Math.random()` in stage components. Apply eased progress values but retain raw act boundaries for testing.

- [ ] **Step 6: Verify and commit**

Run:

```powershell
npm test -- src/features/score src/features/performance
npm run typecheck
git add src/features/score src/features/performance
git commit -m "feat: map MIDI to deterministic performance frames"
```

---

### Task 5: Three.js Holographic Stage

**Files:**
- Create: `src/features/stage/HologramStage.tsx`
- Create: `src/features/stage/CodeTerminal.tsx`
- Create: `src/features/stage/ScoreRibbon.tsx`
- Create: `src/features/stage/ShardField.tsx`
- Create: `src/features/stage/CameraRig.tsx`
- Create: `src/features/stage/StageEffects.tsx`
- Modify: `src/app/App.tsx`, `src/styles/app.css`

**Interfaces:**
- Consumes: `ScoreLayout`, `PerformanceFrame`, `logicalTime`
- Produces: `<HologramStage score={score} logicalTime={time} quality="preview" />`
- Produces: `StageQuality = 'preview' | 'export-720p' | 'export-1080p'`

- [ ] **Step 1: Add a failing stage smoke test**

Mock `@react-three/fiber` Canvas and assert that a loaded score causes `HologramStage` to receive the score and current logical time. Keep WebGL pixel validation for Playwright, not jsdom.

- [ ] **Step 2: Run the smoke test and verify failure**

Run: `npm test -- src/app/App.test.tsx`

Expected: FAIL because `HologramStage` is missing.

- [ ] **Step 3: Implement the stage boundary**

Create one Canvas with a stable camera, dark fog, cyan/magenta lighting, and a `frameloop="always"` preview path. `HologramStage` computes the pure `PerformanceFrame`, then passes it as props to focused child components.

- [ ] **Step 4: Implement terminal and shard morphing**

Build the terminal from panel and border shard instances. Give every shard a deterministic start transform, arc control point, and destination. Interpolate from terminal transform to score destination using `fractureProgress` and `assemblyProgress`; do not create or destroy objects each frame.

- [ ] **Step 5: Implement score ribbon and active-note response**

Render five glowing staff lines along a curved ribbon. Render only `visibleNotes` in an instanced pool. Notes within their `[startSeconds, startSeconds + durationSeconds]` interval pulse according to velocity; inactive nearby notes remain dim.

- [ ] **Step 6: Implement camera and effects quality tiers**

Camera movement follows `cameraProgress` with low-amplitude phrase motion. Add bloom, vignette, noise, and optional trailing effects. Preview quality may disable the trailing effect after sustained low frame rate; export quality never changes during a render.

- [ ] **Step 7: Verify manually and commit**

Run:

```powershell
npm test
npm run typecheck
npm run build
npm run dev
```

Manual checks: all four acts are visible with the fixture; seek backward reconstructs the earlier act; no new mesh count growth occurs after repeated seeks.

```powershell
git add src/features/stage src/app/App.tsx src/styles/app.css
git commit -m "feat: render holographic code-to-score performance"
```

---

### Task 6: Demo Content, Recovery States, and Full Preview UX

**Files:**
- Create: `public/demo/manifest.json`
- Create: `public/demo/LICENSES.md`
- Create: `public/demo/demo.mid`, `public/demo/demo.ogg`
- Modify: `src/features/files/FilePanel.tsx`
- Modify: `src/features/controls/ControlPanel.tsx`
- Modify: `src/app/App.tsx`, `src/app/App.test.tsx`

**Interfaces:**
- Produces: `DemoManifest = { title: string; audioUrl: string; midiUrl: string; offsetSeconds: number; speed: number; seed: number }[]`
- Consumes: existing parser, transport, and stage interfaces

- [ ] **Step 1: Select and document redistributable demo assets**

Use an original project-created clip or a public-domain/CC0 pair. Record exact title, creator, source URL, license, and any modifications in `LICENSES.md`. Confirm the audio and MIDI describe the same performance before committing.

- [ ] **Step 2: Write failing recovery-state tests**

Test invalid MIDI, audio/MIDI duration difference above 15%, empty MIDI, and replacement of one file without clearing the other valid file. Assert each message contains a concrete next action.

- [ ] **Step 3: Implement demo loading and mismatch warnings**

Fetch both demo assets locally from `/demo`. A duration difference over 15% or 10 seconds, whichever is larger, shows a warning but does not block playback. An empty MIDI blocks initialization.

- [ ] **Step 4: Implement quality fallback controls**

Expose Preview Quality values `Auto`, `High`, and `Low`. `Auto` reduces bloom resolution and visible note window after 120 consecutive frames below 45 FPS. Show the user what changed and allow High to be restored.

- [ ] **Step 5: Verify and commit**

Run:

```powershell
npm test
npm run typecheck
npm run build
git add public/demo src/features/files src/features/controls src/app
git commit -m "feat: add licensed demo and resilient preview UX"
```

---

### Task 7: WebM Capture and MP4 Transcoding

**Files:**
- Create: `src/features/export/capabilities.ts`
- Create: `src/features/export/recordWebm.ts`
- Create: `src/features/export/transcodeMp4.ts`
- Create: `src/features/export/ExportPanel.tsx`
- Create: `src/features/export/export.test.ts`
- Modify: `src/app/App.tsx`, `src/store/useAppStore.ts`

**Interfaces:**
- Produces: `detectExportCapabilities(): ExportCapabilities`
- Produces: `recordWebm(options: RecordOptions): Promise<Blob>`
- Produces: `transcodeMp4(webm: Blob, onProgress: (ratio: number) => void, signal: AbortSignal): Promise<Blob>`
- Consumes: stage canvas, audio source, selected resolution, fixed choreography seed

- [ ] **Step 1: Write failing capability and cancellation tests**

```ts
it('disables WebM when captureStream or MediaRecorder is unavailable', () => {
  expect(detectExportCapabilities(fakeUnsupportedWindow).webm).toBe(false);
});

it('stops tracks and rejects with ExportCancelled when aborted', async () => {
  const promise = recordWebm({ ...options, signal: abortedSignal });
  await expect(promise).rejects.toMatchObject({ name: 'ExportCancelled' });
  expect(stopTrack).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `npm test -- src/features/export/export.test.ts`

Expected: FAIL because export modules are missing.

- [ ] **Step 3: Implement capability detection and WebM recording**

Detect `HTMLCanvasElement.captureStream`, `MediaRecorder`, supported MIME types, and audio stream availability before enabling export. Combine canvas video and Web Audio destination tracks into one `MediaStream`. On completion or cancellation, stop all tracks, disconnect audio nodes, and restore preview state.

- [ ] **Step 4: Make export deterministic**

Lock controls, seed, resolution, quality, and calibration values when export starts. Render from time zero at a fixed requested frame rate. If the browser cannot sustain offline fixed stepping with synchronized audio capture, explicitly use real-time capture and label it “实时导出”; do not silently produce a shortened video.

- [ ] **Step 5: Implement lazy MP4 transcode**

Dynamically import `@ffmpeg/ffmpeg` only after the user chooses MP4. Write the captured WebM to FFmpeg’s in-memory filesystem, run an H.264/AAC MP4 command compatible with the bundled build, report progress, read the MP4, then delete temporary files and terminate the worker on cancellation or completion.

- [ ] **Step 6: Add export UX and recovery**

Offer 720p/1080p and WebM/MP4. Show capture and transcode as separate phases. If MP4 fails, retain and expose the WebM download. Generate safe filenames using the audio basename plus resolution and timestamp.

- [ ] **Step 7: Verify and commit**

Run:

```powershell
npm install @ffmpeg/ffmpeg @ffmpeg/util
npm test -- src/features/export src/app/App.test.tsx
npm run typecheck
npm run build
git add package.json package-lock.json src/features/export src/app/App.tsx src/store/useAppStore.ts
git commit -m "feat: export WebM and optionally transcode MP4"
```

Manual check: cancel during capture and transcode; successful MP4 contains audio; forced transcode failure still downloads WebM.

---

### Task 8: Browser E2E, Performance Budget, and Project Handoff

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/happy-path.spec.ts`
- Create: `e2e/export.spec.ts`
- Create: `README.md`
- Create: `docs/assets.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: complete public UI
- Produces: reproducible local development, test, build, and asset-license instructions

- [ ] **Step 1: Write the happy-path E2E test**

Use Chromium to load the built-in demo, start playback, seek to each act boundary, and assert the app exposes `data-act="boot|fracture|assemble|perform"`. Capture one screenshot per act for regression artifacts without committing generated screenshots.

- [ ] **Step 2: Write the export E2E test**

Use a short test asset, export 720p WebM, download it, assert non-zero size and WebM MIME type, then verify the UI returns to preview state. Keep MP4 as a tagged/manual browser test if WASM runtime makes CI unstable; the README must state the exact manual procedure.

- [ ] **Step 3: Add a performance budget probe**

During the built-in demo on a documented reference desktop, record average FPS after warm-up, draw calls, geometries, textures, and peak JS heap where available. Acceptance targets:

```text
Preview average: >= 50 FPS at 1920×1080 on the reference machine
Draw calls: <= 120 during perform act
Repeated seek cycles: no monotonic geometry/texture growth
Initial JS bundle: FFmpeg excluded from the initial chunk
```

- [ ] **Step 4: Document operation and limitations**

README sections must include prerequisites, `npm install`, `npm run dev`, tests, production build, how to find or create matching MIDI, calibration workflow, export formats, browser scope, privacy statement, and known limitation for drifting live performances. `docs/assets.md` lists every committed asset and its license.

- [ ] **Step 5: Run the complete verification suite**

Run:

```powershell
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run e2e
git status --short
```

Expected: unit tests, typecheck, production build, and Chromium E2E pass; status shows only the planned documentation and test changes.

- [ ] **Step 6: Perform Edge acceptance**

In current Microsoft Edge, manually validate local file intake, play/pause/seek, all four acts, 720p and 1080p WebM, and MP4. Record browser version, outcome, and any deviations in the release notes or GitHub issue tracker.

- [ ] **Step 7: Commit the completed handoff**

```powershell
git add playwright.config.ts e2e README.md docs/assets.md package.json package-lock.json
git commit -m "test: verify browser performance and export workflow"
git log --oneline --decorate -10
```

The branch is ready for review only when every global constraint and the design document’s completion definition can be mapped to passing evidence above.
