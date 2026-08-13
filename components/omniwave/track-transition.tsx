import { ReactNode, useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing } from "react-native";

export function TrackTransition({ transitionKey, children }: { transitionKey: string; children: ReactNode }) {
  const transition = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => { let alive = true; void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (alive) setReduceMotion(value); }); const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion); return () => { alive = false; subscription.remove(); }; }, []);
  useEffect(() => { if (reduceMotion) { transition.setValue(1); return; } transition.setValue(0.28); Animated.timing(transition, { toValue: 1, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(); }, [reduceMotion, transition, transitionKey]);
  return <Animated.View style={{ opacity: transition, transform: [{ scale: transition.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) }] }}>{children}</Animated.View>;
}
