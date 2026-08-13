import { Tabs } from "expo-router";
import { Platform, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { MiniPlayer } from "@/components/omniwave/mini-player";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeContext } from "@/lib/theme-provider";
import { PlayerProvider } from "@/lib/omniwave/player-store";

function TabChrome() {
  const insets = useSafeAreaInsets();
  const { theme, t } = useThemeContext();
  const bottomPadding = Platform.OS === "web" ? 10 : Math.max(insets.bottom, 10);
  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.muted,
          tabBarStyle: { height: 72 + bottomPadding, paddingTop: 7, paddingBottom: bottomPadding, backgroundColor: theme.colors.surface, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: `${theme.colors.border}D9`, elevation: 0, shadowColor: "#000", shadowOpacity: 0.21, shadowRadius: 22, shadowOffset: { width: 0, height: -7 } },
          tabBarLabelStyle: { fontSize: 10, fontWeight: "900", marginTop: 3, letterSpacing: 0.15 },
          tabBarItemStyle: { minHeight: 51, borderRadius: 17, marginHorizontal: 2, marginVertical: 1 },
          tabBarIconStyle: { marginTop: 1 },
          tabBarActiveBackgroundColor: `${theme.colors.primary}20`,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen name="index" options={{ title: t("home"), tabBarAccessibilityLabel: t("home"), tabBarIcon: ({ color }) => <IconSymbol name="house.fill" size={22} color={color} /> }} />
        <Tabs.Screen name="library" options={{ title: t("library"), tabBarAccessibilityLabel: t("library"), tabBarIcon: ({ color }) => <IconSymbol name="music.note.list" size={22} color={color} /> }} />
        <Tabs.Screen name="playlists" options={{ title: t("playlists"), tabBarAccessibilityLabel: t("playlists"), tabBarIcon: ({ color }) => <IconSymbol name="rectangle.stack.fill" size={22} color={color} /> }} />
        <Tabs.Screen name="tools" options={{ title: t("tools"), tabBarAccessibilityLabel: t("manageListening"), tabBarIcon: ({ color }) => <IconSymbol name="waveform.path.ecg" size={22} color={color} /> }} />
        <Tabs.Screen name="settings" options={{ title: t("settings"), tabBarAccessibilityLabel: t("settings"), tabBarIcon: ({ color }) => <IconSymbol name="gearshape.fill" size={22} color={color} /> }} />
        <Tabs.Screen name="now-playing" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="metadata-review" options={{ href: null }} />
        <Tabs.Screen name="export-history" options={{ href: null }} />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}

export default function TabLayout() {
  return <PlayerProvider><TabChrome /></PlayerProvider>;
}

const styles = StyleSheet.create({ root: { flex: 1 } });
