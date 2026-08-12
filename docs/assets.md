# Committed asset inventory and licenses

All committed music and MIDI files are original project-generated fixtures dedicated under CC0 1.0 Universal. No user-selected file is committed or copied by the application.

| Repository path | Kind and purpose | Source / creator | License | Detailed metadata |
| --- | --- | --- | --- | --- |
| `public/demo/demo.mid` | Built-in eight-note Standard MIDI File for the product demo | Generated in-project by the code-music project contributors on 2026-08-12 with `@tonejs/midi`; no external musical source | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) | [`public/demo/LICENSES.md`](../public/demo/LICENSES.md) |
| `public/demo/demo.ogg` | Built-in stereo Ogg Vorbis audio synchronized to `demo.mid` | Synthesized in-project from the documented pitch/timing table as sine tones, then encoded with FFmpeg 7.1; no sample or third-party recording | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) | [`public/demo/LICENSES.md`](../public/demo/LICENSES.md) |
| `src/test/fixtures/simple.mid` | Deterministic two-note MIDI parser/layout test fixture | Generated specifically for this repository with `@tonejs/midi` 2.0.28; no external musical source | [CC0 1.0 Universal](https://creativecommons.org/publicdomain/zero/1.0/) | [`src/test/fixtures/simple.mid.md`](../src/test/fixtures/simple.mid.md) |

There are no committed font files, 3D models, textures, photographs, icons, or third-party music recordings. The stage geometry, particles, score ribbon, materials, and deterministic grain are generated in code. Typography uses the visitor's installed system fonts (`Inter` when available, then Microsoft YaHei/system fallbacks), so no font binary is redistributed.

Generated Playwright screenshots, traces, videos, and downloads live only in ignored `test-results/` or `playwright-report/` directories and are not project assets.
