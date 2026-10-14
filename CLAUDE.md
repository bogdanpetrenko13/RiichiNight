# Riichi Night: notes for Claude

Offline riichi mahjong for Android: the player against three anime heroines.
React 18 + TypeScript + Vite UI, the pyriichi rules engine in Pyodide inside a
Web Worker, Capacitor 6 for the APK, GitHub Actions for builds. Repo:
`bogdanpetrenko13/RiichiNight`, app id `com.bogdanpetrenko.riichinight`.
The owner writes in Russian; reply in Russian.

## Hard rules

- No explicit or sexual content from Claude. The owner may add his own reward
  scenes; Claude only builds the mechanism.
- Every character is an adult and must look like one (art, text, ages).
- Reward content stays hidden until the access code is entered in Settings.
  Only a salted SHA-256 of the code is stored (`src/game/extras.ts`); never
  write the code itself into the repo, commits or docs.
- Reward stage progress counts only after the code has been entered.
- Never commit the Sutemo source PSDs; only the finished images.
- `signing/debug.keystore` is a debug key with the public `android` passwords,
  committed on purpose so every CI build updates in place. Never use it for
  release builds.
- Commit messages end with the attribution lines the session gives you.

## Layout

| Path | What |
|---|---|
| `public/py/bridge.py` | JSON bridge to pyriichi: `new_game`, `act`, `ai_step`, `next_round`, `save`, `load`; views show only what the player may see |
| `public/py/ai.py` | Heroine AI: level (mistakes) + style (`STYLES`: folding, calls, dama, flush, value); each heroine's `style` is in `src/game/characters.ts` and matches her bio |
| `public/py/yakufix.py` | Fixes to pyriichi: ryanpeikou vs chiitoitsu, chanta without sequences, dora counting (melds; tsumo tile counted twice) |
| `public/py/calcinfo.py` | Score explanation for the result screen (fu parts, dora split, payments) + open-hand ron 30 fu minimum |
| `public/py/scenarios.py` | Rigged first deals for tests (`?scenario=tsumo`, `redfive`) |
| `public/py/fastpatch.py` | Speed-up of pyriichi's tenpai search |
| `src/engine/pyBoot.js` | `PY_MODULES`: every new Python module must be listed here |
| `src/engine/protocol.ts` | Types of everything the bridge returns |
| `src/game/useGameController.ts` | Game flow, cutaway banner timing, `?seed=` / `?scenario=` |
| `src/game/storage.ts` | Settings (localStorage key `settings.v1`; Capacitor prefixes it with `CapacitorStorage.`) |
| `src/ui/useLayout.ts` | Tile / band sizes from the viewport and the measured bands area |
| `src/ui/motion.ts` | FLIP and discard flight animations |
| `src/i18n/strings.ts` | en + ru strings (both must have the same keys) |

pyriichi gotchas: `Tile.__eq__` ignores the red-five flag (use identity or
`str(tile)` when the red matters); on tsumo the drawn tile is already in
`hand.tiles`, on ron the discard is not.

## Checks

```bash
# Types
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit

# Engine tests (CPython; pyriichi imported from the vendored zip)
PYTHONPATH=public/py/pyriichi.zip python -m pytest tests/python -q

# Browser tests on a build (rigged deals, seeded games, layout screenshots)
npm run build && E2E_DIST=dist python -m pytest tests/e2e -q
```

If the npm or PyPI registry is unreachable:

- Run test files without pytest by importing them and calling every `test_*`
  function.
- Build a preview with `scripts/preview/build.sh`. It needs an esbuild binary
  (`ESBUILD=`), the Pyodide files (`PYODIDE_DIR=`) and React reachable via
  `NODE_PATH`. Then point `E2E_DIST` at `.preview`.

CI (`.github/workflows/android.yml`):

1. Engine tests.
2. Web build.
3. Pyodide smoke test.
4. Browser tests; the screenshots are uploaded as artifact `e2e-screenshots`.
5. The debug APK, signed with the fixed key.

On main, the APK is also published as the pre-release **dev-latest**:

```bash
id=$(gh api repos/bogdanpetrenko13/RiichiNight/releases/tags/dev-latest -q '.assets[0].id')
curl -sSL -H "Authorization: Bearer $(gh auth token)" -H "Accept: application/octet-stream" \
  -o RiichiNight-debug.apk https://api.github.com/repos/bogdanpetrenko13/RiichiNight/releases/assets/$id
```

Workflow artifacts can't be downloaded from Claude's cloud container (blob
storage is blocked); release assets can. GraphQL is blocked too, so use
`gh api` REST calls (`gh release download` does not work).

## Testing on the emulator (MuMuPlayer on the owner's Windows PC)

The owner's PC is reachable through the Claude desktop app when the session
is linked to it:

1. Copy the APK to `C:\Users\bogda\Downloads\RiichiNight\` (stage it under
   `/mnt/user-data/outputs/` first).
2. In the emulator window (`MuMuNxDevice.exe`), open the toolbar menu
   `⋯` → «Другие инструменты» → «Установка APK».
3. Pick the file. Builds install over each other (fixed debug key).
4. Then play through the change with clicks and screenshots.

PowerShell on that PC is click-only for Claude, so there is no adb. The
emulator screen is 900×1600 (phone-like portrait).

## Conventions

- Visual changes: check portrait (412×915) and landscape, both table styles
  (`quiet`, `felt`), dark theme.
- Saves pickle the whole `Game` (engine, brains). A new attribute on `Game`,
  `Brain` or anything pickled must be read with `getattr(obj, "name", default)`
  so games saved by older builds keep working (see
  `test_old_save_without_new_attributes_keeps_playing`).
- New engine data shown in the UI: add the type to `protocol.ts`, keep old
  saves working (optional fields), add a Python test that the numbers add up.
- AI changes: check `python tests/python/style_stats.py 8` (table of calls,
  riichi, win / deal-in rates, safe discards under riichi per style) and keep
  `tests/python/test_styles.py` passing.
- New game situations worth testing: add a scenario to `scenarios.py` and an
  e2e test instead of waiting for it in random play.
