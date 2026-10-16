# Licenses and credits

Riichi Night is distributed under the **GNU Affero General Public License
v3.0 or later** (see `LICENSE`), because it includes Mortal's code. Anyone
who receives the app may get its full source code from
<https://github.com/bogdanpetrenko13/RiichiNight>.

| Part | Where | Author | License |
|---|---|---|---|
| Mortal (libriichi player state, observation encoder, rule algorithms) | `native/mortal/src/riichi/` (copied by `scripts/mortal/import_libriichi.py`) | Equim-chan, <https://github.com/Equim-chan/Mortal> | AGPL-3.0-or-later |
| Mortal network in Rust, bot, WebAssembly interface | `native/mortal/src/{net,bot,ffi}.rs` | this project, following Mortal's `model.py` / `agent/mortal.rs` | AGPL-3.0-or-later |
| Mortal S42.8k weights (float16 copy, release `mortal-s42`) | `public/mortal/s42.f16.bin` (downloaded at build time) | haor, <https://huggingface.co/haor/Mortal-S42> | Apache-2.0 |
| pyriichi rules engine | `public/py/pyriichi.zip` | PyRiichi contributors | MIT |
| Pyodide | `public/pyodide/` (installed by npm) | Pyodide contributors | MPL-2.0 |
