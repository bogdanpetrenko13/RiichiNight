`debug.keystore` is a debug-only key with the standard public Android debug
credentials (store/key password `android`, alias `androiddebugkey`). CI passes it to
Gradle for `assembleDebug`, so every debug APK has the same signature and installs over
the previous build. It must never be used for release builds.
