"""Exports a Mortal v4 checkpoint to a flat little-endian float32 file.

    python export_weights.py s42-inference.pth out/s42

writes out/s42.bin (all tensors back to back) and out/s42.json (name, shape,
offset in floats, for each tensor in state-dict order). Runs in the
"Mortal kit" workflow, where PyTorch is available.
"""

import json
import sys

import numpy as np
import torch

src, dst = sys.argv[1], sys.argv[2]
state = torch.load(src, map_location="cpu", weights_only=True)
index = []
offset = 0
with open(dst + ".bin", "wb") as f:
    for part in ("mortal", "current_dqn"):
        for name, t in state[part].items():
            if not t.is_floating_point():
                continue  # num_batches_tracked
            a = t.detach().to(torch.float32).contiguous().numpy().astype("<f4")
            f.write(a.tobytes())
            index.append({"name": f"{part}.{name}", "shape": list(a.shape), "offset": offset})
            offset += a.size
json.dump({"floats": offset, "tensors": index}, open(dst + ".json", "w"), indent=1)
print(f"{len(index)} tensors, {offset} floats")
