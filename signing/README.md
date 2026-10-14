`debug.keystore` is a debug-only key with the standard public Android debug
credentials (store/key password `android`, alias `androiddebugkey`). CI copies it to
`~/.android/debug.keystore` so every debug APK has the same signature and can be
installed over the previous build. It must never be used for release builds.
