# Task 5 Report: Integration, Visual Acceptance, and Export Regression

## Status

Complete. The production stage now exposes a stable composition contract for one city layer, one note-flight layer, one director camera, and one effects stack. Low preview selects reduced city/note density while export keeps high density. The city and notes receive the score duration and choreography seed.

## RED / GREEN

- RED: `HologramStage.test.tsx` failed with `stageComposition is not a function`.
- GREEN: added `stageComposition`, wired duration/seed/quality/window selection, and passed the focused stage test.
- RED: Chromium acceptance failed because semantic city/note telemetry was absent.
- GREEN: named the scene layers, traversed the complete scene for stable instanced-pool counts, and passed camera/layer/pool assertions plus five backward/forward seek cycles.
- RED: screenshot inspection showed outward-facing/occluded neon strips and dominant staff-guide planes. New city-layout tests failed on canyon/forward-facing facade placement.
- GREEN: moved the neon strips to visible facades, widened them, removed the competing staff guides, and passed focused and browser checks.

## Verification

- `npm test`: 22 files, 122 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed (Vite only reports the existing large-entry-chunk warning).
- `npx playwright test e2e/happy-path.spec.ts --project=chromium --grep "built-in demo plays"`: passed in 45.5s after the final visual changes.
- Four absolute seek screenshots: nonzero draw calls, no page errors, one city layer, one note-flight layer, stable camera/resource/pool telemetry over five seek cycles.
- `npx playwright test e2e/export.spec.ts --project=chromium --grep "short local fixture"`: passed; saved a 191,687-byte 720p WebM.
- WebM EBML codec-ID scan: exactly one `V_VP9` and one `A_OPUS`, evidencing one video and one audio track. MP4 was not run.

## Screenshot paths and visual observations

Directory: `test-results/happy-path-built-in-demo-p-1e931--act-after-an-absolute-seek-chromium/`

- `act-boot.png`: near-black city canyon dominates; restrained cyan fog/particles; no shake/grain artifact.
- `act-fracture.png`: city remains continuous and stable; black mass stays dominant.
- `act-assemble.png`: cyan note bodies/trails appear inside the central building corridor; full-length staff geometry is absent.
- `act-perform.png`: stable elevated lateral camera, city still present deep into the 232.9s demo, notes visibly traverse between buildings; cyan remains primary and magenta sparse.

## WebM evidence

- Test artifact before the screenshot rerun: `test-results/export-exports-the-short-l-f86dc-p-WebM-and-restores-preview-chromium/export-720p.webm`.
- Preserved copy: `%TEMP%/code-music-task5-export-720p.webm`.
- Size: 191,687 bytes.
- Codec IDs: one VP9 video (`V_VP9`), one Opus audio (`A_OPUS`).

## Files changed

- `src/features/stage/HologramStage.tsx`
- `src/features/stage/HologramStage.test.tsx`
- `src/features/stage/CinematicLighting.tsx`
- `src/features/stage/ScoreReassembly.tsx`
- `src/features/stage/cityLayout.ts`
- `src/features/stage/cityLayout.test.ts`
- `e2e/happy-path.spec.ts`
- `e2e/app-driver.ts`
- `e2e/export.spec.ts`

## Concerns

- Magenta is intentionally sparse and can be subtle in deterministic screenshots; it remains present as the accent tier rather than competing with cyan notes.
- The production entry chunk remains above Vite's advisory 500 kB warning; FFmpeg remains deferred and this task did not alter that architecture.
- Vitest emits the pre-existing `Multiple instances of Three.js` warning in the stage test; it does not fail tests or production rendering.

## Commit

`feat: integrate cyberpunk city music flight`

## Fix Round 1

All Important review findings were addressed in one TDD wave.

- RED: the stage composition contract returned unused camera/effects and note duration/seed fields; facade accents were too thin/far outside the canyon view; owned city/note pool telemetry was absent; the first ACT04 sample measured only 16.78 degrees yaw; and the first bounded built-in export did not stop because the capture element used a blob URL.
- GREEN: `stageComposition` now contains only JSX-consumed city props and the note window; `CinematicLighting` consumes density/duration/quality/seed directly; telemetry counts instanced pools below the named city and note component boundaries; ACT04 acceptance seeks into the settled follow shot and measures horizontal yaw in the required 27–33 degree band.
- City root cause: the single vertex-colored strip pool did not make its instance colors visible in screenshots and random setbacks put most accents outside the view. Cyan and magenta facade strips now use separate fixed-color instanced materials, remain attached to forward/inner facades, and building inner edges remain within 4.5–6.3 world units of the corridor.
- Licensed export: the test uses `loadBuiltInDemo` and the committed `xintiaodeshengyin.mp3` / `.mid` pair through the normal UI. Its capture audio `ended` event is bounded at four seconds in the test environment. Final artifact: 81,534 bytes, exactly one `V_VP9` and one `A_OPUS` codec ID. MP4 was not run.

Final screenshot pixel audit samples every second pixel and classifies dark as max RGB <45, cyan as G>85/B>80 with cyan channel ratios, and magenta as R>115/B>55 with magenta channel ratios:

| Act | Dark | Cyan | Magenta | Sampled magenta pixels |
| --- | ---: | ---: | ---: | ---: |
| assemble | 91.676% | 2.858% | 0.112% | 139 |
| boot | 86.418% | 2.769% | 1.490% | 1,853 |
| fracture | 89.456% | 2.339% | 0.683% | 849 |
| perform | 95.149% | 1.467% | 0.165% | 205 |

The pixels come from actual city facade instanced meshes, not the HUD, border, or a full-screen overlay. Visual inspection confirms black mass remains dominant, cyan building strips are clear in every act, magenta accents are nonzero in every act, and notes remain readable in ACT03/04.

Final fresh verification after the fixes:

- `npm test`: 22 files, 123 tests passed.
- `npm run typecheck`: passed.
- `npm run build`: passed with the existing advisory chunk-size warning.
- Licensed built-in bounded 720p WebM Chromium test: passed in 24.2s.
- Production Chromium four-act / five-seek acceptance: passed in 45.5s; screenshots inspected and audited above.

## Final-fix wave

The full-song camera/content mismatch was corrected with one absolute-time narrative anchor shared by the code wall and fracture field. Pure tests cover the real 232.968-second demo at the boot, fracture, and assemble screenshot times; wall/shard positions remain ahead of the camera and inside its target window. Chromium telemetry now tests the named `code-monolith` and `cinematic-fracture` scene bounds against the camera frustum, rather than accepting generic instance-pool counts.

Note flight now derives render brightness and cyan/magenta identity from active state and velocity, renders fixed-capacity active cyan/magenta glow pools, and emits bounded trails only for currently sounding notes. Sustained-note capacity remains backed by `maximumWindowDemand`.

City atmosphere now follows the absolute-time corridor through the entire song: three key lights and a deterministic local particle field travel with the camera, while larger physical facade accents keep cyan/magenta visible without a HUD or full-screen color overlay. Final sampled dark/cyan/magenta percentages were boot `60.846/9.501/4.132`, fracture `93.383/5.004/0.187`, assemble `77.997/7.281/0.560`, and perform `87.814/4.163/0.473`. These are compositional audit indicators, not exact quotas; visual inspection confirmed black-dominant city mass, visible cyan lighting, magenta accents, wall/fracture continuity, and note heads/stems between buildings.

Final verification: `npm test` passed 23 files / 135 tests; `npm run typecheck` and `npm run build` passed; production Chromium four-act acceptance plus five repeated seek cycles passed; the licensed built-in 720p WebM export passed with one VP9 video and one Opus audio codec ID. MP4 was not run.
