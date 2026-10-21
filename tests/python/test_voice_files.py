"""Every heroine has her six call voices and a credit line for the voice."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
KINDS = ("riichi", "pon", "chi", "kan", "ron", "tsumo")


def heroine_ids():
    src = (ROOT / "src/game/characters.ts").read_text(encoding="utf-8")
    return re.findall(r'^\s*id: "([a-z]+)",', src, re.M)


def test_every_heroine_has_all_calls():
    ids = heroine_ids()
    assert len(ids) == 12
    for h in ids:
        for k in KINDS:
            f = ROOT / "public/voice" / h / f"{k}.mp3"
            assert f.is_file() and 2000 < f.stat().st_size < 60000, f


def test_voice_credits_cover_every_heroine():
    voices = json.loads((ROOT / "scripts/voicevox/voices.json").read_text(encoding="utf-8"))
    assert sorted(voices) == sorted(heroine_ids())
    credits = (ROOT / "public/voice/CREDITS.md").read_text(encoding="utf-8")
    strings = (ROOT / "src/i18n/strings.ts").read_text(encoding="utf-8")
    for line in re.findall(r"\| (VOICEVOX:[^|]+?) \|", credits):
        assert strings.count(line) == 2, line  # en + ru


def test_player_voice_and_recorded_table_sounds():
    for name in KINDS + ("yaku_tanyao", "yaku_pinfu", "yaku_chiitoitsu", "yaku_ittsu", "yaku_double_riichi", "yaku_yakuhai"):
        assert (ROOT / "public/voice/player" / f"{name}.mp3").is_file(), name
    sfx_src = (ROOT / "src/game/sfx.ts").read_text(encoding="utf-8")
    files = [f"tile{i}{s}" for i in range(1, 5) for s in ("", "-felt")]
    files += [f"stick{i}" for i in range(1, 4)] + [f"dice{i}" for i in range(1, 4)]
    files += [f"collect{i}" for i in range(1, 5)] + ["shuffle"]
    for f in files:
        assert (ROOT / "public/audio/sfx" / f"{f}.mp3").is_file(), f
    assert "audio/sfx/" in sfx_src
    for clip in ("tanyao", "pinfu", "chiitoitsu", "ittsu", "double_riichi"):
        assert f'{clip}: "{clip}"' in (ROOT / "src/game/useGameController.ts").read_text(encoding="utf-8")
