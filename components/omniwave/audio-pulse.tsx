import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View } from "react-native";

import { Waveform } from "@/components/omniwave/waveform";

type AudioPulseProps = { active: boolean; progress: number; color: string; mutedColor: string };

export function AudioPulse({ active, progress, color, mutedColor }: AudioPulseProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const [reduceMotion, setReduceMotion] = useState(false);
  const safeProgress = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));

  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (alive) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { alive = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    pulse.stopAnimation();
    if (!active || reduceMotion) { pulse.setValue(0); return; }
    const animation = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 1150, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [active, pulse, reduceMotion]);

  useEffect(() => {
    rotation.stopAnimation();
    if (!active || reduceMotion) { rotation.setValue(0); return; }
    const animation = Animated.loop(Animated.timing(rotation, { toValue: 1, duration: 6200, easing: Easing.linear, useNativeDriver: true }));
    animation.start();
    return () => animation.stop();
  }, [active, reduceMotion, rotation]);

  const outerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.13] });
  const outerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.34, 0.03] });
  const innerScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1.06] });
  const innerOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.03] });
  const rotationValue = rotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const bars = Array.from({ length: 19 }, (_, index) => 18 + Math.round((Math.sin(safeProgress * 22 + index * 0.92) + 1) * 13));

  return <View pointerEvents="none" accessibilityElementsHidden style={styles.root}><Animated.View style={[styles.ring, styles.outerRing, { borderColor: color, opacity: active && !reduceMotion ? outerOpacity : 0.08, transform: [{ scale: outerScale }, { rotate: rotationValue }] }]} /><Animated.View style={[styles.ring, styles.innerRing, { borderColor: color, opacity: active && !reduceMotion ? innerOpacity : 0.12, transform: [{ scale: innerScale }, { rotate: rotationValue }] }]} /><View style={styles.bars}>{bars.map((height, index) => <View key={index} style={[styles.bar, { height, backgroundColor: active ? color : mutedColor, opacity: active ? 0.55 + ((index + Math.round(safeProgress * 10)) % 4) * 0.1 : 0.35 }]} />)}</View><View style={styles.wave}><Waveform color={color} active={active} /></View></View>;
}

const styles = StyleSheet.create({ root: { alignItems: "center", justifyContent: "center", width: "100%", height: 116 }, ring: { position: "absolute", borderRadius: 999, borderWidth: 1 }, outerRing: { width: 142, height: 142 }, innerRing: { width: 112, height: 112 }, bars: { position: "absolute", width: 134, height: 55, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, bar: { width: 3, borderRadius: 4 }, wave: { position: "absolute", bottom: -7 } });
