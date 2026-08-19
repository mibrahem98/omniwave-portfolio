import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";

import { useThemeContext } from "@/lib/theme-provider";
import { resolveMediaGlassAccent } from "@/lib/omniwave/media-visuals";

type GlassCardProps = ViewProps & { children: React.ReactNode; accent?: string; intensity?: number; tone?: "hero" | "elevated" | "quiet" | "inset" };
const RIPPLE_HEIGHTS = [12, 20, 30, 42, 30, 20, 12];

export function PrismBackdrop({ accent, accentSeed }: { accent?: string; accentSeed?: string }) {
  const { theme, highContrast } = useThemeContext();
  const ambientOpacity = highContrast ? 0 : 1;
  const mediaAccent = resolveMediaGlassAccent(accent, theme.colors.primary, accentSeed);
  return <View pointerEvents="none" style={[styles.backdrop, { opacity: ambientOpacity }]}><View style={[styles.orb, styles.orbTop, { backgroundColor: mediaAccent }]} /><View style={[styles.orb, styles.orbBottom, { backgroundColor: theme.colors.secondary }]} /><View style={[styles.orb, styles.orbSide, { backgroundColor: theme.colors.primary }]} /><View style={styles.rippleCluster}>{RIPPLE_HEIGHTS.map((height, index) => <View key={`${height}-${index}`} style={[styles.rippleBar, { height, backgroundColor: mediaAccent, opacity: 0.14 + index * 0.025 }]} />)}</View></View>;
}

export function GlassCard({ children, accent, intensity = 28, tone = "elevated", style, ...props }: GlassCardProps) {
  const { theme, highContrast } = useThemeContext();
  const mediaAccent = resolveMediaGlassAccent(accent, theme.colors.primary);
  const backgroundColor = tone === "hero" || tone === "elevated" ? theme.colors.glassStrong : tone === "inset" ? theme.colors.glassInset : theme.colors.glass;
  return <View style={[styles.card, tone === "inset" && styles.insetCard, { backgroundColor, borderColor: accent ? `${mediaAccent}85` : theme.colors.glassBorder, shadowColor: theme.colors.shadow }, style]} {...props}><BlurView pointerEvents="none" intensity={highContrast ? 0 : (Platform.OS === "web" ? intensity : Math.min(intensity, 35))} tint={theme.isDark ? "dark" : "light"} experimentalBlurMethod="dimezisBlurView" style={styles.blurLayer} /><View pointerEvents="none" style={[styles.highlight, { backgroundColor: theme.colors.glassHighlight }]} /><View pointerEvents="none" style={[styles.lumaRail, { backgroundColor: mediaAccent }]} />{accent ? <View pointerEvents="none" style={[styles.accentWash, { backgroundColor: mediaAccent }]} /> : <View pointerEvents="none" style={[styles.overlayWash, { backgroundColor: theme.colors.glassOverlay }]} />}{children}</View>;
}

const styles = StyleSheet.create({ backdrop: { ...StyleSheet.absoluteFillObject, overflow: "hidden" }, orb: { position: "absolute", borderRadius: 999, opacity: 0.16 }, orbTop: { width: 330, height: 330, top: -170, right: -96 }, orbBottom: { width: 250, height: 250, bottom: -128, left: -110 }, orbSide: { width: 150, height: 150, top: "42%", right: -102, opacity: 0.09 }, rippleCluster: { position: "absolute", right: 27, bottom: 86, height: 48, flexDirection: "row", alignItems: "center", gap: 3, transform: [{ rotate: "-12deg" }] }, rippleBar: { width: 3, borderRadius: 3 }, card: { overflow: "hidden", borderWidth: 1, borderRadius: 24, shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 3 }, insetCard: { borderRadius: 18, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 }, blurLayer: { ...StyleSheet.absoluteFillObject }, highlight: { position: "absolute", top: 0, left: 18, right: 18, height: 1, opacity: 0.72 }, lumaRail: { position: "absolute", width: 3, top: 18, bottom: 18, left: 0, opacity: 0.72 }, accentWash: { position: "absolute", width: 132, height: 132, borderRadius: 66, right: -62, top: -66, opacity: 0.13 }, overlayWash: { position: "absolute", width: 150, height: 150, borderRadius: 75, right: -82, bottom: -80, opacity: 0.72 } });
