# Cinematic Code Fracture Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current technical-demo stage with a deterministic, directed four-act cyberpunk performance in which a code monolith fractures and reassembles into readable musical notation.

**Architecture:** Extend the existing absolute-time `PerformanceFrame` with immutable musical-impact data and pure director-state functions. Keep React Three Fiber components declarative: one fixed shard pool, one notation pool, deterministic camera/light state, and no playback-owned allocations. Preview, seek, replay, and export continue to consume the same logical-time render path.

**Tech Stack:** React 19, TypeScript, Three.js, React Three Fiber, postprocessing, `@tonejs/midi`, Vitest, Testing Library, Playwright.

## Global Constraints

- Preserve the existing four-act timing rules: tracks `>= 20s` use `12% / 28% / 45%`; tracks `>= 8s` and `< 20s` use `2s / 5s / 8s`; tracks `< 8s` use `20% / 50% / 80%`.
- Derive every visual and camera state from absolute logical time plus a fixed seed; never accumulate playback state.
- Keep scene object, geometry, texture, and instanced-pool counts stable across seek and replay.
- High and low quality must preserve act boundaries, principal fracture timing, camera choreography, and active notes.
- Do not add free camera controls, audio transcription, mobile support, new export formats, or new runtime dependencies.
- Target desktop Chrome and Edge; WebGL effects must have a non-blocking emissive-material fallback.

---

## File Map

- `src/features/performance/impacts.ts`: pure MIDI-derived impact extraction and lookup.
- `src/features/performance/director.ts`: pure absolute-time camera, monolith, fracture, and lighting state.
- `src/features/stage/CodeMonolith.tsx`: layered code wall and crack network.
- `src/features/stage/CinematicFracture.tsx`: fixed shard pool, trajectories, and shock rings.
- `src/features/stage/ScoreReassembly.tsx`: readable staff, notation glyph pools, and shard-to-score transition.
- `src/features/stage/DirectorCamera.tsx`: applies pure director camera state to Three.js.
- `src/features/stage/CinematicLighting.tsx`: fog, lights, impact flash, atmosphere, and quality reductions.
- `src/features/stage/HologramStage.tsx`: stage composition only.
- `src/features/stage/StageEffects.tsx`: deterministic postprocessing driven by director state.
- Existing `CodeTerminal.tsx`, `ShardField.tsx`, and `CameraRig.tsx` are removed only after their replacements are integrated and green.

---

### Task 1: MIDI-Derived Impact Timeline

**Files:**
- Create: `src/features/performance/impacts.ts`
- Create: `src/features/performance/impacts.test.ts`

**Interfaces:**
- Consumes: `ScoreLayout.notes: PositionedNote[]`
- Produces: `MusicalImpact = { time: number; energy: number; lowEnergy: number }`
- Produces: `buildImpactTimeline(score: ScoreLayout): MusicalImpact[]`
- Produces: `impactStateAt(time: number, impacts: MusicalImpact[]): { energy: number; lowEnergy: number; age: number }`

- [ ] **Step 1: Write the failing extraction tests**

```ts
it('groups notes within 60 ms into one velocity-weighted impact', () => {
  const impacts = buildImpactTimeline(scoreWithNotes([
    note(36, 1, 0.9), note(72, 1.04, 0.7), note(60, 2, 0.2),
  ]));
  expect(impacts).toHaveLength(2);
  expect(impacts[0]).toMatchObject({ time: 1 });
  expect(impacts[0].energy).toBeGreaterThan(impacts[1].energy);
  expect(impacts[0].lowEnergy).toBeGreaterThan(0);
});

it('reconstructs the same decaying impact state after a direct seek', () => {
  const impacts = [{ time: 2, energy: 0.8, lowEnergy: 0.6 }];
  expect(impactStateAt(2.1, impacts)).toEqual(impactStateAt(2.1, impacts));
  expect(impactStateAt(3, impacts).energy).toBe(0);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npx vitest run src/features/performance/impacts.test.ts`

Expected: FAIL because `impacts.ts` does not exist.

- [ ] **Step 3: Implement deterministic grouping and binary-search lookup**

Use a `0.06` second grouping window. Sum `velocity²`, normalize group energy to `[0, 1]`, and weight pitches below MIDI 48 into `lowEnergy`. `impactStateAt` must binary-search the latest impact, use a `0.32` second envelope, and return zero energy outside the envelope. Do not mutate the input score or keep a cursor between calls.

- [ ] **Step 4: Run focused and performance tests**

Run: `npx vitest run src/features/performance/impacts.test.ts src/features/performance/frame.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/performance/impacts.ts src/features/performance/impacts.test.ts
git commit -m "feat: derive deterministic musical impacts"
```

---

### Task 2: Pure Cinematic Director State

**Files:**
- Create: `src/features/performance/director.ts`
- Create: `src/features/performance/director.test.ts`
- Modify: `src/features/performance/frame.ts`

**Interfaces:**
- Consumes: `PerformanceFrame`, logical time, score duration, `ImpactState`, seed.
- Produces: `DirectorState` with `camera`, `monolith`, `fracture`, and `lighting` fields.
- Produces: `directorStateAt(input: DirectorInput): DirectorState`.

- [ ] **Step 1: Write failing boundary and seek tests**

```ts
it.each([
  [0, 'boot'], [12, 'fracture'], [28, 'assemble'], [45, 'perform'],
])('directs the expected act at %s seconds of a 100 second score', (time, act) => {
  expect(directorStateAt(input({ time, duration: 100 })).act).toBe(act);
});

it('reconstructs camera pose and shake exactly after arbitrary seek order', () => {
  const direct = directorStateAt(input({ time: 12.14, duration: 100 }));
  directorStateAt(input({ time: 72, duration: 100 }));
  expect(directorStateAt(input({ time: 12.14, duration: 100 }))).toEqual(direct);
});

it('keeps low quality choreography identical', () => {
  const high = directorStateAt(input({ time: 33, quality: 'high' }));
  const low = directorStateAt(input({ time: 33, quality: 'low' }));
  expect(low.camera).toEqual(high.camera);
  expect(low.fracture.progress).toBe(high.fracture.progress);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/features/performance/director.test.ts`

Expected: FAIL because the director API is missing.

- [ ] **Step 3: Implement the pure director function**

Define numeric tuple camera fields so tests do not depend on Three.js classes:

```ts
export type DirectorState = {
  act: PerformanceAct;
  camera: { position: [number, number, number]; target: [number, number, number]; fov: number; focusDistance: number };
  monolith: { opacity: number; crackEnergy: number; scanOffset: number };
  fracture: { progress: number; flash: number; shockwave: number; trailEnergy: number };
  lighting: { cyan: number; magenta: number; atmosphere: number };
};
```

Use smoothstep envelopes and seeded analytic noise. The main fracture flash lasts at most `0.12s`; impact shake lasts at most `0.32s`; neither may use mutable random state.

- [ ] **Step 4: Run director and existing choreography tests**

Run: `npx vitest run src/features/performance/director.test.ts src/features/performance/frame.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/features/performance/director.ts src/features/performance/director.test.ts src/features/performance/frame.ts
git commit -m "feat: add absolute-time cinematic director"
```

---

### Task 3: Code Monolith and Crack Network

**Files:**
- Create: `src/features/stage/CodeMonolith.tsx`
- Create: `src/features/stage/CodeMonolith.test.tsx`
- Modify: `src/features/stage/HologramStage.tsx`

**Interfaces:**
- Consumes: `DirectorState['monolith']`, logical time, seed.
- Produces: a fixed hierarchy with three code planes, one frame mesh, one scan plane, and one fixed instanced crack mesh.

- [ ] **Step 1: Write the failing component contract test**

Mock Fiber primitives and render `CodeMonolith`. Assert `data-layer-count="3"`, `data-crack-capacity="48"`, and that opacity becomes zero outside boot/fracture without unmounting the fixed pools.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/features/stage/CodeMonolith.test.tsx`

Expected: FAIL because `CodeMonolith` is missing.

- [ ] **Step 3: Implement the monolith**

Use three pre-authored code-line arrays rendered as fixed instanced glyph bars; do not create text textures per frame. Generate 48 seeded crack segments once with parent indices and activation thresholds. Apply matrices in `useLayoutEffect` from `crackEnergy`. Keep foreground code readable, background planes offset in Z, and scanning/glitch displacement deterministic from logical time.

- [ ] **Step 4: Integrate without deleting the old terminal**

Render `CodeMonolith` in `HologramStage` behind a temporary feature constant `CINEMATIC_STAGE = true`. Leave `CodeTerminal` present only in the `false` branch until Task 7 removes the fallback.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run src/features/stage/CodeMonolith.test.tsx src/app/App.test.tsx`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/stage/CodeMonolith.tsx src/features/stage/CodeMonolith.test.tsx src/features/stage/HologramStage.tsx
git commit -m "feat: build cinematic code monolith"
```

---

### Task 4: Fixed Cinematic Fracture System

**Files:**
- Create: `src/features/stage/CinematicFracture.tsx`
- Create: `src/features/stage/fractureModel.ts`
- Create: `src/features/stage/fractureModel.test.ts`
- Modify: `src/features/stage/HologramStage.tsx`

**Interfaces:**
- Produces: `buildShardModel(seed, capacity): ShardModel[]`.
- Produces: `shardTransformAt(model, DirectorState): { position; rotation; scale; trail }`.
- High capacity: `192`; low capacity: `96`; both allocated once per mounted quality tier.

- [ ] **Step 1: Write failing fixed-pool and seek tests**

```ts
it('builds stable seeded shard identities', () => {
  expect(buildShardModel(7, 192)).toEqual(buildShardModel(7, 192));
});

it('returns the same transform regardless of evaluation order', () => {
  const shard = buildShardModel(7, 1)[0];
  const expected = shardTransformAt(shard, stateAt(0.42));
  shardTransformAt(shard, stateAt(0.9));
  expect(shardTransformAt(shard, stateAt(0.42))).toEqual(expected);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/features/stage/fractureModel.test.ts`

Expected: FAIL because the fracture model is missing.

- [ ] **Step 3: Implement model and component**

Use a fixed instanced box/wedge pool with seeded wall-space origins, ballistic control points, angular axes, notation destinations, and depth bands. Calculate transforms analytically from director progress. Add a second fixed instanced trail pool and three reusable shock-ring meshes; never append rings in response to notes.

- [ ] **Step 4: Integrate and replace `ShardField` only in the cinematic branch**

Pass `previewQuality` so low preview selects capacity 96. Export quality always selects 192.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npx vitest run src/features/stage/fractureModel.test.ts src/features/performance/director.test.ts`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/stage/CinematicFracture.tsx src/features/stage/fractureModel.ts src/features/stage/fractureModel.test.ts src/features/stage/HologramStage.tsx
git commit -m "feat: add deterministic cinematic fracture"
```

---

### Task 5: Readable Score Reassembly

**Files:**
- Create: `src/features/stage/ScoreReassembly.tsx`
- Create: `src/features/stage/notationModel.ts`
- Create: `src/features/stage/notationModel.test.ts`
- Modify: `src/features/stage/HologramStage.tsx`

**Interfaces:**
- Consumes: `ScoreLayout`, logical time, `DirectorState`, note window.
- Produces fixed pools for note heads, stems, beams, ledger lines, and active-note halos.
- Reuses `maximumWindowDemand(score, windowSeconds)` for capacity safety.

- [ ] **Step 1: Write failing notation tests**

Test that a quarter note produces a head and stem, two close short notes at the same beat can produce a beam group, pitches outside the staff produce ledger lines, sustained notes remain visible while overlapping the window, and direct seek returns identical notation records.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/features/stage/notationModel.test.ts`

Expected: FAIL because `notationModel.ts` is missing.

- [ ] **Step 3: Implement pure notation records**

Define:

```ts
export type NotationRecord = {
  noteId: string;
  head: { position: [number, number, number]; scale: number };
  stem: { position: [number, number, number]; height: number; direction: -1 | 1 };
  ledgerYs: number[];
  activeEnergy: number;
};
```

Keep musical glyph interpretation deliberately limited to heads, stems, simple beams, ledger lines, bar lines, and ties for sustained notes. Do not implement engraving pagination or key signatures.

- [ ] **Step 4: Implement `ScoreReassembly`**

Use instanced circle geometry for heads, boxes for stems/beams/bar lines, tube staff lines, and fixed halo sprites. Blend shard-to-score opacity with `assemblyProgress`. Active notes use MIDI time and velocity; performed notes fade over `0.45s`.

- [ ] **Step 5: Integrate and run tests**

Run: `npx vitest run src/features/stage/notationModel.test.ts src/features/stage/ScoreRibbon.test.ts src/features/score/layout.test.ts`

Run: `npm run typecheck`

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/features/stage/ScoreReassembly.tsx src/features/stage/notationModel.ts src/features/stage/notationModel.test.ts src/features/stage/HologramStage.tsx
git commit -m "feat: reassemble shards into readable score"
```

---

### Task 6: Director Camera, Lighting, and Deterministic Effects

**Files:**
- Create: `src/features/stage/DirectorCamera.tsx`
- Create: `src/features/stage/CinematicLighting.tsx`
- Modify: `src/features/stage/StageEffects.tsx`
- Modify: `src/features/stage/HologramStage.tsx`

**Interfaces:**
- `DirectorCamera({ state }: { state: DirectorState['camera'] })` applies position, target, FOV, and projection updates.
- `CinematicLighting({ state, previewQuality, quality })` owns a fixed light/fog/atmosphere hierarchy.
- `StageEffects` additionally consumes `flash` and `focusDistance` without using elapsed composer time.

- [ ] **Step 1: Write failing integration tests**

Add a stage-boundary test that mocks `DirectorCamera`, `CinematicLighting`, `CodeMonolith`, `CinematicFracture`, and `ScoreReassembly`, then asserts all receive the same director state for a given logical time. Add a low-quality assertion that lighting density changes while camera state does not.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run src/features/stage/HologramStage.test.tsx`

Expected: FAIL because the new integration contract is not complete.

- [ ] **Step 3: Implement camera and lighting**

Apply camera state in `useFrame`; update FOV only when changed and call `updateProjectionMatrix`. Use fixed ambient, cyan key, magenta rim, fracture point light, fog, and a fixed atmospheric particle pool. Low quality halves atmosphere count and disables volumetric cone meshes but preserves light envelopes.

- [ ] **Step 4: Extend deterministic effects**

Drive bloom and impact flash from uniforms derived from logical time/director state. Keep grain deterministic. Implement depth-of-field only if the current postprocessing package supports a stable explicit focus distance; otherwise use a deterministic vignette/bloom focus cue and document the fallback in code.

- [ ] **Step 5: Run focused tests, typecheck, and build**

Run: `npx vitest run src/features/stage/HologramStage.test.tsx src/features/performance/director.test.ts`

Run: `npm run typecheck`

Run: `npm run build`

Expected: PASS; the existing large-chunk advisory may remain, but no new dependency or entry chunk is added.

- [ ] **Step 6: Commit**

```powershell
git add src/features/stage/DirectorCamera.tsx src/features/stage/CinematicLighting.tsx src/features/stage/StageEffects.tsx src/features/stage/HologramStage.tsx src/features/stage/HologramStage.test.tsx
git commit -m "feat: direct cinematic camera and lighting"
```

---

### Task 7: Remove Legacy Stage and Prove Lifecycle Stability

**Files:**
- Delete: `src/features/stage/CodeTerminal.tsx`
- Delete: `src/features/stage/ShardField.tsx`
- Delete: `src/features/stage/CameraRig.tsx`
- Modify: `src/features/stage/HologramStage.tsx`
- Modify: `e2e/happy-path.spec.ts`
- Modify: `e2e/app-driver.ts`

**Interfaces:**
- The public `HologramStageProps` contract remains unchanged.
- Canvas retains `data-act`; add `data-cinematic-stage="true"` for E2E identification.

- [ ] **Step 1: Write the failing lifecycle acceptance assertions**

Extend the existing seek test to sample scene objects, meshes, geometries, textures, and instanced-pool counts after warm-up, then seek backward/forward through all four acts at least five cycles. Assert exact count equality after every sample and exact director camera pose when returning to the same logical time.

- [ ] **Step 2: Run the bounded Chromium test and verify the new assertion fails before final wiring**

Run: `npx playwright test e2e/happy-path.spec.ts --project=chromium --grep "four acts"`

Expected: FAIL because `data-cinematic-stage` or new telemetry is absent.

- [ ] **Step 3: Remove the feature constant and legacy components**

Make the cinematic composition unconditional, delete the three legacy files, remove their imports, and expose camera pose plus instanced-pool count through the existing development telemetry data attributes.

- [ ] **Step 4: Run focused browser acceptance**

Run: `npx playwright test e2e/happy-path.spec.ts --project=chromium --grep "four acts"`

Expected: PASS with four representative screenshots and stable resource counts.

- [ ] **Step 5: Commit**

```powershell
git add -A src/features/stage e2e/happy-path.spec.ts e2e/app-driver.ts
git commit -m "refactor: replace legacy stage with cinematic performance"
```

---

### Task 8: Full Verification and Documentation

**Files:**
- Modify: `README.md`
- Modify: `docs/assets.md` only if new committed assets exist; otherwise leave unchanged.
- Create: `.superpowers/sdd/2026-08-13-cinematic-code-fracture/final-report.md` (ignored evidence report).

**Interfaces:**
- No new runtime API.

- [ ] **Step 1: Update README**

Document the four cinematic acts, deterministic seek/export behavior, quality-tier differences, lack of free camera controls, and the emissive fallback. Do not claim human MP4 playback or Edge MP4 acceptance unless freshly performed.

- [ ] **Step 2: Run the complete automated suite**

```powershell
npm test
npm run typecheck
npm run build
```

Expected: all commands exit `0`; record exact test counts and the known Vite chunk advisory.

- [ ] **Step 3: Run bounded browser verification**

Run the Chromium four-act/seek acceptance and the existing short 720p WebM smoke only. Record each sampled act, console errors, renderer counts, camera-pose repeatability, and downloaded WebM size. Do not rerun long MP4 acceptance as part of this task.

- [ ] **Step 4: Write the evidence report**

Record commands, exit codes, screenshots/artifact paths, manual observations, changed files, unresolved acceptance gaps, and the final commit hash. State explicitly that human downloaded-file playback and Edge MP4 remain open unless separately verified.

- [ ] **Step 5: Commit tracked documentation**

```powershell
git add README.md docs/assets.md
git commit -m "docs: document cinematic performance"
```

