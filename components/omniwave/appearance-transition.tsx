import { type ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";

import { useThemeContext } from "@/lib/theme-provider";

export function AppearanceTransition({ children }: { children: ReactNode }) {
  const { interfaceDensity, textScale, themeId, theme } = useThemeContext();
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(1)).current;
  const sheenOpacity = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) { opacity.setValue(1); scale.setValue(1); sheenOpacity.setValue(0); return; }
    opacity.setValue(0.955);
    scale.setValue(0.992);
    sheenOpacity.setValue(0.14);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 210, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(sheenOpacity, { toValue: 0, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [interfaceDensity, opacity, reduceMotion, scale, sheenOpacity, textScale, themeId]);

  return <Animated.View style={{ flex: 1, opacity, transform: [{ scale }] }}><View pointerEvents="none" style={styles.sheenClip}><Animated.View style={[styles.sheen, { backgroundColor: theme.colors.primary, opacity: sheenOpacity }]} /></View>{children}</Animated.View>;
}

const styles = StyleSheet.create({ sheenClip: { ...StyleSheet.absoluteFillObject, overflow: "hidden" }, sheen: { position: "absolute", width: 260, height: 260, borderRadius: 130, right: -105, top: -120 } });
