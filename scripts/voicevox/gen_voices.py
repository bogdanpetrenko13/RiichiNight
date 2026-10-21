"""Heroine call voices with VOICEVOX (free Japanese TTS, https://voicevox.hiroshiba.jp).

On Windows without Python use gen_voices.ps1 (1_samples.bat, 2_calls.bat).

Runs on the PC where the VOICEVOX app is open (its engine listens on
http://127.0.0.1:50021). Python 3 standard library only, so any Python works,
e.g. the one that comes with ComfyUI.

1. Samples of every voice, to choose one per heroine:

       python gen_voices.py samples OUT_DIR

   writes OUT_DIR/<speaker>_<style>_<id>.wav saying "リーチ！ ロン！" for every
   voice and style, plus OUT_DIR/speakers.txt (id, speaker, style).

2. The calls for every heroine, with the voices picked in voices.json
   (heroine id -> {"style": <style id>, "speed": 1.0, "pitch": 0.0,
   "intonation": 1.0}):

       python gen_voices.py calls voices.json OUT_DIR

   writes OUT_DIR/<heroine>/<riichi|pon|chi|kan|ron|tsumo>.wav. Send that
   folder back; the import converts it to MP3 under public/voice/ and adds the
   credits ("VOICEVOX:<name>") that each voice's terms require.

Every voice has its own terms (shown in the VOICEVOX app): all allow free
games with the credit; none allow adult content.
"""

import json
import os
import re
import sys
import urllib.parse
import urllib.request

ENGINE = os.environ.get("VOICEVOX_URL", "http://127.0.0.1:50021")

# What each call says, in Japanese (the table language of riichi).
CALLS = {
    "riichi": "リーチ！",
    "pon": "ポン！",
    "chi": "チー！",
    "kan": "カン！",
    "ron": "ロン！",
    "tsumo": "ツモ！",
}
SAMPLE = "リーチ！ ロン！"


def _get(path):
    with urllib.request.urlopen(ENGINE + path, timeout=30) as r:
        return json.loads(r.read().decode("utf-8"))


def _post(path, params, body=None):
    url = ENGINE + path + "?" + urllib.parse.urlencode(params)
    data = json.dumps(body).encode("utf-8") if body is not None else b""
    req = urllib.request.Request(url, data=data, method="POST", headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def synth(text, style, speed=1.0, pitch=0.0, intonation=1.0, volume=1.0):
    query = json.loads(_post("/audio_query", {"text": text, "speaker": style}).decode("utf-8"))
    query.update(
        speedScale=speed,
        pitchScale=pitch,
        intonationScale=intonation,
        volumeScale=volume,
        prePhonemeLength=0.05,
        postPhonemeLength=0.1,
    )
    return _post("/synthesis", {"speaker": style}, query)


def _safe(name):
    return re.sub(r'[\\/:*?"<>|\s]+', "_", name)


def samples(out):
    os.makedirs(out, exist_ok=True)
    rows = []
    for sp in _get("/speakers"):
        for st in sp["styles"]:
            sid = st["id"]
            rows.append(f'{sid}\t{sp["name"]}\t{st["name"]}')
            path = os.path.join(out, f'{_safe(sp["name"])}_{_safe(st["name"])}_{sid}.wav')
            if not os.path.exists(path):
                with open(path, "wb") as f:
                    f.write(synth(SAMPLE, sid))
            print("sample", sid, sp["name"], st["name"])
    with open(os.path.join(out, "speakers.txt"), "w", encoding="utf-8") as f:
        f.write("\n".join(rows) + "\n")


def calls(mapping_file, out):
    with open(mapping_file, encoding="utf-8") as f:
        mapping = json.load(f)
    names = {st["id"]: f'{sp["name"]}（{st["name"]}）' for sp in _get("/speakers") for st in sp["styles"]}
    credits = {}
    for heroine, v in mapping.items():
        style = int(v["style"])
        folder = os.path.join(out, heroine)
        os.makedirs(folder, exist_ok=True)
        for kind, text in CALLS.items():
            wav = synth(text, style, v.get("speed", 1.0), v.get("pitch", 0.0), v.get("intonation", 1.0), v.get("volume", 1.0))
            with open(os.path.join(folder, kind + ".wav"), "wb") as f:
                f.write(wav)
        credits[heroine] = names.get(style, str(style))
        print("calls", heroine, credits[heroine])
    with open(os.path.join(out, "credits.json"), "w", encoding="utf-8") as f:
        json.dump(credits, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    if len(sys.argv) >= 3 and sys.argv[1] == "samples":
        samples(sys.argv[2])
    elif len(sys.argv) >= 4 and sys.argv[1] == "calls":
        calls(sys.argv[2], sys.argv[3])
    else:
        print(__doc__)
        sys.exit(2)
