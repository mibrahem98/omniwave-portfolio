import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { StyleSheet, Text, View } from "react-native";

import type { AppTheme } from "@/lib/theme-provider";

export function ThemePreviewPlayer({ theme, isRTL, title, detail, label }: { theme: AppTheme; isRTL: boolean; title: string; detail: string; label: string }) {
  const direction = isRTL ? "row-reverse" : "row";
  const align = isRTL ? "right" : "left";
  return <View accessibilityLabel={label} style={[styles.shell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={[styles.topLine, { flexDirection: direction }]}><Text style={[styles.eyebrow, { color: theme.colors.primary, textAlign: align }]}>{label}</Text><MaterialIcons name="more-horiz" size={17} color={theme.colors.muted} /></View><View style={[styles.cover, { backgroundColor: theme.colors.primary }]}><MaterialIcons name="music-note" size={39} color={theme.colors.onPrimary} /></View><Text numberOfLines={1} style={[styles.title, { color: theme.colors.text, textAlign: align }]}>{title}</Text><Text numberOfLines={1} style={[styles.detail, { color: theme.colors.muted, textAlign: align }]}>{detail}</Text><View style={[styles.progressTrack, { backgroundColor: theme.colors.surfaceMuted }]}><View style={[styles.progressValue, { backgroundColor: theme.colors.primary }]} /></View><View style={[styles.controls, { flexDirection: direction }]}><MaterialIcons name="skip-next" size={20} color={theme.colors.text} /><View style={[styles.play, { backgroundColor: theme.colors.primary }]}><MaterialIcons name="play-arrow" size={23} color={theme.colors.onPrimary} /></View><MaterialIcons name="skip-previous" size={20} color={theme.colors.text} /></View></View>;
}

const styles = StyleSheet.create({
  shell: { marginTop: 12, padding: 12, borderRadius: 19, borderWidth: 1 }, topLine: { alignItems: "center", justifyContent: "space-between" }, eyebrow: { fontSize: 9, lineHeight: 13, fontWeight: "900", letterSpacing: 0.7 }, cover: { width: 70, height: 70, borderRadius: 22, alignSelf: "center", alignItems: "center", justifyContent: "center", marginTop: 10 }, title: { fontSize: 13, lineHeight: 18, fontWeight: "900", marginTop: 10 }, detail: { fontSize: 10, lineHeight: 14, marginTop: 1 }, progressTrack: { height: 4, borderRadius: 3, overflow: "hidden", marginTop: 11 }, progressValue: { height: "100%", width: "58%", borderRadius: 3 }, controls: { justifyContent: "center", alignItems: "center", gap: 17, marginTop: 10 }, play: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
});
