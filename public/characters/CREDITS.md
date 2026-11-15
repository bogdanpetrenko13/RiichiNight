# Character art credits

Current portraits use the author's supplied Elegant Anime concepts. Expression
variants and the approved revised Rin pose were created with OpenAI's built-in
image generation tool. All characters are adults (23–36).

Each character has three 512×512 lossless WebP expressions: neutral, happy and
troubled (sad). portrait.webp is a byte-identical copy of neutral.webp.
Generated facial features were composited through individual grayscale masks;
pixels outside those masks match the resized source exactly.

scripts/compose-emotion.py performs masked composition and verifies lossless
WebP decoding. scripts/import-heroine-art.py retains the legacy importer and
adds --square --output for staging square images without colour transfer.

Earlier art used ComfyUI and Animagine XL 4.0 (CreativeML Open RAIL++-M).
It remains recoverable from Git history. The local pre-replacement backup is
.preview/characters-before-elegant-anime.zip.
