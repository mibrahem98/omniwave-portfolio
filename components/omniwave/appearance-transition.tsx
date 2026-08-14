import { type ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

import { useThemeContext } from "@/lib/theme-provider";

export function AppearanceTransition({ children }: { children: ReactNode }) {
  const { interfaceDensity, textScale, themeId } = useThemeContext();
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) { opacity.setValue(1); scale.setValue(1); return; }
    opacity.setValue(0.94);
    scale.setValue(0.988);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [interfaceDensity, opacity, reduceMotion, scale, textScale, themeId]);

  return <Animated.View style={{ flex: 1, opacity, transform: [{ scale }] }}>{children}</Animated.View>;
}
