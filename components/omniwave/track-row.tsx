import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CoverArt } from "@/components/omniwave/cover-art";
import { formatTime } from "@/lib/omniwave/data";
import { useThemeContext } from "@/lib/theme-provider";
import type { Track } from "@/lib/omniwave/types";

type TrackRowProps = { track: Track; active?: boolean; onPress: () => void; onFavorite: () => void; onQueue?: () => void; trailing?: React.ReactNode };

export function TrackRow({ track, active, onPress, onFavorite, onQueue, trailing }: TrackRowProps) {
  const { theme, isRTL, t } = useThemeContext();
  const textAlign = isRTL ? "right" : "left";
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, { flexDirection: isRTL ? "row-reverse" : "row" }, active && { backgroundColor: `${theme.colors.primary}15`, paddingHorizontal: 8, marginHorizontal: -8 }, pressed && styles.pressed]}>
      <CoverArt track={track} size={52} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: active ? theme.colors.primary : theme.colors.text, textAlign }]}>{track.title}</Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: theme.colors.muted, textAlign }]}>{track.artist} <Text style={{ color: theme.colors.border }}>·</Text> {track.album}</Text>
        {track.classificationStatus === "pending" ? <Text numberOfLines={1} style={[styles.classification, { color: theme.colors.primary, textAlign }]}>{t("classificationPending")}</Text> : track.classificationStatus === "suggested" ? <Text numberOfLines={1} style={[styles.classification, { color: theme.colors.secondary, textAlign }]}>{t("reviewRequired")}</Text> : track.classification ? <Text numberOfLines={1} style={[styles.classification, { color: theme.colors.secondary, textAlign }]}>{track.classification.genre} <Text style={{ color: theme.colors.border }}>·</Text> {track.classification.mood}</Text> : track.classificationStatus === "failed" ? <Text numberOfLines={1} style={[styles.classification, { color: theme.colors.accent, textAlign }]}>{t("classificationFailed")}</Text> : null}
      </View>
      {trailing ?? (
        <View style={[styles.trailing, { flexDirection: isRTL ? "row-reverse" : "row" }]}>
          <Text style={[styles.duration, { color: theme.colors.muted }]}>{track.durationSeconds ? formatTime(track.durationSeconds) : t("yourFiles")}</Text>
          {onQueue ? <Pressable accessibilityRole="button" accessibilityLabel={t("addToQueue")} onPress={(event) => { event.stopPropagation(); onQueue(); }} style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}><MaterialIcons name="playlist-add" size={20} color={theme.colors.primary} /></Pressable> : null}
          <Pressable accessibilityLabel={track.isFavorite ? t("remove") : t("favorites")} onPress={(event) => { event.stopPropagation(); onFavorite(); }} style={({ pressed }) => [styles.iconButton, pressed && styles.iconPressed]}>
            <MaterialIcons name={track.isFavorite ? "favorite" : "favorite-border"} size={20} color={track.isFavorite ? theme.colors.accent : theme.colors.muted} />
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 72, alignItems: "center", gap: 12, paddingVertical: 9, paddingHorizontal: 2, borderRadius: 18 },
  pressed: { opacity: 0.7 },
  copy: { flex: 1, gap: 3, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  subtitle: { fontSize: 12, lineHeight: 18 }, classification: { fontSize: 10, lineHeight: 14, fontWeight: "800" },
  trailing: { alignItems: "center", gap: 5 },
  duration: { fontSize: 11, lineHeight: 16, fontVariant: ["tabular-nums"] },
  iconButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
  iconPressed: { opacity: 0.55 },
});
