# Cyberpunk City Note Flight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic cyberpunk city canyon in which MIDI notes fly between buildings, and replace the built-in demo with a legally redistributable Chinese-vocal song plus synchronized MIDI.

**Architecture:** Add pure deterministic layout modules for the city and flying notes, then render their records through bounded Three.js instance pools. Keep all animation derived from absolute audio time so seeking and export reproduce identical frames. Treat song acquisition as a gated asset task: no candidate enters the repository until its redistribution license, attribution, browser decoding, and MIDI synchronization are verified.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, Tone.js MIDI parser, Vitest, Playwright, Vite, FFmpeg.wasm.

## Global Constraints

- Visual color balance is approximately 75% near-black structure, 15% cyan light/fog, and 10% magenta accents.
- Ordinary MIDI events must never move the camera; the principal fracture may create one restrained impulse lasting at most 180 ms.
- Every city, note, camera, and effect state must be a deterministic function of absolute music time and a fixed seed.
- The city must cover `durationSeconds * 1.5 + 18` world units or more and remain visible throughout ACT 04.
- The demo song must contain Chinese vocals and carry an explicit license permitting download and redistribution in this GitHub repository.
- Do not add a commercial recording or any asset whose redistribution rights cannot be demonstrated.
- Preserve local audio/MIDI intake and 720p/1080p WebM/MP4 export behavior.

---

### Task 1: Deterministic City Canyon Model

**Files:**
- Create: `src/features/stage/cityLayout.ts`
- Create: `src/features/stage/cityLayout.test.ts`
- Modify: `src/features/stage/CinematicLighting.tsx`
- Modify: `src/features/stage/CinematicLighting.test.ts`

**Interfaces:**
- Consumes: `mulberry32(seed: number): () => number` from `src/features/performance/seed.ts`.
- Produces: `buildCityLayout(durationSeconds: number, seed: number, density: 'high' | 'low'): CityLayout` where `CityLayout` contains bounded `buildings`, `lightStrips`, `roadSegments`, `trafficTrails`, and `length` arrays/values.

- [ ] **Step 1: Write failing model tests**

```ts
const layout = buildCityLayout(60, 0xc17b3, 'high');
expect(layout.length).toBeGreaterThanOrEqual(108);
expect(layout.buildings.every((b) => Math.abs(b.position[0]) >= 4.5)).toBe(true);
expect(buildCityLayout(60, 0xc17b3, 'high')).toEqual(layout);
expect(buildCityLayout(60, 0xc17b4, 'high')).not.toEqual(layout);
expect(buildCityLayout(60, 0xc17b3, 'low').buildings.length).toBeLessThan(layout.buildings.length);
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npx vitest run src/features/stage/cityLayout.test.ts`

Expected: FAIL because `cityLayout` and `buildCityLayout` do not exist.

- [ ] **Step 3: Implement the pure city layout**

Define explicit `BuildingRecord`, `LightStripRecord`, `RoadRecord`, and `TrafficTrailRecord` types. Generate paired left/right blocks along Z, preserve a central corridor at `abs(x) < 4.5`, derive magenta accents from stable indices, and generate low density by reducing counts rather than changing seed semantics.

- [ ] **Step 4: Render the model with bounded instance pools**

Replace the inline tower generator in `CinematicLighting.tsx` with `buildCityLayout`. Use separate `instancedMesh` pools for black buildings and emissive strips; keep fog and particles, add a dark road plane, and render traffic trails only in high quality.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npx vitest run src/features/stage/cityLayout.test.ts src/features/stage/CinematicLighting.test.ts && npm run typecheck`

Expected: all focused tests PASS and typecheck exits 0.

Commit: `git commit -am "feat: generate deterministic cyberpunk city canyon"`

---

### Task 2: Spatial MIDI Note Flight Model

**Files:**
- Create: `src/features/stage/noteFlight.ts`
- Create: `src/features/stage/noteFlight.test.ts`
- Modify: `src/features/stage/ScoreReassembly.tsx`
- Modify: `src/features/stage/notationModel.ts`

**Interfaces:**
- Consumes: `ScoreLayout`, `ScoreNote`, and `visibleNotes` from `src/features/score/layout.ts`.
- Produces: `noteFlightRecord(note: ScoreNote, logicalTime: number): NoteFlightRecord` with `position`, `scale`, `color`, `energy`, and `trailLength`.

- [ ] **Step 1: Write failing mapping tests**

```ts
const low = noteFlightRecord(note({ midi: 48, trackId: 'bass', velocity: 0.3 }), 2);
const high = noteFlightRecord(note({ midi: 72, trackId: 'lead', velocity: 0.9 }), 2);
expect(high.position[1]).toBeGreaterThan(low.position[1]);
expect(high.position[0]).not.toBe(low.position[0]);
expect(high.energy).toBeGreaterThan(low.energy);
expect(noteFlightRecord(note({ durationSeconds: 2 }), 2).trailLength)
  .toBeGreaterThan(noteFlightRecord(note({ durationSeconds: 0.2 }), 2).trailLength);
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npx vitest run src/features/stage/noteFlight.test.ts`

Expected: FAIL because `noteFlightRecord` does not exist.

- [ ] **Step 3: Implement deterministic mapping**

Map MIDI pitch into a clamped vertical band, stable track hash into three X lanes inside the city corridor, start time into Z using the existing 1.5 units/second scale, duration into trail length, and active/velocity state into cyan or magenta energy. Do not integrate velocity or mutate positions frame-to-frame.

- [ ] **Step 4: Replace static notation placement**

Update `ScoreReassembly` instance matrices from `NoteFlightRecord`. Add a bounded trail instance pool; reduce the five permanent staff lines to short, low-opacity local guide segments near the active note window.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npx vitest run src/features/stage/noteFlight.test.ts src/features/stage/ScoreRibbon.test.ts src/features/stage/notationModel.test.ts && npm run typecheck`

Expected: focused tests PASS and typecheck exits 0.

Commit: `git commit -am "feat: fly midi notes through the city canyon"`

---

### Task 3: Four-Act City Camera Direction

**Files:**
- Modify: `src/features/performance/director.ts`
- Modify: `src/features/performance/director.test.ts`
- Modify: `src/features/stage/DirectorCamera.tsx`

**Interfaces:**
- Consumes: `PerformanceFrame`, city travel scale `1.5`, and the existing analytic fracture envelope.
- Produces: existing `DirectorState.camera` without changing its public shape.

- [ ] **Step 1: Write failing camera tests**

```ts
expect(stateAtBoot.camera.position[2]).toBeLessThan(stateAtAssemble.camera.position[2]);
expect(Math.abs(stateAtPerform.camera.position[0] - stateAtPerform.camera.target[0])).toBeGreaterThan(2);
expect(stateWithOrdinaryImpact.camera).toEqual(stateWithoutImpact.camera);
expect(distance(stateAtFracture.camera.position, stateAtFractureAfter180ms.camera.position)).toBeLessThan(0.08);
```

- [ ] **Step 2: Run the tests and verify RED**

Run: `npx vitest run src/features/performance/director.test.ts`

Expected: at least the new city-forward progression assertion FAILS against the current framing.

- [ ] **Step 3: Implement constrained city camera paths**

Keep ACT 01–03 centered within the corridor with restrained forward motion and a target farther down the street. Blend ACT 04 into the existing stable oblique follow position. Retain the fracture-only 180 ms impulse and leave ordinary impact data out of camera calculations.

- [ ] **Step 4: Verify GREEN and commit**

Run: `npx vitest run src/features/performance/director.test.ts && npm run typecheck`

Expected: all director tests PASS.

Commit: `git commit -am "feat: direct camera through cyberpunk city acts"`

---

### Task 4: Legally Redistributable Chinese-Vocal Demo Pair

**Files:**
- Modify: `src/features/demo/demoAssets.ts`
- Modify: `src/features/demo/demoAssets.test.ts`
- Replace or create: `public/demo/<licensed-song>.ogg`
- Replace or create: `public/demo/<licensed-song>.mid`
- Create: `public/demo/LICENSE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: browser-supported OGG/MP3/WAV audio, Standard MIDI File, and existing demo loader URLs.
- Produces: a verified local audio/MIDI pair and explicit `DEMO_AUDIO_URL`, `DEMO_MIDI_URL`, title, artist, source, and license metadata.

- [ ] **Step 1: Research candidates from primary license/source pages**

Search for Chinese-vocal tracks whose author or hosting source explicitly grants redistribution. Record candidate URL, author, exact license, attribution text, download URL, and whether derivatives/MIDI transcription are allowed. Reject candidates with streaming-only access, unclear ownership, noncommercial restrictions incompatible with the repository, or no permission to create the synchronized MIDI.

- [ ] **Step 2: Gate the selected asset with failing metadata tests**

```ts
expect(DEMO_METADATA.language).toBe('zh');
expect(DEMO_METADATA.hasVocals).toBe(true);
expect(DEMO_METADATA.redistributionAllowed).toBe(true);
expect(DEMO_METADATA.sourceUrl).toMatch(/^https:\/\//);
expect(DEMO_METADATA.licenseUrl).toMatch(/^https:\/\//);
```

Run: `npx vitest run src/features/demo/demoAssets.test.ts`

Expected: FAIL because the current demo metadata is not a licensed Chinese-vocal pair.

- [ ] **Step 3: Add and document the verified assets**

Download only the selected licensed recording. Create or obtain the permitted MIDI, align its first audible event and tempo map to the recording, normalize to a browser-supported format, and write exact attribution plus modification notes to `public/demo/LICENSE.md` and `README.md`.

- [ ] **Step 4: Verify media and synchronization**

Run `ffprobe` to assert one audio stream and readable duration. Parse the MIDI with the project parser, assert at least one track and note, then compare durations and record the explicit calibration offset; require absolute duration mismatch no greater than 0.25 seconds after calibration.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npx vitest run src/features/demo/demoAssets.test.ts src/features/midi/parseMidi.test.ts src/app/App.test.tsx && npm run typecheck`

Expected: tests PASS, source and license links are non-empty, and the demo initializes through the normal app path.

Commit: `git add public/demo src/features/demo README.md && git commit -m "feat: add licensed chinese vocal demo"`

---

### Task 5: Integration, Visual Acceptance, and Export Regression

**Files:**
- Modify: `src/features/stage/HologramStage.tsx`
- Modify: `src/features/stage/HologramStage.test.tsx`
- Modify: `e2e/happy-path.spec.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `CityLayout`, flying-note renderer, director state, and licensed demo pair.
- Produces: one production stage with four seekable city acts and unchanged export controls.

- [ ] **Step 1: Write a failing stage-boundary test**

Assert the initialized stage renders the city, flying-note layer, one camera, and one post-processing stack; assert the city duration prop equals the score duration and low preview quality selects the reduced city density.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/features/stage/HologramStage.test.tsx`

Expected: FAIL because the new city and note-flight boundaries are not wired.

- [ ] **Step 3: Wire the final stage and remove obsolete visual paths**

Pass duration/seed/quality into city generation, render flying notes inside the same world coordinate system, retain a single `Canvas`, and remove any remaining full-length opaque staff geometry that competes with the city.

- [ ] **Step 4: Extend Chromium visual assertions**

At ACT 01, 02, 03, and 04 absolute seek points, assert nonzero draw calls and capture screenshots. At ACT 04, assert camera X offset is oblique and scene telemetry includes both building and note instance pools. Repeat five backward/forward seeks and assert stable geometry, texture, and instance-pool counts.

- [ ] **Step 5: Run complete automated verification**

Run:

```powershell
npm test
npm run typecheck
npm run build
npx playwright test e2e/happy-path.spec.ts --project=chromium --grep "built-in demo plays"
```

Expected: all commands exit 0 with four new screenshots and no `pageerror`.

- [ ] **Step 6: Perform visual and export acceptance**

Inspect all four screenshots for black city massing, cyan primary lighting, magenta accents, and ACT 04 notes visibly between buildings. Export a short 720p WebM from the built-in demo and verify via `ffprobe` that it contains one video and one audio stream and is non-empty.

- [ ] **Step 7: Commit the integration**

```powershell
git add src/features/stage e2e README.md
git commit -m "feat: integrate cyberpunk city music flight"
```

## Plan Self-Review

- Spec coverage: city extent, color hierarchy, note mapping, camera stability, licensed Chinese vocals, deterministic seeking, performance pools, screenshots, and WebM audio/video are each assigned to a task.
- Placeholder scan: no TBD/TODO or deferred implementation instruction remains.
- Type consistency: `CityLayout`, `buildCityLayout`, `NoteFlightRecord`, and `noteFlightRecord` are introduced before their integration consumers.
