# Cinematic Code Fracture Redesign

## Goal

Replace the current technical-demo-like stage with a directed cyberpunk performance in which a monumental code wall fractures, its shards assemble into readable musical notation, and the camera flies through the resulting score. The result must feel cinematic while preserving deterministic seeking and export.

## Creative Direction

Use a blockbuster-level intensity: one dominant fracture event, persistent but controlled shard motion, and a directed score-flight finale. Keep deep black as the dominant field. Cyan and magenta are accents reserved for cracks, shard edges, active notes, and musical impacts rather than uniform full-screen neon.

The stage must use depth, negative space, fog, restrained distant data rain, and sparse dust. White flashes are brief and limited to major impacts. The score must remain readable through the visual effects.

## Four-Act Performance

### Act 1: Code Monolith

A full-frame code wall occupies the visual field. Its foreground code is readable while deeper layers soften into fog. The camera slowly approaches with a subtle lateral drift. Low-frequency musical energy drives breathing light and branching cracks. The crack system accumulates tension without releasing fragments early.

For tracks of at least 20 seconds, the principal fracture occurs at 12% of the score duration, preserving the existing act-boundary rule. Shorter-track boundary rules remain unchanged.

### Act 2: Impact Fracture

At the act boundary, the wall releases in one primary explosion. Near shards cross the camera rapidly, middle-distance shards expose their code-textured glass and metal surfaces, and distant shards establish scale. Strong notes can emit smaller impulses, but must not repeat the primary explosion.

The event uses a short camera push, a bounded impact shake, a restrained white flash, a volumetric light burst, and a propagating shock ring. Continuous shaking and uncontrolled strobing are prohibited.

### Act 3: Score Reassembly

The existing deterministic shard pool is pulled into musical structures. Shard edges become staff lines, bar lines, note heads, stems, beams, and ties. The camera performs an approximately 120-degree orbit while the score becomes legible. The transition must visually preserve shard identity so it reads as transformation rather than a scene replacement.

### Act 4: Score Flight

The camera enters a score tunnel at a stable forward speed. Upcoming notes emerge from depth, active notes reach a high-energy holographic state, and performed notes dissolve gradually. Strong beats emit restrained circular impulses and brief depth-of-field changes. The score remains the focal subject.

## Directed Camera

The stage does not expose free camera dragging during a performance. `DirectorCamera` derives camera position, target, field of view, impact shake, and focus distance from absolute logical music time. Preview, seek, replay, and export therefore produce the same shot sequence.

Camera shake is a time-bounded deterministic envelope triggered by musical impacts, not accumulated mutable noise. Seeking directly into or out of an impact reconstructs the correct pose immediately.

## Rendering Components

- `CodeMonolith` owns layered code surfaces, scan glitches, crack growth, and pre-fracture illumination.
- `CinematicFracture` owns the fixed-capacity shard pool, deterministic trajectories, motion trails, and shock rings.
- `ScoreReassembly` maps the same shard identities into staff and notation targets and renders complete score glyphs.
- `DirectorCamera` calculates the full directed camera state from logical time and performance data.
- `CinematicLighting` coordinates volumetric illumination, bloom, fog, impact flashes, and quality-tier reductions.

The components consume immutable score data plus the existing absolute-time `PerformanceFrame`. They do not own playback time and do not append scene objects during playback.

## Musical Reactivity

Musical inputs are derived offline from MIDI notes:

- low-register and high-velocity notes influence monolith breathing and crack energy;
- act boundaries own the primary narrative transitions;
- velocity-qualified note clusters create secondary impulses and score-flight shock rings;
- active notes drive notation energy without changing the transport clock.

No audio-frequency analyser is required for deterministic V1 behavior. MIDI-derived impacts ensure the same frames in preview and export.

## Quality Tiers

High quality uses the full fixed shard population, longer trails, volumetric light sampling, and denser atmospheric particles. Low quality reduces shard count, trail samples, volumetric sampling, and distant decoration. It must preserve the same acts, camera choreography, active notes, and principal fracture timing.

## Error and Lifecycle Rules

All GPU resources must be declaratively owned or explicitly disposed. Scene object, geometry, texture, and instanced-pool counts must remain stable across replay and seeking. Invalid or replacement media continues to deinitialize the stage through the existing readiness gate.

If optional lighting effects are unavailable, the performance falls back to emissive materials and fog without blocking playback. A low-quality fallback may activate after sustained slow frames, using the existing quality control behavior.

## Verification

Automated tests must cover:

- exact act-boundary camera and choreography states;
- deterministic frame equality before and after arbitrary seeks;
- a fixed shard population with no object growth;
- the same logical-time behavior in preview and export;
- quality reduction that preserves narrative timing and active notes.

Real Chromium verification must capture representative frames from all four acts, exercise backward and forward seeking, confirm stable renderer resource counts, and record console errors. Performance checks use the existing documented reference workflow. Export smoke coverage remains bounded; long MP4 and human playback acceptance remain separate manual checks.

## Scope

This redesign changes the Three.js performance, camera direction, lighting, and related tests. It does not add a keyframe editor, free-flight camera, audio transcription, new export formats, cloud services, or mobile support.
