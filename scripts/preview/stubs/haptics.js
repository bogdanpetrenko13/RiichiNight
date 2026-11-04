// Preview stand-in for @capacitor/haptics (the real web plugin calls
// navigator.vibrate; here nothing happens).
export const ImpactStyle = { Heavy: "HEAVY", Medium: "MEDIUM", Light: "LIGHT" };
export const NotificationType = { Success: "SUCCESS", Warning: "WARNING", Error: "ERROR" };
export const Haptics = {
  async impact() {},
  async notification() {},
};
