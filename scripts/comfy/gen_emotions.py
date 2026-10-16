"""Queue emotion variants for the Riichi Night heroines in a local ComfyUI.

Run with ComfyUI's own Python (the Desktop terminal):
    python $HOME\\Downloads\\RiichiNight\\gen_emotions.py [variants] [heroine ...]

Each heroine's chosen portrait (heroines\\base\\NN_id.png next to this file)
is copied into ComfyUI's input folder and re-drawn with img2img + IP-Adapter
(same face, pose and outfit) for every emotion. Results:
ComfyUI-Shared\\output\\rn_emo\\NN_id_<emotion>_*.png
"""
import json, os, random, shutil, sys, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
SHARED = os.path.join(os.environ["LOCALAPPDATA"], "Comfy-Desktop", "ComfyUI-Shared")
CKPT = "animagine-xl-4.0.safetensors"
WEIGHT = float(os.environ.get("RN_WEIGHT", "0.45"))
DENOISE = float(os.environ.get("RN_DENOISE", "0.5"))

HEROINES = {
    "01_hikari": "23 years old, barista, honey blonde hair, short bob, hairband, amber eyes, black apron, white shirt",
    "02_nanami": "25 years old, illustrator, chestnut brown hair, long wavy hair, green eyes, beret, oversized knit sweater",
    "03_yuzu": "24 years old, streamer, silver lilac hair, purple eyes, hoodie, headphones around neck",
    "04_rin": "27 years old, accountant, black hair, short bob, blunt bangs, dark grey eyes, glasses, black turtleneck",
    "05_mai": "31 years old, mahjong parlor owner, pink hair, long curly hair, rose hair ornament, red eyes, high-neck dress",
    "06_reiko": "33 years old, project manager, navy blue hair, long straight hair, light blue eyes, dark business suit, id badge on lanyard",
    "07_kaede": "26 years old, motorcycle courier, red hair, ponytail, orange eyes, black leather jacket",
    "08_sora": "28 years old, flight attendant, light blue hair, short hair, aqua eyes, flight attendant uniform, neck scarf",
    "09_akane": "29 years old, chef, red hair, hair bun, red eyes, white chef coat",
    "10_midori": "30 years old, librarian, mint green hair, single braid over shoulder, yellow-green eyes, beige cardigan, glasses",
    "11_yuki": "32 years old, surgeon, white hair, long hair, pale pink eyes, white lab coat, scrubs, stethoscope around neck",
    "12_tsukiko": "36 years old, purple hair, very long hair, golden eyes, earrings, white and purple kimono",
}
EMOTIONS = {
    "neutral": "calm expression, closed mouth, light smile",
    "happy": "happy, joyful, laughing, open mouth, big smile, sparkling eyes",
    "troubled": "troubled, worried, frown, furrowed brows, nervous, sweatdrop, closed mouth",
}
NEG = ("lowres, bad anatomy, bad hands, extra digits, fewer digits, cropped, worst quality, low quality, "
       "low score, bad score, average score, jpeg artifacts, signature, watermark, username, text, blurry, "
       "child, loli, cleavage, nsfw")


def server():
    for port in (8000, 8188):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/system_stats", timeout=3)
            return f"http://127.0.0.1:{port}"
        except Exception:
            pass
    sys.exit("ComfyUI server not found on 8000 / 8188")


def graph(image, desc, emotion, variants, prefix):
    pos = (f"1girl, solo, mature female, adult woman, {desc}, {EMOTIONS[emotion]}, looking at viewer, "
           "upper body, anime screencap, vibrant colors, masterpiece, high score, great score, absurdres")
    return {
        "1": {"class_type": "CheckpointLoaderSimple", "inputs": {"ckpt_name": CKPT}},
        "2": {"class_type": "LoadImage", "inputs": {"image": image}},
        "3": {"class_type": "IPAdapterUnifiedLoader",
              "inputs": {"model": ["1", 0], "preset": "PLUS (high strength)"}},
        "4": {"class_type": "IPAdapter",
              "inputs": {"model": ["3", 0], "ipadapter": ["3", 1], "image": ["2", 0], "weight": WEIGHT,
                         "start_at": 0.0, "end_at": 1.0, "weight_type": "standard"}},
        "5": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": pos}},
        "6": {"class_type": "CLIPTextEncode", "inputs": {"clip": ["1", 1], "text": NEG}},
        "7": {"class_type": "VAEEncode", "inputs": {"pixels": ["2", 0], "vae": ["1", 2]}},
        "8": {"class_type": "RepeatLatentBatch", "inputs": {"samples": ["7", 0], "amount": variants}},
        "9": {"class_type": "KSampler",
              "inputs": {"model": ["4", 0], "seed": random.randrange(2**48), "steps": 28, "cfg": 5.0,
                         "sampler_name": "euler_ancestral", "scheduler": "normal",
                         "positive": ["5", 0], "negative": ["6", 0], "latent_image": ["8", 0],
                         "denoise": DENOISE}},
        "10": {"class_type": "VAEDecode", "inputs": {"samples": ["9", 0], "vae": ["1", 2]}},
        "11": {"class_type": "SaveImage", "inputs": {"images": ["10", 0], "filename_prefix": prefix}},
    }


def main():
    variants = int(sys.argv[1]) if len(sys.argv) > 1 else 2
    only = sys.argv[2:]
    url = server()
    dst = os.path.join(SHARED, "input", "rn_base")
    os.makedirs(dst, exist_ok=True)
    n = 0
    for hid, desc in HEROINES.items():
        if only and not any(o in hid for o in only):
            continue
        src = os.path.join(HERE, "heroines", "base", hid + ".png")
        if not os.path.exists(src):
            print("missing", src)
            continue
        shutil.copy(src, os.path.join(dst, hid + ".png"))
        for emo in EMOTIONS:
            body = json.dumps({"prompt": graph(f"rn_base/{hid}.png", desc, emo, variants,
                                               f"{os.environ.get('RN_OUT', 'rn_emo')}/{hid}_{emo}")}).encode()
            req = urllib.request.Request(url + "/prompt", body, {"Content-Type": "application/json"})
            try:
                urllib.request.urlopen(req).read()
            except urllib.error.HTTPError as e:
                sys.exit(f"{hid} {emo}: {e.code} {e.read().decode()[:800]}")
            n += 1
    print(f"queued {n} jobs x {variants} images on {url}")


if __name__ == "__main__":
    main()
