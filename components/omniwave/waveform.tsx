import { StyleSheet, View } from "react-native";
export function Waveform({ color = "#00D9FF", active = true, compact = false }: { color?: string; active?: boolean; compact?: boolean }) {
  const bars = Array.from({ length: compact ? 20 : 42 }, (_, index) => ({ height: Math.max(compact ? 4 : 8, (Math.abs(Math.sin((index + 1) * 1.6)) * 0.7 + 0.28) * (compact ? 18 : 42)), opacity: active ? 0.55 + (index % 4) * 0.1 : 0.22 }));
  return <View style={[styles.wave, compact && styles.compact]}>{bars.map((bar, index) => <View key={index} style={[styles.bar, { height: bar.height, backgroundColor: color, opacity: bar.opacity }]} />)}</View>;
}
const styles = StyleSheet.create({ wave: { height: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 3 }, compact: { height: 22, gap: 2 }, bar: { flex: 1, maxWidth: 5, borderRadius: 20 } });
