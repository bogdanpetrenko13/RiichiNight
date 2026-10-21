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
