# Music

Looping background tracks, picked up by name (missing files are skipped):

```
title.mp3   title and menus   "Joey's Formal Waltz - Unscented"
table.mp3   during a match    "Vibing Over Venus"
```

Both by Kevin MacLeod (incompetech.com), licensed under Creative Commons:
By Attribution 4.0 (https://creativecommons.org/licenses/by/4.0/). The
credit is shown in Settings → About (`creditsMusic` in src/i18n/strings.ts);
keep it when replacing or adding tracks.

Prepared from the originals with ffmpeg: silence trimmed, loudness
normalised to -20 LUFS (under the effects and voices), 1.5 s fade-in and 3 s
fade-out so the loop joins softly, 96 kbps stereo.
