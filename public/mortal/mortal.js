// Loader for the Mortal WebAssembly module (native/mortal), used inside the
// engine worker and by Node tests. Plain JS so Node can import it unbuilt.
//
// const m = await loadMortal(readAsset)   // readAsset(name) -> Uint8Array
// const h = m.newBot(seat, seed)
// m.update(h, mjaiEventJson)  -> true when the seat may act
// m.react(h, explore, temperature) -> reaction JSON {event, q, action, greedy}

export const MORTAL_FILES = { wasm: "riichinight_mortal.wasm", index: "s42.json", weights: "s42.f16.bin" };

export async function loadMortal(readAsset) {
  const [wasm, index, weights] = await Promise.all([
    readAsset(MORTAL_FILES.wasm),
    readAsset(MORTAL_FILES.index),
    readAsset(MORTAL_FILES.weights),
  ]);
  const { instance } = await WebAssembly.instantiate(wasm, {});
  const x = instance.exports;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  const out = () => dec.decode(new Uint8Array(x.memory.buffer, x.rn_out_ptr(), x.rn_out_len()));
  const put = (bytes) => {
    const p = x.rn_alloc(bytes.length);
    new Uint8Array(x.memory.buffer, p, bytes.length).set(bytes);
    return p;
  };
  const check = (code, what) => {
    if (code < 0) throw new Error(`mortal ${what}: ${out()}`);
    return code;
  };

  {
    const ib = enc.encode(dec.decode(index));
    const ip = put(ib);
    const wp = put(weights);
    try {
      check(x.rn_load(ip, ib.length, wp, weights.length, 1), "load");
    } finally {
      x.rn_free(ip, ib.length);
      x.rn_free(wp, weights.length);
    }
  }

  return {
    newBot: (seat, seed) => check(x.rn_bot_new(seat, seed >>> 0), "new"),
    freeBot: (h) => x.rn_bot_free(h),
    update(h, line) {
      const b = enc.encode(line);
      const p = put(b);
      try {
        return check(x.rn_bot_update(h, p, b.length), "update") === 1;
      } finally {
        x.rn_free(p, b.length);
      }
    },
    react(h, explore = 0, temperature = 1) {
      check(x.rn_bot_react(h, explore, temperature), "react");
      return out();
    },
  };
}
