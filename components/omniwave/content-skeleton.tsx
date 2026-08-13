import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Easing, StyleSheet, View, type DimensionValue } from "react-native";

import { useThemeContext } from "@/lib/theme-provider";

type SkeletonBlockProps = { width?: DimensionValue; height: number; radius?: number };

function SkeletonBlock({ width = "100%", height, radius = 12 }: SkeletonBlockProps) {
  const { theme } = useThemeContext();
  const opacity = useRef(new Animated.Value(0.45)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => { if (active) setReduceMotion(value); });
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduceMotion) { opacity.setValue(0.56); return; }
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.86, duration: 760, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.45, duration: 760, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [opacity, reduceMotion]);

  return <Animated.View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width, height, borderRadius: radius, backgroundColor: theme.colors.surfaceMuted, opacity }} />;
}

export function CollectionSkeleton({ variant }: { variant: "library" | "playlists" }) {
  const { theme } = useThemeContext();
  return <View accessibilityLabel="Loading content" accessibilityRole="progressbar" style={styles.root}>
    <View style={styles.heading}><SkeletonBlock width={48} height={48} radius={16} /><View style={styles.headingCopy}><SkeletonBlock width="34%" height={11} radius={6} /><SkeletonBlock width="58%" height={30} radius={10} /></View></View>
    {variant === "library" ? <><SkeletonBlock height={52} radius={17} /><View style={styles.quickRow}>{[0, 1, 2].map((item) => <View key={item} style={styles.quickCard}><SkeletonBlock height={55} radius={18} /><SkeletonBlock width="82%" height={12} radius={6} /><SkeletonBlock width="58%" height={10} radius={5} /></View>)}</View><View style={[styles.panel, { borderColor: theme.colors.border }]}><SkeletonBlock width="36%" height={13} radius={6} /><View style={styles.chips}>{[0, 1, 2, 3].map((item) => <SkeletonBlock key={item} width={58 + item * 8} height={34} radius={13} />)}</View></View></> : <View style={[styles.panel, { borderColor: theme.colors.border }]}><SkeletonBlock width="44%" height={15} radius={7} /><SkeletonBlock width="76%" height={12} radius={6} /><SkeletonBlock width="48%" height={12} radius={6} /></View>}
    <View style={styles.list}>{[0, 1, 2, 3].map((item) => <View key={item} style={styles.row}><SkeletonBlock width={58} height={58} radius={18} /><View style={styles.rowCopy}><SkeletonBlock width="64%" height={14} radius={7} /><SkeletonBlock width="42%" height={11} radius={6} /></View><SkeletonBlock width={30} height={30} radius={15} /></View>)}</View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingTop: 14, gap: 16 }, heading: { flexDirection: "row", alignItems: "center", gap: 12 }, headingCopy: { flex: 1, gap: 8 }, quickRow: { flexDirection: "row", gap: 10 }, quickCard: { flex: 1, gap: 8 }, panel: { gap: 12, padding: 14, borderRadius: 20, borderWidth: 1 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 7 }, list: { gap: 8 }, row: { minHeight: 78, flexDirection: "row", alignItems: "center", gap: 12 }, rowCopy: { flex: 1, gap: 8 },
});
