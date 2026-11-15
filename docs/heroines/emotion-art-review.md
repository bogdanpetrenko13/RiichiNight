# Elegant Anime character art

Integrated 12 approved character designs with neutral, happy and sad (troubled)
expressions, 512x512 lossless WebP. Rin uses the revised three-quarter pose
approved on 2026-11-16. Existing runtime paths and progression are unchanged.

The previous images are preserved in Git history and the local backup
.preview/characters-before-elegant-anime.zip.

Image generation used supplied concepts with instructions to change only eyes,
brows and mouth while retaining identity, pose, hair, clothes and background.
Feature-mask composition preserves source pixels outside the mask. Masks need
visual review around hair and glasses. The compositor verifies lossless output.

Local review: .preview/all-emotions-review-v2.jpg.
Local archive: .preview/RiichiNight_36_Emotions_512_WebP_v2.zip.
Preparation: .preview/prepare-art.py followed by .preview/update-rin-v2.py.

The legacy ComfyUI generator remains available but is not the source of this
new set. The square import mode requires an explicit output directory.
