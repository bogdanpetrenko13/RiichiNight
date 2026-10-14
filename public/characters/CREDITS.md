# Character art credits

All heroine portraits, expressions and reward scenes are built by
`scripts/import-sutemo-art.py` from two layered sprite sets by **Sutemo**
(itch.io):

| Source | Link | Heroines |
|---|---|---|
| Female Mature Character Sprite for VN (`Anime_Mature_Woman_Free.psd`) | https://sutemo.itch.io/female-mature-anime-sprite | Hikari, Rin, Mai, Reiko |
| Female Character Sprite for Visual Novel (`Female_Sprite_by_Sutemo.psd`) | https://sutemo.itch.io/female-character | Yuzu, Nanami |

Each heroine is a different combination of the sprite's layers (hairstyle,
hair colour, outfit, accessories, expressions), composited over generated
backgrounds. Only adult outfits are used.

The author's terms allow use in personal and commercial projects; the sprite
itself may not be resold on its own (including as a character creator). This
game is free and non-commercial. The source PSDs are not stored in the
repository: to rebuild the art, download them from the links above and run

```
python scripts/import-sutemo-art.py Anime_Mature_Woman_Free.psd Female_Sprite_by_Sutemo.psd
```

Replace any file with your own art of the same name to swap a heroine's look.
