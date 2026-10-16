#!/usr/bin/env bash
# Mortal for CI: builds native/mortal and fetches the S42 weights.
#   scripts/mortal/ci_setup.sh wasm     -> public/mortal/riichinight_mortal.wasm (+ weights)
#   scripts/mortal/ci_setup.sh native   -> native/mortal/target/release/libriichinight_mortal.so (+ weights)
set -euo pipefail
cd "$(dirname "$0")/../.."
mode=${1:-wasm}

url=https://github.com/bogdanpetrenko13/RiichiNight/releases/download/mortal-s42/s42.f16.bin
if [ ! -f public/mortal/s42.f16.bin ]; then
  curl -fsSL -o public/mortal/s42.f16.bin "$url"
fi
echo "$(cat public/mortal/s42.f16.sha256)  public/mortal/s42.f16.bin" | sha256sum -c -

cd native/mortal
if [ "$mode" = wasm ]; then
  rustup target add wasm32-unknown-unknown
  RUSTFLAGS="-C target-feature=+simd128" cargo build --release --locked --target wasm32-unknown-unknown
  cp target/wasm32-unknown-unknown/release/riichinight_mortal.wasm ../../public/mortal/
  ls -la ../../public/mortal
else
  cargo build --release --locked --lib
fi
