import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";

import { useThemeContext } from "@/lib/theme-provider";
import type { Track } from "@/lib/omniwave/types";

export function CoverArt({ track, size = 56, showLabel = false }: { track: Track; size?: number; showLabel?: boolean }) {
  const { theme } = useThemeContext();
  const radius = Math.round(size * 0.28);
  return (
    <View style={[styles.shell, { width: size, height: size, borderRadius: radius, backgroundColor: track.accent, borderColor: `${theme.colors.text}22` }]}>
      <View style={[styles.ring, { borderColor: `${theme.colors.onPrimary}55`, width: size * 0.72, height: size * 0.72, borderRadius: size }]} />
      <MaterialIcons name="graphic-eq" size={Math.max(18, size * 0.38)} color={theme.colors.onPrimary} />
      {showLabel ? <Text numberOfLines={1} style={[styles.label, { color: theme.colors.onPrimary, fontSize: Math.max(7, size * 0.1) }]}>{track.album}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1 },
  ring: { position: "absolute", borderWidth: 1.5, opacity: 0.8 },
  label: { position: "absolute", bottom: 6, left: 5, right: 5, textAlign: "center", fontWeight: "900", letterSpacing: 0.3, opacity: 0.85 },
});
