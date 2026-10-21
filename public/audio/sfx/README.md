# Table sound recordings

From the "Free Sound Mahjong Sound Pack" (2026-02-24) by T-Studio,
https://t-studio-tst.itch.io/free-sound-mahjong-sound-pack — free, commercial
use allowed; credit: みんなの創作支援サイトＴスタ (shown in Settings → About).
Trimmed, peak-normalised, mono mp3.

| File | Source | Played on |
|---|---|---|
| `tile1–4.mp3` | `mahjong_tile_1–4` | discard (wooden table); a meld is two of them |
| `tile1–4-felt.mp3` | same, low-passed at 3.2 kHz | discard / meld on the felt table |
| `stick1–3.mp3` | `riich_bets_1–3` | riichi stick put down |
| `collect1–4.mp3` | `take_the_riich_bets_1–4` | the winner collects riichi sticks |
| `dice1–3.mp3` | `roll_two_dice_1–3` | start of every hand |
| `shuffle.mp3` | `shuffle_the_mahjong_tiles`, first 3 s | first hand of a match |

The same pack's voice (`riichi`, `pung`, `chow`, `kong`, `ron`, `draw` = tsumo,
and six yaku names) is the player's voice in `public/voice/player/`.
`src/game/sfx.ts` picks a random variant per play and falls back to the
synthesised sound when a file is missing.
