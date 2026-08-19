import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { CoverArt } from "@/components/omniwave/cover-art";
import { Reveal } from "@/components/omniwave/reveal";
import { usePlayer } from "@/lib/omniwave/player-store";
import { useThemeContext } from "@/lib/theme-provider";

const SWIPE_THRESHOLD = 56;

export function MiniPlayer() {
  const { currentTrack, snapshot, togglePlay, nextTrack, previousTrack } = usePlayer();
  const { theme, isRTL, t } = useThemeContext();
  if (!currentTrack) return null;
  const progress = Math.min(100, Math.max(0, snapshot.durationSeconds ? (snapshot.positionSeconds / snapshot.durationSeconds) * 100 : 0));
  const handleSwipe = (translationX: number) => {
    if (Math.abs(translationX) < SWIPE_THRESHOLD) return;
    const shouldAdvance = isRTL ? translationX > 0 : translationX < 0;
    if (shouldAdvance) nextTrack(); else previousTrack();
  };
  const swipeGesture = Gesture.Pan().activeOffsetX([-12, 12]).failOffsetY([-28, 28]).runOnJS(true).onEnd((event) => handleSwipe(event.translationX));

  return <Reveal style={styles.reveal}><GestureDetector gesture={swipeGesture}><View collapsable={false}><Pressable accessibilityRole="button" accessibilityLabel={`${t("nowPlaying")}: ${currentTrack.title}`} accessibilityHint={`${t("previous")} / ${t("next")}`} onPress={() => router.push("/(tabs)/now-playing" as never)} style={({ pressed }) => [styles.shell, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow, flexDirection: isRTL ? "row-reverse" : "row" }, pressed && styles.pressed]}>
    <View pointerEvents="none" style={[styles.lumaWash, { backgroundColor: currentTrack.accent ?? theme.colors.glassOverlay }]} /><View pointerEvents="none" style={[styles.lumaRail, { backgroundColor: currentTrack.accent ?? theme.colors.primary }]} /><View style={[styles.progressRail, { backgroundColor: theme.colors.glassInset }]}><View style={[styles.progressValue, { width: `${progress}%`, backgroundColor: currentTrack.accent ?? theme.colors.primary }]} /></View>
    <CoverArt track={currentTrack} size={42} />
    <View style={styles.copy}><Text numberOfLines={1} style={[styles.title, { color: theme.colors.text, textAlign: isRTL ? "right" : "left" }]}>{currentTrack.title}</Text><Text numberOfLines={1} style={[styles.subtitle, { color: theme.colors.muted, textAlign: isRTL ? "right" : "left" }]}>{currentTrack.artist}</Text></View>
    <Pressable accessibilityRole="button" accessibilityLabel={t("previous")} onPress={(event) => { event.stopPropagation(); previousTrack(); }} style={({ pressed }) => [styles.skipButton, { backgroundColor: theme.colors.glassInset }, pressed && styles.pressed]}><MaterialIcons name="skip-previous" size={19} color={theme.colors.text} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={snapshot.isPlaying ? t("pause") : t("play")} onPress={(event) => { event.stopPropagation(); togglePlay(); }} style={({ pressed }) => [styles.playButton, { backgroundColor: theme.colors.primary }, pressed && styles.playPressed]}><MaterialIcons name={snapshot.isPlaying ? "pause" : "play-arrow"} size={24} color={theme.colors.onPrimary} /></Pressable>
    <Pressable accessibilityRole="button" accessibilityLabel={t("next")} onPress={(event) => { event.stopPropagation(); nextTrack(); }} style={({ pressed }) => [styles.skipButton, { backgroundColor: theme.colors.glassInset }, pressed && styles.pressed]}><MaterialIcons name="skip-next" size={19} color={theme.colors.text} /></Pressable>
  </Pressable></View></GestureDetector></Reveal>;
}

const styles = StyleSheet.create({
  reveal: { marginHorizontal: 14, marginBottom: 9 }, shell: { alignItems: "center", gap: 8, padding: 10, borderRadius: 23, borderWidth: 1, overflow: "hidden", shadowOpacity: 0.28, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 7 }, lumaWash: { position: "absolute", width: 116, height: 116, borderRadius: 58, right: -56, top: -64, opacity: 0.12 }, lumaRail: { position: "absolute", top: 10, bottom: 10, left: 0, width: 3, opacity: 0.8 },
  progressRail: { position: "absolute", top: 0, right: 0, left: 0, height: 3 }, progressValue: { height: "100%", borderRadius: 3 }, pressed: { opacity: 0.76 }, copy: { flex: 1, minWidth: 0 }, title: { fontSize: 14, lineHeight: 19, fontWeight: "900" }, subtitle: { fontSize: 11, lineHeight: 16, marginTop: 1 },
  skipButton: { width: 35, height: 35, borderRadius: 17.5, alignItems: "center", justifyContent: "center" }, playButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }, playPressed: { transform: [{ scale: 0.96 }], opacity: 0.9 },
});
