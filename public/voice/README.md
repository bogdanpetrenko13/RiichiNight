# Voice lines

```
<id>/riichi.mp3  pon.mp3  chi.mp3  kan.mp3  ron.mp3  tsumo.mp3
player/…          the human player's calls + yaku_<clip>.mp3 (T-Studio pack, see ../audio/sfx/README.md)
```

`<id>` is a character id from `src/game/characters.ts`. Short clips (< 1.5 s),
mono, 44.1 kHz, trimmed silence, peak −1 dBFS, 64 kbps. Missing files are
skipped silently.

The heroines' calls are generated with VOICEVOX by
`scripts/voicevox/gen_voices.ps1 calls` (or `gen_voices.py`) from a
`voices.json` that picks a style per heroine; see `CREDITS.md` for the voices
and the credit lines the voice libraries require (also shown in
Settings → About).
