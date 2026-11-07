// Preview stand-in for @capacitor/core: a browser, no native plugins (the
// game's vibration falls back to navigator.vibrate).
export const Capacitor = {
  isNativePlatform: () => false,
  isPluginAvailable: () => false,
  getPlatform: () => "web",
};
export function registerPlugin() {
  return {};
}
