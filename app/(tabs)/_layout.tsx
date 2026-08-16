import { Tabs, usePathname } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { PanResponder, Platform, Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniPlayer } from "@/components/omniwave/mini-player";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeContext } from "@/lib/theme-provider";
import { PlayerProvider } from "@/lib/omniwave/player-store";

type TabIconName = "house.fill" | "music.note.list" | "rectangle.stack.fill" | "video.fill" | "waveform.path.ecg" | "gearshape.fill";

function TabIcon({ name, color, focused, size }: { name: TabIconName; color: string; focused: boolean; size: number }) {
  const { theme } = useThemeContext();
  const activeStyle = focused ? { backgroundColor: `${theme.colors.primary}${theme.isDark ? "32" : "1D"}`, borderColor: `${theme.colors.primary}${theme.isDark ? "72" : "52"}`, transform: [{ translateY: -1 }] } : undefined;
  return <View style={[styles.iconShell, activeStyle]}><IconSymbol name={name} size={size} color={color} />{focused ? <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.activeIndicator, { backgroundColor: theme.colors.primary }]} /> : null}</View>;
}

function AppearanceShortcut({ bottomOffset }: { bottomOffset: number }) {
  const { theme, colorScheme, setColorScheme, t, appearanceShortcutEnabled, appearanceShortcutPosition, setAppearanceShortcutPosition } = useThemeContext();
  const { width, height } = useWindowDimensions();
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const originRef = useRef({ x: 0, y: 0 });
  const buttonSize = 44;
  const edge = 12;
  const maxX = Math.max(edge, width - buttonSize - edge);
  const maxY = Math.max(edge, height - bottomOffset - buttonSize - edge);
  const baseX = edge + appearanceShortcutPosition.x * Math.max(0, maxX - edge);
  const baseY = edge + appearanceShortcutPosition.y * Math.max(0, maxY - edge);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) + Math.abs(gesture.dy) > 5,
    onPanResponderGrant: () => { originRef.current = { x: baseX, y: baseY }; },
    onPanResponderMove: (_, gesture) => setDragOffset({ x: gesture.dx, y: gesture.dy }),
    onPanResponderRelease: (_, gesture) => {
      const nextX = Math.max(edge, Math.min(maxX, originRef.current.x + gesture.dx));
      const nextY = Math.max(edge, Math.min(maxY, originRef.current.y + gesture.dy));
      setAppearanceShortcutPosition({ x: maxX === edge ? 1 : (nextX - edge) / (maxX - edge), y: maxY === edge ? 1 : (nextY - edge) / (maxY - edge) });
      setDragOffset({ x: 0, y: 0 });
    },
    onPanResponderTerminate: () => setDragOffset({ x: 0, y: 0 }),
  }), [baseX, baseY, edge, maxX, maxY, setAppearanceShortcutPosition]);
  const nextScheme = colorScheme === "dark" ? "light" : "dark";
  const label = colorScheme === "dark" ? t("switchToLightMode") : t("switchToDarkMode");
  if (!appearanceShortcutEnabled) return null;
  return <View pointerEvents="box-none" style={styles.accessoryLayer}><View {...panResponder.panHandlers} style={[styles.appearanceShortcutShell, { left: Math.max(edge, Math.min(maxX, baseX + dragOffset.x)), top: Math.max(edge, Math.min(maxY, baseY + dragOffset.y)) }]}><Pressable accessibilityRole="button" accessibilityLabel={t("appearanceShortcut")} accessibilityHint={label} accessibilityState={{ selected: colorScheme === "dark" }} onPress={() => setColorScheme(nextScheme)} style={({ pressed }) => [styles.appearanceShortcut, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, shadowColor: theme.colors.primary }, pressed && styles.accessoryPressed]}><MaterialIcons name={colorScheme === "dark" ? "light-mode" : "dark-mode"} size={20} color={theme.colors.primary} /></Pressable></View></View>;
}

function TabChrome() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { theme, t, interfaceDensity } = useThemeContext();
  const isVideoPlayer = pathname.includes("video-player");
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 10);
  const compact = interfaceDensity === "compact";
  const iconSize = compact ? 20 : 22;
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.muted,
          tabBarStyle: { display: isVideoPlayer ? "none" : "flex", height: (compact ? 66 : 74) + bottomPadding, paddingTop: compact ? 6 : 8, paddingBottom: bottomPadding, backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${theme.colors.border}D9`, elevation: theme.isDark ? 0 : 5, shadowColor: theme.isDark ? "#000" : theme.colors.primary, shadowOpacity: theme.isDark ? 0.22 : 0.09, shadowRadius: 24, shadowOffset: { width: 0, height: -8 } },
          tabBarLabelStyle: { fontSize: compact ? 9 : 10, lineHeight: compact ? 12 : 13, fontWeight: "900", marginTop: compact ? 2 : 3, letterSpacing: 0.1 },
          tabBarItemStyle: { minHeight: compact ? 50 : 56, borderRadius: compact ? 15 : 18, marginHorizontal: 1, marginVertical: 1 },
          tabBarIconStyle: { marginTop: compact ? 0 : 1 },
          tabBarActiveBackgroundColor: `${theme.colors.primary}${theme.isDark ? "20" : "16"}`,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen name="index" options={{ title: t("home"), tabBarAccessibilityLabel: t("home"), tabBarIcon: ({ color, focused }) => <TabIcon name="house.fill" size={iconSize} color={String(color)} focused={focused} /> }} />
        <Tabs.Screen name="library" options={{ title: t("library"), tabBarAccessibilityLabel: t("library"), tabBarIcon: ({ color, focused }) => <TabIcon name="music.note.list" size={iconSize} color={String(color)} focused={focused} /> }} />
        <Tabs.Screen name="playlists" options={{ title: t("playlists"), tabBarAccessibilityLabel: t("playlists"), tabBarIcon: ({ color, focused }) => <TabIcon name="rectangle.stack.fill" size={iconSize} color={String(color)} focused={focused} /> }} />
        <Tabs.Screen name="videos" options={{ title: t("videos"), tabBarAccessibilityLabel: t("videoLibrary"), tabBarIcon: ({ color, focused }) => <TabIcon name="video.fill" size={iconSize} color={String(color)} focused={focused} /> }} />
        <Tabs.Screen name="tools" options={{ title: t("tools"), tabBarAccessibilityLabel: t("manageListening"), tabBarIcon: ({ color, focused }) => <TabIcon name="waveform.path.ecg" size={iconSize} color={String(color)} focused={focused} /> }} />
        <Tabs.Screen name="settings" options={{ title: t("settings"), tabBarAccessibilityLabel: t("settings"), tabBarIcon: ({ color, focused }) => <TabIcon name="gearshape.fill" size={iconSize} color={String(color)} focused={focused} /> }} />
        <Tabs.Screen name="now-playing" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="metadata-review" options={{ href: null }} />
        <Tabs.Screen name="export-history" options={{ href: null }} />
        <Tabs.Screen name="video-player" options={{ href: null }} />
      </Tabs>
      {!isVideoPlayer ? <AppearanceShortcut bottomOffset={(compact ? 64 : 72) + bottomPadding + 8} /> : null}
      {!isVideoPlayer ? <MiniPlayer /> : null}
    </View>
  );
}

export default function TabLayout() {
  return <PlayerProvider><TabChrome /></PlayerProvider>;
}

const styles = StyleSheet.create({ root: { flex: 1 }, iconShell: { width: 34, height: 31, borderRadius: 11, borderWidth: StyleSheet.hairlineWidth, borderColor: "transparent", alignItems: "center", justifyContent: "center", position: "relative" }, activeIndicator: { position: "absolute", width: 4, height: 4, borderRadius: 2, bottom: 3 }, accessoryLayer: { ...StyleSheet.absoluteFillObject, pointerEvents: "box-none" }, appearanceShortcutShell: { position: "absolute" }, appearanceShortcut: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center", opacity: 0.5, shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 4 }, accessoryPressed: { opacity: 0.72, transform: [{ scale: 0.96 }] } });
