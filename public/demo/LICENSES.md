# Demo asset source and license metadata

## Built-in demo: 贝多芬《致爱丽丝》

`fur-elise.mid` is the Mutopia Project edition of Ludwig van Beethoven's *Für Elise*, WoO 59. The composition, source edition, and Mutopia typesetting are marked Public Domain on the source page.

- Source: https://www.mutopiaproject.org/cgibin/piece-info.cgi?id=931
- Direct MIDI: https://www.mutopiaproject.org/ftp/BeethovenLv/WoO59/fur_Elise_WoO59/fur_Elise_WoO59.mid
- Maintainer/typesetter: Stelios Samelis
- License: Public Domain
- Local file: `fur-elise.mid`

`fur-elise.wav` is a project-generated mono PCM rendering of that exact MIDI. It uses additive synthesis only: no recording, piano sample, soundfont, or other third-party audio is embedded. Run `npm run demo:render` to reproduce it from `fur-elise.mid`.

- Creator: code-music project contributors
- Source: exact timing and pitches from local `fur-elise.mid`
- License: CC0 1.0 Universal
- Modification: synthesized at 22,050 Hz with a deterministic four-harmonic piano-like envelope
- Local file: `fur-elise.wav`

The original four-second `demo.mid` / `demo.ogg` project-created CC0 pair remains only as a compact export-test fixture; it is no longer offered as the built-in product demo.
