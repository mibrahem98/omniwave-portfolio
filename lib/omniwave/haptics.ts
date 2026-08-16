import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

let hapticFeedbackEnabled = true;
export const setHapticFeedbackEnabled = (enabled: boolean) => { hapticFeedbackEnabled = Boolean(enabled); };
const canHaptic = () => hapticFeedbackEnabled && Platform.OS !== "web";

export const haptic = {
  light: () => { if (canHaptic()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); },
  medium: () => { if (canHaptic()) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); },
  selection: () => { if (canHaptic()) void Haptics.selectionAsync(); },
  success: () => { if (canHaptic()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); },
  error: () => { if (canHaptic()) void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); },
};
