"""Reference data for the in-app Mortal port (runs in the "Mortal kit" workflow).

1. Self-play: four Mortal S42 seats play a few hanchan (libriichi arena), the
   mjai logs are kept.
2. For a sample of decisions in those logs (every seat's view): the observation
   and mask from libriichi's encoder and the Q-values from the PyTorch model.

    python make_reference.py <Mortal>/mortal <weights.pth> <out dir>

out/selfplay/*.json.gz and out/reference.npz (obs float32, mask bool, q
float32, where: "log line seat").
"""

import glob
import gzip
import json
import os
import random
import sys

mortal_dir, weights, out = sys.argv[1:4]
sys.path.insert(0, mortal_dir)

import numpy as np  # noqa: E402
import torch  # noqa: E402
from engine import MortalEngine  # noqa: E402
from libriichi.arena import OneVsThree  # noqa: E402
from libriichi.state import PlayerState  # noqa: E402
from model import DQN, Brain  # noqa: E402

state = torch.load(weights, map_location="cpu", weights_only=True)
brain = Brain(version=4, conv_channels=192, num_blocks=40).eval()
dqn = DQN(version=4).eval()
brain.load_state_dict(state["mortal"], strict=True)
dqn.load_state_dict(state["current_dqn"], strict=True)
engine = MortalEngine(brain, dqn, is_oracle=False, version=4, enable_quick_eval=False,
                      enable_rule_based_agari_guard=True, name="S42")

logs = os.path.join(out, "selfplay")
os.makedirs(logs, exist_ok=True)
games = int(os.environ.get("GAMES", "1"))
ranks = OneVsThree(disable_progress_bar=True, log_dir=logs).py_vs_py(engine, engine, (2026, 1016), games)
print("self-play rankings", ranks)

rng = random.Random(1)
obs_l, mask_l, q_l, where = [], [], [], []
limit = int(os.environ.get("SAMPLES", "600"))
for path in sorted(glob.glob(os.path.join(logs, "*.json.gz"))):
    events = gzip.open(path, "rt").read().splitlines()
    states = [PlayerState(i) for i in range(4)]
    for line, ev in enumerate(events):
        data = json.loads(ev)
        for seat, st in enumerate(states):
            cans = st.update(ev)
            if not cans.can_act or rng.random() > 0.25:
                continue
            obs, mask = st.encode_obs(4, False)
            with torch.inference_mode():
                q = dqn(brain(torch.as_tensor(obs[None])), torch.as_tensor(mask[None]))[0].numpy()
            obs_l.append(obs)
            mask_l.append(mask)
            q_l.append(q)
            where.append(f"{os.path.basename(path)} {line} {seat}")
        if len(where) >= limit:
            break
    if len(where) >= limit:
        break
np.savez_compressed(os.path.join(out, "reference.npz"), obs=np.stack(obs_l), mask=np.stack(mask_l),
                    q=np.stack(q_l), where=np.array(where))
print(f"{len(where)} reference decisions")
