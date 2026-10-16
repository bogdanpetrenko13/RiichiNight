# Character art credits

All heroine portraits and expressions are AI-generated on the author's own PC
with [ComfyUI](https://github.com/comfyanonymous/ComfyUI) and the
**Animagine XL 4.0** model by Cagliostro Research Lab
(https://huggingface.co/cagliostrolab/animagine-xl-4.0,
CreativeML Open RAIL++-M, which allows use of the generated images). No
third-party artwork was used as input; Tsukiko's base portrait was supplied
by the game's author.

Every heroine is an adult (23–36) and is drawn as one.

How the files are made:

1. A base portrait per heroine (832×1216) from a text prompt: her age, job,
   hair and eye colour, outfit.
2. `scripts/comfy/gen_emotions.py` (run with ComfyUI's Python) re-draws the
   chosen portrait for each table expression — neutral, happy, troubled —
   with img2img plus IP-Adapter Plus SDXL (h94/IP-Adapter, Apache-2.0), so
   the face, pose and outfit stay the same.
3. `scripts/import-heroine-art.py <base-dir> <emotions-dir> --pick id:emotion:N ...`
   matches each render's colours to the base portrait, cuts the face crop and
   writes `<id>/portrait.webp` and `<id>/emotions/<emotion>.webp` (512 px).

Replace any file with your own art of the same name to swap a heroine's look.
