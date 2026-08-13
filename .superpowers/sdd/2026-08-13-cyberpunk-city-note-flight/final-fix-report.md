# Cyberpunk City Note Flight: Final Fix Report

## Outcome

- Added a deterministic shared narrative anchor so ACT01 code, ACT02 fracture, and ACT03 assembly remain in front of the moving camera at the real demo seek times.
- Added semantic camera-frustum telemetry and Chromium assertions for the named monolith and fracture scene objects.
- Rendered active/velocity note energy through cyan/magenta glow pools and limited trails to currently sounding notes with a 2.2-unit maximum.
- Extended key lights and atmospheric particles along the full 232.968-second city corridor, and increased real facade-light geometry.
- Updated README and demo license wording to disclose the source-marked AI-generated vocal and replaced obsolete staff wording with flying-note wording.

## TDD evidence

RED evidence included missing `DirectorState.narrative`, missing world shard transforms, missing note render styles/batches, missing corridor atmosphere, inadequate facade area, and absent semantic E2E telemetry. Each failed for the intended missing behavior before its corresponding implementation was added. Focused GREEN covered director, fracture, note flight, city layout/atmosphere, lighting, and stage integration.

## Final evidence

- Unit/component tests: 23 files, 135 tests passed.
- TypeScript: `tsc --noEmit` passed.
- Production build: passed; existing Vite large-entry advisory remains.
- Chromium: four named acts, semantic wall/fracture visibility, active note trails, camera angle, and five backward/forward seek cycles passed.
- Screenshot audit (dark/cyan/magenta): boot `60.846/9.501/4.132`; fracture `93.383/5.004/0.187`; assemble `77.997/7.281/0.560`; perform `87.814/4.163/0.473`.
- Licensed built-in 720p WebM: passed; exactly one `V_VP9` and one `A_OPUS` codec ID. MP4 was not run.

## Remaining advisories

- The production entry chunk remains above Vite's advisory 500 kB threshold.
- The stage unit test still emits the pre-existing multiple-Three.js-instance warning without failing.
- The 75/15/10 palette target is treated as an approximate visible hierarchy; exact raw pixel percentages vary substantially by act, especially during the black-dominant fracture shot.
