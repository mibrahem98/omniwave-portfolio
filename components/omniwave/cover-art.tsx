import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeContext } from "@/lib/theme-provider";
import type { Track } from "@/lib/omniwave/types";
import { isSafeArtworkUri } from "@/lib/omniwave/validation";

export function CoverArt({ track, size = 56, showLabel = false }: { track: Track; size?: number; showLabel?: boolean }) {
  const { theme } = useThemeContext();
  const [artworkFailed, setArtworkFailed] = useState(false);
  const radius = Math.round(size * 0.28);
  const hasArtwork = Boolean(track.artworkUri && isSafeArtworkUri(track.artworkUri) && !artworkFailed);
  useEffect(() => { setArtworkFailed(false); }, [track.artworkUri, track.id]);
  return (
    <View style={[styles.shell, { width: size, height: size, borderRadius: radius, backgroundColor: track.accent, borderColor: `${theme.colors.text}22` }]}>
      {hasArtwork ? <Image accessibilityLabel={`${track.title} ${track.album}`} source={{ uri: track.artworkUri }} contentFit="cover" transition={150} onError={() => setArtworkFailed(true)} style={StyleSheet.absoluteFill} /> : <><View style={[styles.ring, { borderColor: `${theme.colors.onPrimary}55`, width: size * 0.72, height: size * 0.72, borderRadius: size }]} /><MaterialIcons name="graphic-eq" size={Math.max(18, size * 0.38)} color={theme.colors.onPrimary} /></>}
      {showLabel ? <View style={styles.labelShade}><Text numberOfLines={1} style={[styles.label, { color: theme.colors.onPrimary, fontSize: Math.max(7, size * 0.1) }]}>{track.album}</Text></View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1 },
  ring: { position: "absolute", borderWidth: 1.5, opacity: 0.8 },
  labelShade: { position: "absolute", left: 0, right: 0, bottom: 0, minHeight: 26, justifyContent: "flex-end", paddingHorizontal: 5, paddingBottom: 5, backgroundColor: "rgba(0, 0, 0, 0.34)" },
  label: { textAlign: "center", fontWeight: "900", letterSpacing: 0.3, opacity: 0.92 },
});
