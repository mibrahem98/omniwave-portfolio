import { BlurView } from "expo-blur";
import { Platform, StyleSheet, View, type ViewProps } from "react-native";

type GlassCardProps = ViewProps & { children: React.ReactNode; accent?: string; intensity?: number };
export function GlassCard({ children, accent, intensity = 28, style, ...props }: GlassCardProps) {
  return <BlurView intensity={Platform.OS === "web" ? intensity : Math.min(intensity, 35)} tint="dark" experimentalBlurMethod="dimezisBlurView" style={[styles.card, accent ? { borderColor: `${accent}66` } : undefined, style]} {...props}><View style={styles.highlight} />{children}</BlurView>;
}
const styles = StyleSheet.create({ card: { overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)", borderRadius: 24, backgroundColor: "rgba(255,255,255,0.075)" }, highlight: { position: "absolute", top: 0, left: 24, right: 24, height: 1, backgroundColor: "rgba(255,255,255,0.30)" } });
