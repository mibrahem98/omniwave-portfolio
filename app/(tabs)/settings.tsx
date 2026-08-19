import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { type ComponentProps, useState } from "react";
import { FlatList, Modal as NativeModal, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { AccessibilityFeedback } from "@/components/omniwave/accessibility-feedback";
import { AccessibilityLibraryPreview } from "@/components/omniwave/accessibility-library-preview";
import { AccessibilityPlayerPreview } from "@/components/omniwave/accessibility-player-preview";
import { PrismBackdrop } from "@/components/omniwave/glass-card";
import { ThemePreviewModal } from "@/components/omniwave/theme-preview-modal";
import { ScreenContainer } from "@/components/screen-container";
import { EQ_LABELS } from "@/lib/omniwave/data";
import { LOCALE_META, SUPPORTED_LOCALES, TRANSLATIONS } from "@/lib/localization";
import { haptic } from "@/lib/omniwave/haptics";
import { usePlayer } from "@/lib/omniwave/player-store";
import { APP_THEMES, type AppThemeId, type FontWeightPreference, type HighContrastAccent, type InterfaceDensity, type LineSpacingPreference, type ReadingFontPreference, type TextScale, useThemeContext } from "@/lib/theme-provider";

// The detailed shared preview below supersedes an older inline preview kept in
// this file for now. Rendering it as a no-op avoids two competing modals.
function DeprecatedThemePreviewModal(_: ComponentProps<typeof NativeModal>) { return null; }
const Modal = DeprecatedThemePreviewModal;

type EffectRow = {
  id: "bassBoost" | "reverb" | "surround";
  titleKey: "bassBoost" | "reverb" | "surround";
  icon: keyof typeof MaterialIcons.glyphMap;
};

const EFFECTS: EffectRow[] = [
  { id: "bassBoost", titleKey: "bassBoost", icon: "graphic-eq" },
  { id: "reverb", titleKey: "reverb", icon: "surround-sound" },
  { id: "surround", titleKey: "surround", icon: "headphones" },
];
const THEME_IDS = Object.keys(APP_THEMES) as AppThemeId[];
const DENSITIES: InterfaceDensity[] = ["comfortable", "compact"];
const TEXT_SCALES: TextScale[] = ["standard", "large", "extraLarge"];
const FONT_WEIGHTS: FontWeightPreference[] = ["regular", "medium", "bold"];
const LINE_SPACINGS: LineSpacingPreference[] = ["standard", "relaxed", "spacious"];
const READING_FONTS: ReadingFontPreference[] = ["system", "dyslexia"];
const HIGH_CONTRAST_ACCENTS: { value: HighContrastAccent; swatch: string; labelKey: "highContrastAccentTeal" | "highContrastAccentViolet" | "highContrastAccentAmber" }[] = [{ value: "teal", swatch: "#39F2D0", labelKey: "highContrastAccentTeal" }, { value: "violet", swatch: "#D1C4FF", labelKey: "highContrastAccentViolet" }, { value: "amber", swatch: "#FFE58C", labelKey: "highContrastAccentAmber" }];
const EQ_PRESETS = [{ id: "flat", labelKey: "equalizerPresetFlat" }, { id: "warm", labelKey: "equalizerPresetWarm" }, { id: "vocal", labelKey: "equalizerPresetVocal" }, { id: "night", labelKey: "equalizerPresetNight" }] as const;

export default function SettingsScreen() {
  const { preferences, profile, snapshot, updatePreference, updateEqBand, applyEqualizerPreset, resetAudioPreferences } = usePlayer();
  const { theme, themeId, setThemeId, interfaceDensity, setInterfaceDensity, textScale, textScaleMultiplier, setTextScale, fontWeightPreference, fontWeightValue, setFontWeightPreference, lineSpacing, lineHeightMultiplier, setLineSpacing, readingFont, readingFontFamily, setReadingFont, resetAccessibilityPreferences, highContrast, setHighContrast, highContrastAccent, setHighContrastAccent, followSystemAppearance, setFollowSystemAppearance, appearanceShortcutEnabled, setAppearanceShortcutEnabled, colorScheme, setColorScheme, locale, setLocale, hapticFeedbackEnabled, setHapticFeedbackEnabled, resetOnboarding, isRTL, t } = useThemeContext();
  const align = isRTL ? "right" : "left";
  const direction = isRTL ? "row-reverse" : "row";
  const themeLabels: Record<AppThemeId, string> = { ...TRANSLATIONS[locale].themeNames, cloud: t("themeCloud"), tidal: t("themeTidal"), porcelain: t("themePorcelain") };
  const themeDescriptions: Partial<Record<AppThemeId, string>> = { cloud: t("themeCloudHint"), tidal: t("themeTidalHint"), porcelain: t("themePorcelainHint") };
  const textScaleLabels: Record<TextScale, string> = { standard: t("textScaleStandard"), large: t("textScaleLarge"), extraLarge: t("textScaleExtraLarge") };
  const fontWeightLabels: Record<FontWeightPreference, string> = { regular: t("fontWeightRegular"), medium: t("fontWeightMedium"), bold: t("fontWeightBold") };
  const lineSpacingLabels: Record<LineSpacingPreference, string> = { standard: t("lineSpacingStandard"), relaxed: t("lineSpacingRelaxed"), spacious: t("lineSpacingSpacious") };
  const readingFontLabels: Record<ReadingFontPreference, string> = { system: t("readingFontSystem"), dyslexia: t("readingFontDyslexia") };
  const highContrastAccentLabels: Record<HighContrastAccent, string> = { teal: t("highContrastAccentTeal"), violet: t("highContrastAccentViolet"), amber: t("highContrastAccentAmber") };
  const selectedThemeName = themeLabels[themeId];
  const scaled = (value: number) => Math.round(value * textScaleMultiplier);
  const contrastPreview = theme.isDark ? { background: "#000000", surface: "#101010", text: "#FFFFFF", muted: "#F2F2F2", border: "#FFFFFF", primary: HIGH_CONTRAST_ACCENTS.find((option) => option.value === highContrastAccent)?.swatch ?? "#39F2D0" } : { background: "#FFFFFF", surface: "#F4F4F4", text: "#000000", muted: "#1E1E1E", border: "#111111", primary: highContrastAccent === "teal" ? "#005C43" : highContrastAccent === "violet" ? "#40258B" : "#6A4700" };
  const [accessibilityPulse, setAccessibilityPulse] = useState(0);
  const [themePreviewId, setThemePreviewId] = useState<AppThemeId | null>(null);
  const pulseAccessibility = () => setAccessibilityPulse((value) => value + 1);
  const previewTheme = themePreviewId ? APP_THEMES[themePreviewId] : null;

  return (
    <ScreenContainer className="px-5">
      <PrismBackdrop />
      <FlatList
        data={EFFECTS}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={pulseAccessibility}
        contentContainerStyle={[styles.content, interfaceDensity === "compact" && styles.contentCompact]}
        ListHeaderComponent={
          <View>
            <View style={styles.headingBlock}>
              <Text style={[styles.eyebrow, { color: theme.colors.primary, textAlign: align }]}>{t("tuneExperience")}</Text>
              <Text style={[styles.heading, { color: theme.colors.text, textAlign: align }]}>{t("settings")}</Text>
              <Text style={[styles.settingsOverview, { color: theme.colors.muted, textAlign: align }]}>{t("settingsOverview")}</Text>
            </View>

            <View style={[styles.settingsSnapshot, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow, flexDirection: direction }]}>
              <View style={styles.snapshotItem}><View style={[styles.snapshotIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="palette" size={17} color={theme.colors.primary} /></View><Text numberOfLines={1} style={[styles.snapshotValue, { color: theme.colors.text }]}>{selectedThemeName}</Text><Text style={[styles.snapshotLabel, { color: theme.colors.muted }]}>{t("theme")}</Text></View>
              <View style={[styles.snapshotDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.snapshotItem}><View style={[styles.snapshotIcon, { backgroundColor: `${theme.colors.secondary}18` }]}><MaterialIcons name="queue-music" size={17} color={theme.colors.secondary} /></View><Text numberOfLines={1} style={[styles.snapshotValue, { color: theme.colors.text }]}>{snapshot.queueLength}</Text><Text style={[styles.snapshotLabel, { color: theme.colors.muted }]}>{t("queue")}</Text></View>
              <View style={[styles.snapshotDivider, { backgroundColor: theme.colors.border }]} />
              <View style={styles.snapshotItem}><View style={[styles.snapshotIcon, { backgroundColor: `${theme.colors.accent}18` }]}><MaterialIcons name="shield" size={17} color={theme.colors.accent} /></View><Text numberOfLines={1} style={[styles.snapshotValue, { color: theme.colors.text }]}>{t("localOnly")}</Text><Text style={[styles.snapshotLabel, { color: theme.colors.muted }]}>{t("dataAndPrivacy")}</Text></View>
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel={t("profile")} accessibilityHint={t("editProfile")} onPress={() => router.push("/(tabs)/profile" as never)} style={({ pressed }) => [styles.profileCard, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }, pressed && styles.pressed]}>
              <View style={[styles.profileHeader, { flexDirection: direction }]}>
                <View style={[styles.profileMark, { backgroundColor: theme.colors.primary }]}>
                  <MaterialIcons name="headphones" size={26} color={theme.colors.onPrimary} />
                </View>
                <View style={styles.profileCopy}>
                  <Text style={[styles.profileOverline, { color: theme.colors.muted, textAlign: align }]}>{t("profile")}</Text>
                  <Text style={[styles.profileTitle, { color: theme.colors.text, textAlign: align }]}>{profile.displayName}</Text>
                  <Text numberOfLines={1} style={[styles.profileText, { color: theme.colors.muted, textAlign: align }]}>{profile.bio || t("localProfileHint")}</Text>
                </View>
              </View>
              <View style={[styles.profileLine, { borderTopColor: theme.colors.border, flexDirection: direction }]}>
                <View style={[styles.profileDot, { backgroundColor: preferences.bassBoost ? theme.colors.primary : theme.colors.muted }]} />
                <Text style={[styles.profileStatus, { color: theme.colors.muted }]}>{t("editProfile")}</Text>
              </View>
            </Pressable>

            <Text style={[styles.groupLabel, { color: theme.colors.muted, textAlign: align }]}>{t("mediaAndLibrary")}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t("manageListening")} accessibilityHint={t("queueStatus")} onPress={() => router.push("/(tabs)/tools" as never)} style={({ pressed }) => [styles.sessionRoute, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow, flexDirection: direction }, pressed && styles.pressed]}>
              <View style={[styles.routeIcon, { backgroundColor: `${theme.colors.primary}1A` }]}><MaterialIcons name="queue-music" size={21} color={theme.colors.primary} /></View>
              <View style={styles.routeCopy}><Text style={[styles.routeTitle, { color: theme.colors.text, textAlign: align }]}>{t("manageListening")}</Text><Text style={[styles.routeText, { color: theme.colors.muted, textAlign: align }]}>{snapshot.queueLength ? `${snapshot.queueLength} ${t("queueStatus")}` : t("queueStatusEmpty")}{snapshot.sleepTimerEndsAt ? ` · ${t("sleepTimer")}` : ""}</Text></View>
              <MaterialIcons name={isRTL ? "chevron-left" : "chevron-right"} size={23} color={theme.colors.muted} />
            </Pressable>

            <Pressable accessibilityRole="button" accessibilityLabel={t("videoLibrary")} accessibilityHint={t("videoLocalOnly")} onPress={() => router.push("/(tabs)/videos" as never)} style={({ pressed }) => [styles.sessionRoute, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow, flexDirection: direction, marginTop: 8 }, pressed && styles.pressed]}>
              <View style={[styles.routeIcon, { backgroundColor: `${theme.colors.accent}1A` }]}><MaterialIcons name="video-library" size={21} color={theme.colors.accent} /></View>
              <View style={styles.routeCopy}><Text style={[styles.routeTitle, { color: theme.colors.text, textAlign: align }]}>{t("videoLibrary")}</Text><Text style={[styles.routeText, { color: theme.colors.muted, textAlign: align }]}>{t("videoLocalOnly")}</Text></View>
              <MaterialIcons name={isRTL ? "chevron-left" : "chevron-right"} size={23} color={theme.colors.muted} />
            </Pressable>

            <Text style={[styles.groupLabel, { color: theme.colors.muted, textAlign: align }]}>{t("appearance")}</Text>
            <View style={[styles.pickerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.pickerTitleRow, { flexDirection: direction }]}>
                <View style={[styles.settingIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="language" size={20} color={theme.colors.primary} /></View>
                <View style={styles.pickerCopy}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("language")}</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{LOCALE_META[locale].nativeName}</Text>
                </View>
              </View>
              <View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>
                {SUPPORTED_LOCALES.map((code) => {
                  const selected = locale === code;
                  return <Pressable key={code} accessibilityRole="radio" accessibilityLabel={LOCALE_META[code].nativeName} accessibilityState={{ selected }} onPress={() => setLocale(code)} style={({ pressed }) => [styles.choice, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? `${theme.colors.primary}16` : theme.colors.surfaceMuted }, pressed && styles.pressed]}><Text style={[styles.choiceText, { color: selected ? theme.colors.primary : theme.colors.muted }]}>{LOCALE_META[code].nativeName}</Text></Pressable>;
                })}
              </View>
            </View>

            <AccessibilityFeedback pulseKey={accessibilityPulse}><View style={[styles.themePickerCard, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}>
              <View style={[styles.pickerTitleRow, { flexDirection: direction }]}>
                <View style={[styles.settingIcon, { backgroundColor: `${theme.colors.secondary}18` }]}><MaterialIcons name="palette" size={20} color={theme.colors.secondary} /></View>
                <View style={styles.pickerCopy}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("themes")}</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{`${selectedThemeName} · ${t("themePaletteHint")}`}</Text>
                </View>
                <View style={[styles.selectedThemeMark, { backgroundColor: `${theme.colors.primary}18`, borderColor: `${theme.colors.primary}42` }]}><MaterialIcons name="check-circle" size={16} color={theme.colors.primary} /></View>
              </View>
              <View accessibilityRole="radiogroup" style={styles.themeGrid}>
                {THEME_IDS.map((id) => {
                  const option = APP_THEMES[id];
                  const selected = id === themeId;
                  const description = themeDescriptions[id] ?? t("themePaletteHint");
                  return <Pressable key={id} accessibilityRole="radio" accessibilityLabel={`${themeLabels[id]}. ${description}`} accessibilityHint={t("themePreviewHint")} accessibilityState={{ selected }} onPress={() => setThemePreviewId(id)} style={({ pressed }) => [styles.themeOption, interfaceDensity === "compact" && styles.themeOptionCompact, { borderColor: selected ? theme.colors.primary : option.colors.glassBorder, backgroundColor: option.colors.glassStrong, shadowColor: option.colors.shadow }, selected && { borderWidth: 2, shadowColor: option.colors.primary, shadowOpacity: theme.isDark ? 0.2 : 0.14, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 }, pressed && styles.pressed]}>
                    <View style={[styles.themeSwatch, { backgroundColor: option.colors.background }]}><View style={[styles.themeDot, { backgroundColor: option.colors.primary }]} /><View style={[styles.themeLine, { backgroundColor: option.colors.text }]} /><View style={[styles.themeAccentLine, { backgroundColor: option.colors.secondary }]} />{selected ? <View style={[styles.themeCheck, { backgroundColor: option.colors.primary }]}><MaterialIcons name="check" size={11} color={option.colors.onPrimary} /></View> : null}</View>
                    <Text numberOfLines={1} style={[styles.themeName, { color: selected ? theme.colors.primary : option.colors.text }]}>{themeLabels[id]}</Text>
                    <Text numberOfLines={2} style={[styles.themeDescription, { color: selected ? option.colors.primary : option.colors.muted }]}>{description}</Text>
                  </Pressable>;
                })}
              </View>
            </View></AccessibilityFeedback>

            <Modal visible={Boolean(previewTheme)} transparent animationType="fade" onRequestClose={() => setThemePreviewId(null)}><View style={styles.themePreviewBackdrop}><View accessibilityViewIsModal style={[styles.themePreviewModal, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>{previewTheme && themePreviewId ? <><View style={[styles.themePreviewModalHeader, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${previewTheme.colors.primary}1D` }]}><MaterialIcons name="preview" size={20} color={previewTheme.colors.primary} /></View><View style={styles.pickerCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("themePreview")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{themeLabels[themePreviewId]}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={t("close")} onPress={() => setThemePreviewId(null)} style={({ pressed }) => [styles.previewClose, { backgroundColor: theme.colors.surfaceMuted }, pressed && styles.pressed]}><MaterialIcons name="close" size={19} color={theme.colors.text} /></Pressable></View><Text style={[styles.themePreviewDescription, { color: theme.colors.muted, textAlign: align }]}>{t("themePreviewHint")}</Text><View style={[styles.homePreviewCanvas, { backgroundColor: previewTheme.colors.background }]}><View style={[styles.homePreviewTop, { flexDirection: direction }]}><View style={[styles.homePreviewBrand, { flexDirection: direction }]}><View style={[styles.homePreviewBrandDot, { backgroundColor: previewTheme.colors.primary }]} /><Text style={[styles.homePreviewBrandText, { color: previewTheme.colors.primary }]}>{"OMNIWAVE"}</Text></View><MaterialIcons name="tune" size={17} color={previewTheme.colors.text} /></View><Text style={[styles.homePreviewHeading, { color: previewTheme.colors.text, textAlign: align }]}>{t("appTagline")}</Text><View style={[styles.homePreviewSession, { backgroundColor: previewTheme.colors.surface, borderColor: previewTheme.colors.border, flexDirection: direction }]}><View style={[styles.homePreviewArt, { backgroundColor: previewTheme.colors.primary }]}><MaterialIcons name="music-note" size={22} color={previewTheme.colors.onPrimary} /></View><View style={styles.homePreviewCopy}><Text style={[styles.homePreviewTitle, { color: previewTheme.colors.text, textAlign: align }]}>{t("nowPlaying")}</Text><Text style={[styles.homePreviewText, { color: previewTheme.colors.muted, textAlign: align }]}>{t("readyToPlay")}</Text></View><MaterialIcons name="play-circle-filled" size={29} color={previewTheme.colors.primary} /></View><View style={[styles.homePreviewQuickRow, { flexDirection: direction }]}><View style={[styles.homePreviewQuick, { backgroundColor: previewTheme.colors.surfaceMuted, borderColor: previewTheme.colors.border }]}><MaterialIcons name="favorite" size={16} color={previewTheme.colors.accent} /><Text style={[styles.homePreviewQuickText, { color: previewTheme.colors.text }]}>{t("favorites")}</Text></View><View style={[styles.homePreviewQuick, { backgroundColor: previewTheme.colors.surfaceMuted, borderColor: previewTheme.colors.border }]}><MaterialIcons name="queue-music" size={16} color={previewTheme.colors.secondary} /><Text style={[styles.homePreviewQuickText, { color: previewTheme.colors.text }]}>{t("playlists")}</Text></View></View><View style={[styles.homePreviewNav, { backgroundColor: previewTheme.colors.surface, borderColor: previewTheme.colors.border, flexDirection: direction }]}><MaterialIcons name="home" size={16} color={previewTheme.colors.primary} /><MaterialIcons name="library-music" size={16} color={previewTheme.colors.muted} /><MaterialIcons name="video-library" size={16} color={previewTheme.colors.muted} /><MaterialIcons name="settings" size={16} color={previewTheme.colors.muted} /></View></View><View style={[styles.themePreviewActions, { flexDirection: direction }]}><Pressable accessibilityRole="button" accessibilityLabel={t("cancel")} onPress={() => setThemePreviewId(null)} style={({ pressed }) => [styles.previewCancel, { backgroundColor: theme.colors.surfaceMuted }, pressed && styles.pressed]}><Text style={[styles.previewCancelText, { color: theme.colors.muted }]}>{t("cancel")}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("applyTheme")} onPress={() => { setThemeId(themePreviewId); haptic.selection(); pulseAccessibility(); setThemePreviewId(null); }} style={({ pressed }) => [styles.previewApply, { backgroundColor: previewTheme.colors.primary }, pressed && styles.pressed]}><Text style={[styles.previewApplyText, { color: previewTheme.colors.onPrimary }]}>{t("applyTheme")}</Text></Pressable></View></> : null}</View></View></Modal>

            <ThemePreviewModal visible={Boolean(previewTheme)} theme={previewTheme} themeName={themePreviewId ? themeLabels[themePreviewId] : ""} isRTL={isRTL} labels={{ preview: t("themePreview"), hint: t("themePreviewHint"), close: t("close"), cancel: t("cancel"), apply: t("applyTheme"), appTagline: t("appTagline"), nowPlaying: t("nowPlaying"), readyToPlay: t("readyToPlay"), favorites: t("favorites"), playlists: t("playlists"), player: t("nowPlaying"), queue: t("queuePreview"), settings: t("settingsPreview"), library: t("libraryPreview"), videos: t("videos"), addFiles: t("addFiles"), addVideos: t("addVideos") }} onClose={() => setThemePreviewId(null)} onApply={() => { if (!themePreviewId) return; setThemeId(themePreviewId); haptic.selection(); pulseAccessibility(); setThemePreviewId(null); }} />

            <View style={[styles.settingRow, { flexDirection: direction, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 }]}>
              <View style={[styles.rowHeader, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.secondary}18` }]}><MaterialIcons name={theme.isDark ? "dark-mode" : "light-mode"} size={20} color={theme.colors.secondary} /></View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("darkMode")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("darkModeHint")}</Text></View></View>
              <Switch accessibilityRole="switch" accessibilityLabel={t("darkMode")} accessibilityHint={t("darkModeHint")} accessibilityState={{ checked: colorScheme === "dark" }} value={colorScheme === "dark"} onValueChange={(enabled) => setColorScheme(enabled ? "dark" : "light")} trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}88` }} thumbColor={colorScheme === "dark" ? theme.colors.primary : theme.colors.text} />
            </View>
            <View style={[styles.settingRow, { flexDirection: direction, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 }]}>
              <View style={[styles.rowHeader, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="drag-indicator" size={20} color={theme.colors.primary} /></View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("appearanceShortcut")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("appearanceShortcut")}. {t("dragToReorder")}</Text></View></View>
              <Switch accessibilityRole="switch" accessibilityLabel={t("appearanceShortcut")} accessibilityHint={t("dragToReorder")} accessibilityState={{ checked: appearanceShortcutEnabled }} value={appearanceShortcutEnabled} onValueChange={setAppearanceShortcutEnabled} trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}88` }} thumbColor={appearanceShortcutEnabled ? theme.colors.primary : theme.colors.text} />
            </View>
            <View style={[styles.settingRow, { flexDirection: direction, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 }]}>
              <View style={[styles.rowHeader, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.accent}18` }]}><MaterialIcons name="vibration" size={20} color={theme.colors.accent} /></View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("hapticFeedback")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("hapticFeedbackHint")}</Text></View></View>
              <Switch accessibilityRole="switch" accessibilityLabel={t("hapticFeedback")} accessibilityHint={t("hapticFeedbackHint")} accessibilityState={{ checked: hapticFeedbackEnabled }} value={hapticFeedbackEnabled} onValueChange={setHapticFeedbackEnabled} trackColor={{ false: theme.colors.border, true: `${theme.colors.accent}88` }} thumbColor={hapticFeedbackEnabled ? theme.colors.accent : theme.colors.text} />
            </View>
            <View style={[styles.settingRow, { flexDirection: direction, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 }]}>
              <View style={[styles.rowHeader, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="brightness-auto" size={20} color={theme.colors.primary} /></View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("systemAppearance")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("systemAppearanceHint")}</Text></View></View>
              <Switch accessibilityRole="switch" accessibilityLabel={t("systemAppearance")} accessibilityHint={t("systemAppearanceHint")} accessibilityState={{ checked: followSystemAppearance }} value={followSystemAppearance} onValueChange={setFollowSystemAppearance} trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}88` }} thumbColor={followSystemAppearance ? theme.colors.primary : theme.colors.text} />
            </View>
            <View style={[styles.settingRow, { flexDirection: direction, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 }]}>
              <View style={[styles.rowHeader, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.accent}18` }]}><MaterialIcons name="contrast" size={20} color={theme.colors.accent} /></View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("highContrast")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("highContrastHint")}</Text></View></View>
              <Switch accessibilityRole="switch" accessibilityLabel={t("highContrast")} accessibilityHint={t("highContrastHint")} accessibilityState={{ checked: highContrast }} value={highContrast} onValueChange={(enabled) => { setHighContrast(enabled); haptic.medium(); pulseAccessibility(); }} trackColor={{ false: theme.colors.border, true: `${theme.colors.accent}88` }} thumbColor={highContrast ? theme.colors.accent : theme.colors.text} />
            </View>
            <View style={[styles.contrastPreviewCard, { backgroundColor: contrastPreview.background, borderColor: contrastPreview.border }]}><View style={[styles.contrastPreviewHeader, { flexDirection: direction }]}><MaterialIcons name="preview" size={18} color={contrastPreview.primary} /><Text style={[styles.contrastPreviewLabel, { color: contrastPreview.text, textAlign: align, fontWeight: fontWeightValue }]}>{t("highContrastPreview")}</Text></View><View style={[styles.contrastSample, { backgroundColor: contrastPreview.surface, borderColor: contrastPreview.border, flexDirection: direction }]}><View style={[styles.contrastSampleDot, { backgroundColor: contrastPreview.primary }]} /><View style={styles.contrastSampleCopy}><Text style={[styles.contrastSampleTitle, { color: contrastPreview.text, textAlign: align, fontWeight: fontWeightValue }]}>{t("nowPlaying")}</Text><Text style={[styles.contrastSampleText, { color: contrastPreview.muted, textAlign: align, fontWeight: fontWeightValue }]}>{t("textPreviewBody")}</Text></View></View><Text style={[styles.contrastAccentHint, { color: contrastPreview.muted, textAlign: align, fontWeight: fontWeightValue }]}>{t("highContrastAccentHint")}</Text><View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{HIGH_CONTRAST_ACCENTS.map((option) => { const selected = highContrastAccent === option.value; return <Pressable key={option.value} accessibilityRole="radio" accessibilityLabel={highContrastAccentLabels[option.value]} accessibilityState={{ selected }} onPress={() => { setHighContrastAccent(option.value); haptic.selection(); pulseAccessibility(); }} style={({ pressed }) => [styles.choice, { borderColor: selected ? contrastPreview.primary : contrastPreview.border, backgroundColor: selected ? `${contrastPreview.primary}20` : contrastPreview.surface }, pressed && styles.pressed]}><View style={[styles.contrastAccentDot, { backgroundColor: option.swatch }]} />{selected ? <MaterialIcons name="check" size={14} color={contrastPreview.primary} /> : null}<Text style={[styles.choiceText, { color: selected ? contrastPreview.primary : contrastPreview.muted, fontWeight: fontWeightValue }]}>{highContrastAccentLabels[option.value]}</Text></Pressable>; })}</View></View>
            <View style={[styles.pickerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.pickerTitleRow, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.accent}18` }]}><MaterialIcons name="format-size" size={20} color={theme.colors.accent} /></View><View style={styles.pickerCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("appearanceDensity")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{interfaceDensity === "comfortable" ? t("densityComfortableHint") : t("densityCompactHint")}</Text></View></View>
              <View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{DENSITIES.map((density) => { const selected = interfaceDensity === density; const label = density === "comfortable" ? t("densityComfortable") : t("densityCompact"); return <Pressable key={density} accessibilityRole="radio" accessibilityLabel={label} accessibilityHint={density === "comfortable" ? t("densityComfortableHint") : t("densityCompactHint")} accessibilityState={{ selected }} onPress={() => setInterfaceDensity(density)} style={({ pressed }) => [styles.choice, styles.densityChoice, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? `${theme.colors.primary}16` : theme.colors.surfaceMuted }, pressed && styles.pressed]}><MaterialIcons name={density === "comfortable" ? "format-line-spacing" : "density-small"} size={17} color={selected ? theme.colors.primary : theme.colors.muted} /><Text style={[styles.choiceText, { color: selected ? theme.colors.primary : theme.colors.muted }]}>{label}</Text></Pressable>; })}</View>
            </View>
            <AccessibilityFeedback pulseKey={accessibilityPulse}><View style={[styles.pickerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.pickerTitleRow, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.accent}18` }]}><MaterialIcons name="text-fields" size={20} color={theme.colors.accent} /></View><View style={styles.pickerCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("textSize")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("textSizeHint")}</Text></View></View>
              <View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{TEXT_SCALES.map((scale) => { const selected = textScale === scale; return <Pressable key={scale} accessibilityRole="radio" accessibilityLabel={textScaleLabels[scale]} accessibilityState={{ selected }} onFocus={pulseAccessibility} onPress={() => { setTextScale(scale); haptic.selection(); pulseAccessibility(); }} style={({ pressed }) => [styles.choice, { borderColor: selected ? theme.colors.accent : theme.colors.border, backgroundColor: selected ? `${theme.colors.accent}16` : theme.colors.surfaceMuted }, pressed && styles.pressed]}><Text style={[styles.choiceText, { color: selected ? theme.colors.accent : theme.colors.muted, fontWeight: fontWeightValue }]}>{textScaleLabels[scale]}</Text></Pressable>; })}</View>
            </View></AccessibilityFeedback>
            <AccessibilityFeedback pulseKey={accessibilityPulse}><View style={[styles.pickerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={[styles.pickerTitleRow, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="format-bold" size={20} color={theme.colors.primary} /></View><View style={styles.pickerCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("fontWeight")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("fontWeightHint")}</Text></View></View><View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{FONT_WEIGHTS.map((weight) => { const selected = fontWeightPreference === weight; return <Pressable key={weight} accessibilityRole="radio" accessibilityLabel={fontWeightLabels[weight]} accessibilityState={{ selected }} onFocus={pulseAccessibility} onPress={() => { setFontWeightPreference(weight); haptic.selection(); pulseAccessibility(); }} style={({ pressed }) => [styles.choice, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? `${theme.colors.primary}16` : theme.colors.surfaceMuted }, pressed && styles.pressed]}><Text style={[styles.choiceText, { color: selected ? theme.colors.primary : theme.colors.muted, fontWeight: weight === "regular" ? "400" : weight === "medium" ? "600" : "700" }]}>{fontWeightLabels[weight]}</Text></Pressable>; })}</View></View></AccessibilityFeedback>
            <AccessibilityFeedback pulseKey={accessibilityPulse}><View style={[styles.pickerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={[styles.pickerTitleRow, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="format-line-spacing" size={20} color={theme.colors.primary} /></View><View style={styles.pickerCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("lineSpacing")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("lineSpacingHint")}</Text></View></View><View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{LINE_SPACINGS.map((spacing) => { const selected = lineSpacing === spacing; return <Pressable key={spacing} accessibilityRole="radio" accessibilityLabel={lineSpacingLabels[spacing]} accessibilityState={{ selected }} onFocus={pulseAccessibility} onPress={() => { setLineSpacing(spacing); haptic.selection(); pulseAccessibility(); }} style={({ pressed }) => [styles.choice, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? `${theme.colors.primary}16` : theme.colors.surfaceMuted }, pressed && styles.pressed]}><Text style={[styles.choiceText, { color: selected ? theme.colors.primary : theme.colors.muted, fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{lineSpacingLabels[spacing]}</Text></Pressable>; })}</View></View></AccessibilityFeedback>
            <AccessibilityFeedback pulseKey={accessibilityPulse}><View style={[styles.pickerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={[styles.pickerTitleRow, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="font-download" size={20} color={theme.colors.primary} /></View><View style={styles.pickerCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("readingFont")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("readingFontHint")}</Text></View></View><View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{READING_FONTS.map((font) => { const selected = readingFont === font; return <Pressable key={font} accessibilityRole="radio" accessibilityLabel={readingFontLabels[font]} accessibilityState={{ selected }} onFocus={pulseAccessibility} onPress={() => { setReadingFont(font); haptic.selection(); pulseAccessibility(); }} style={({ pressed }) => [styles.choice, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? `${theme.colors.primary}16` : theme.colors.surfaceMuted }, pressed && styles.pressed]}><Text style={[styles.choiceText, { color: selected ? theme.colors.primary : theme.colors.muted, fontWeight: fontWeightValue, fontFamily: font === "dyslexia" ? "OpenDyslexic-Regular" : undefined }]}>{readingFontLabels[font]}</Text></Pressable>; })}</View></View></AccessibilityFeedback>
            <View style={[styles.textPreviewCard, { backgroundColor: `${theme.colors.primary}0D`, borderColor: `${theme.colors.primary}45` }]}><View style={[styles.textPreviewHeader, { flexDirection: direction }]}><MaterialIcons name="visibility" size={18} color={theme.colors.primary} /><Text style={[styles.textPreviewLabel, { color: theme.colors.primary, textAlign: align, fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{t("textPreviewTitle")}</Text></View><Text style={[styles.textPreviewTitle, { color: theme.colors.text, textAlign: align, fontSize: scaled(18), lineHeight: Math.round(scaled(25) * lineHeightMultiplier), fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{t("nowPlaying")}</Text><Text style={[styles.textPreviewBody, { color: theme.colors.muted, textAlign: align, fontSize: scaled(12), lineHeight: Math.round(scaled(18) * lineHeightMultiplier), fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{t("textPreviewBody")}</Text><AccessibilityPlayerPreview colors={contrastPreview} isRTL={isRTL} textScaleMultiplier={textScaleMultiplier} lineHeightMultiplier={lineHeightMultiplier} fontWeight={fontWeightValue} fontFamily={readingFontFamily} title={t("nowPlaying")} detail={t("textPreviewBody")} label={t("highContrastPreview")} /><AccessibilityLibraryPreview colors={contrastPreview} isRTL={isRTL} textScaleMultiplier={textScaleMultiplier} lineHeightMultiplier={lineHeightMultiplier} fontWeight={fontWeightValue} fontFamily={readingFontFamily} title={t("library")} detail={t("textPreviewBody")} label={t("libraryPreview")} /></View>
            <AccessibilityFeedback pulseKey={accessibilityPulse}><Pressable accessibilityRole="button" accessibilityLabel={t("resetAccessibility")} accessibilityHint={t("resetAccessibilityHint")} onFocus={pulseAccessibility} onPress={() => { resetAccessibilityPreferences(); pulseAccessibility(); }} style={({ pressed }) => [styles.resetButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted, flexDirection: direction, marginTop: 0, marginBottom: 8 }, pressed && styles.pressed]}><MaterialIcons name="accessibility-new" size={18} color={theme.colors.primary} /><View style={styles.resetCopy}><Text style={[styles.resetTitle, { color: theme.colors.text, textAlign: align }]}>{t("resetAccessibility")}</Text><Text style={[styles.resetHint, { color: theme.colors.muted, textAlign: align }]}>{t("resetAccessibilityHint")}</Text></View></Pressable></AccessibilityFeedback>
            <Pressable accessibilityRole="button" accessibilityLabel={t("onboardingReplay")} accessibilityHint={t("onboardingReplayHint")} onPress={resetOnboarding} style={({ pressed }) => [styles.sessionRoute, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, flexDirection: direction, marginBottom: 8 }, pressed && styles.pressed]}><View style={[styles.routeIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="auto-stories" size={21} color={theme.colors.primary} /></View><View style={styles.routeCopy}><Text style={[styles.routeTitle, { color: theme.colors.text, textAlign: align }]}>{t("onboardingReplay")}</Text><Text style={[styles.routeText, { color: theme.colors.muted, textAlign: align }]}>{t("onboardingReplayHint")}</Text></View><MaterialIcons name={isRTL ? "chevron-left" : "chevron-right"} size={23} color={theme.colors.muted} /></Pressable>

            <Text style={[styles.groupLabel, { color: theme.colors.muted, textAlign: align, marginTop: 22 }]}>{t("audio")}</Text>
            <View style={[styles.settingRow, { flexDirection: direction, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 }]}>
              <View style={[styles.rowHeader, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.secondary}18` }]}><MaterialIcons name="auto-awesome" size={20} color={theme.colors.secondary} /></View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("metadataAssistant")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("metadataHint")}</Text></View></View>
              <Switch accessibilityRole="switch" accessibilityLabel={t("metadataAssistant")} accessibilityState={{ checked: preferences.aiMetadataEnabled }} value={preferences.aiMetadataEnabled} onValueChange={(next) => updatePreference("aiMetadataEnabled", next)} trackColor={{ false: theme.colors.border, true: `${theme.colors.secondary}88` }} thumbColor={preferences.aiMetadataEnabled ? theme.colors.secondary : theme.colors.text} />
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t("reviewMetadata")} accessibilityHint={t("metadataReviewHint")} onPress={() => router.push("/(tabs)/metadata-review" as never)} style={({ pressed }) => [styles.sessionRoute, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, flexDirection: direction, marginBottom: 12 }, pressed && styles.pressed]}><View style={[styles.routeIcon, { backgroundColor: `${theme.colors.secondary}1A` }]}><MaterialIcons name="fact-check" size={21} color={theme.colors.secondary} /></View><View style={styles.routeCopy}><Text style={[styles.routeTitle, { color: theme.colors.text, textAlign: align }]}>{t("reviewMetadata")}</Text><Text numberOfLines={2} style={[styles.routeText, { color: theme.colors.muted, textAlign: align }]}>{t("metadataReviewHint")}</Text></View><MaterialIcons name={isRTL ? "chevron-left" : "chevron-right"} size={23} color={theme.colors.muted} /></Pressable>
            <View style={[styles.pickerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.pickerTitleRow, { flexDirection: direction }]}>
                <View style={[styles.settingIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="high-quality" size={20} color={theme.colors.primary} /></View>
                <View style={styles.pickerCopy}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("playbackQuality")}</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{preferences.playbackQuality === "high" ? t("high") : t("standard")}</Text>
                </View>
              </View>
              <View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>
                {(["standard", "high"] as const).map((quality) => {
                  const selected = preferences.playbackQuality === quality;
                  return <Pressable key={quality} accessibilityRole="radio" accessibilityLabel={quality === "high" ? t("high") : t("standard")} accessibilityState={{ selected }} onPress={() => updatePreference("playbackQuality", quality)} style={({ pressed }) => [styles.choice, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: selected ? `${theme.colors.primary}16` : theme.colors.surfaceMuted }, pressed && styles.pressed]}><Text style={[styles.choiceText, { color: selected ? theme.colors.primary : theme.colors.muted }]}>{quality === "high" ? t("high") : t("standard")}</Text></Pressable>;
                })}
              </View>
            </View>
            <Text style={[styles.groupLabel, { color: theme.colors.muted, textAlign: align, marginTop: 10 }]}>{t("tuneExperience")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.settingRow, { flexDirection: direction, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={[styles.rowHeader, { flexDirection: direction }]}>
              <View style={[styles.settingIcon, { backgroundColor: `${theme.colors.secondary}18` }]}><MaterialIcons name={item.icon} size={20} color={theme.colors.secondary} /></View>
              <View style={styles.settingCopy}>
                <Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t(item.titleKey)}</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("preferencesSaved")}</Text>
              </View>
            </View>
            <Switch accessibilityRole="switch" accessibilityLabel={t(item.titleKey)} accessibilityState={{ checked: Boolean(preferences[item.id]) }} value={Boolean(preferences[item.id])} onValueChange={(next) => updatePreference(item.id, next)} trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}88` }} thumbColor={preferences[item.id] ? theme.colors.primary : theme.colors.text} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.effectSeparator} />}
        ListFooterComponent={
          <View style={[styles.eqCard, { backgroundColor: theme.colors.surface, borderColor: `${theme.colors.primary}55` }]}>
            <View style={[styles.rowHeader, { flexDirection: direction }]}>
              <View style={[styles.settingIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="equalizer" size={20} color={theme.colors.primary} /></View>
              <View style={styles.settingCopy}>
                <Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("equalizer")}</Text>
                <Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("preferencesSaved")}</Text>
              </View>
            </View>
            <View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction, marginTop: 12 }]}>{EQ_PRESETS.map((preset) => <Pressable key={preset.id} accessibilityRole="radio" accessibilityLabel={t(preset.labelKey)} accessibilityState={{ selected: preferences.equalizerPreset === preset.id }} onPress={() => applyEqualizerPreset(preset.id)} style={({ pressed }) => [styles.choice, { borderColor: preferences.equalizerPreset === preset.id ? theme.colors.primary : theme.colors.border, backgroundColor: preferences.equalizerPreset === preset.id ? `${theme.colors.primary}16` : theme.colors.surfaceMuted }, pressed && styles.pressed]}><Text style={[styles.choiceText, { color: preferences.equalizerPreset === preset.id ? theme.colors.primary : theme.colors.muted }]}>{t(preset.labelKey)}</Text></Pressable>)}</View>
            <View style={[styles.eqBars, { flexDirection: direction }]}>
              {preferences.eq.map((value, index) => <Pressable key={EQ_LABELS[index]} accessibilityRole="button" accessibilityLabel={`${t("equalizer")} ${EQ_LABELS[index]}`} accessibilityHint={`${value} dB`} onPress={() => updateEqBand(index, value >= 6 ? -4 : value + 2)} style={({ pressed }) => [styles.eqBand, pressed && styles.pressed]}><View style={[styles.eqTrack, { backgroundColor: theme.colors.surfaceMuted }]}><View style={[styles.eqFill, { height: `${Math.max(12, ((value + 10) / 20) * 100)}%`, backgroundColor: theme.colors.primary }]} /></View><Text style={[styles.eqLabel, { color: theme.colors.muted }]}>{EQ_LABELS[index]}</Text></Pressable>)}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={t("resetAudio")} accessibilityHint={t("resetAudioHint")} onPress={resetAudioPreferences} style={({ pressed }) => [styles.resetButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted, flexDirection: direction }, pressed && styles.pressed]}><MaterialIcons name="restart-alt" size={18} color={theme.colors.primary} /><View style={styles.resetCopy}><Text style={[styles.resetTitle, { color: theme.colors.text, textAlign: align }]}>{t("resetAudio")}</Text><Text style={[styles.resetHint, { color: theme.colors.muted, textAlign: align }]}>{t("resetAudioHint")}</Text></View></Pressable>
            <View style={[styles.privacyCard, { backgroundColor: `${theme.colors.primary}10`, borderColor: `${theme.colors.primary}3D`, flexDirection: direction }]}><MaterialIcons name="verified-user" size={19} color={theme.colors.primary} /><View style={styles.privacyCopy}><Text style={[styles.privacyTitle, { color: theme.colors.text, textAlign: align }]}>{t("privacyTitle")}</Text><Text style={[styles.privacyText, { color: theme.colors.muted, textAlign: align }]}>{t("privacyDetail")}</Text></View></View>
          </View>
        }
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: 12, paddingBottom: 148 }, contentCompact: { paddingTop: 8, paddingBottom: 132 },
  headingBlock: { marginBottom: 14 },
  eyebrow: { fontSize: 10, lineHeight: 15, fontWeight: "900", letterSpacing: 1.9 },
  heading: { fontSize: 30, lineHeight: 38, fontWeight: "900" },
  settingsOverview: { fontSize: 11, lineHeight: 17, marginTop: 3, maxWidth: 340 },
  settingsSnapshot: { minHeight: 91, marginBottom: 17, paddingHorizontal: 8, borderRadius: 24, borderWidth: 1, alignItems: "center", justifyContent: "space-around", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  snapshotItem: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 4, gap: 3 },
  snapshotIcon: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  snapshotValue: { maxWidth: "100%", fontSize: 10, lineHeight: 14, fontWeight: "900", textAlign: "center" },
  snapshotLabel: { fontSize: 8, lineHeight: 11, fontWeight: "800", textAlign: "center" },
  snapshotDivider: { width: StyleSheet.hairlineWidth, height: 44 },
  profileCard: { padding: 17, borderRadius: 25, borderWidth: 1, marginBottom: 25, shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  profileHeader: { alignItems: "center", gap: 13 },
  profileMark: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  profileCopy: { flex: 1 },
  profileOverline: { fontSize: 10, lineHeight: 14, fontWeight: "800" },
  profileTitle: { fontSize: 17, lineHeight: 23, fontWeight: "900" },
  profileText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  profileLine: { alignItems: "center", justifyContent: "flex-start", gap: 7, marginTop: 16, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth },
  profileDot: { width: 7, height: 7, borderRadius: 4 },
  profileStatus: { fontSize: 11, lineHeight: 15, fontWeight: "700" },
  sessionRoute: { minHeight: 68, borderRadius: 22, borderWidth: 1, paddingHorizontal: 13, alignItems: "center", gap: 11, marginBottom: 22, shadowOpacity: 0.09, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 1 }, routeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, routeCopy: { flex: 1 }, routeTitle: { fontSize: 13, lineHeight: 19, fontWeight: "900" }, routeText: { fontSize: 11, lineHeight: 16, marginTop: 1 },
  groupLabel: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8 },
  pickerCard: { padding: 14, borderRadius: 23, borderWidth: 1, marginBottom: 12, shadowOpacity: 0.1, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 1 }, themePickerCard: { padding: 14, borderRadius: 23, borderWidth: 1, marginBottom: 12, shadowOpacity: 0.1, shadowRadius: 13, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  pickerTitleRow: { alignItems: "center", gap: 12 },
  pickerCopy: { flex: 1 },
  choiceRow: { flexWrap: "wrap", gap: 7, marginTop: 14 },
  choice: { minWidth: 74, minHeight: 38, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  choiceText: { fontSize: 11, lineHeight: 16, fontWeight: "800" }, densityChoice: { flex: 1, minWidth: 132, flexDirection: "row", gap: 7 },
  selectedThemeMark: { width: 30, height: 30, borderRadius: 10, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 15 },
  themeOption: { width: "48%", minHeight: 112, padding: 9, borderRadius: 16, borderWidth: 1 }, themeOptionCompact: { minHeight: 100 },
  themeSwatch: { height: 37, borderRadius: 11, padding: 7, flexDirection: "row", alignItems: "center", gap: 5 },
  themeDot: { width: 10, height: 10, borderRadius: 5 },
  themeLine: { height: 4, width: 22, borderRadius: 4, opacity: 0.85 }, themeAccentLine: { height: 4, width: 12, borderRadius: 4, opacity: 0.9 },
  themeCheck: { width: 18, height: 18, borderRadius: 9, marginLeft: "auto", alignItems: "center", justifyContent: "center" },
  themeName: { fontSize: 10, lineHeight: 14, fontWeight: "900", textAlign: "center", marginTop: 7 }, themeDescription: { fontSize: 8, lineHeight: 11, fontWeight: "700", textAlign: "center", marginTop: 3 },
  settingRow: { minHeight: 82, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, alignItems: "center", justifyContent: "space-between" },
  effectSeparator: { height: 8 },
  rowHeader: { flex: 1, alignItems: "center", gap: 12 },
  settingIcon: { width: 42, height: 42, alignItems: "center", justifyContent: "center", borderRadius: 14 },
  settingCopy: { flex: 1 },
  settingTitle: { fontSize: 14, lineHeight: 20, fontWeight: "900" },
  settingSubtitle: { fontSize: 11, lineHeight: 17, marginTop: 1 },
  eqCard: { marginTop: 18, padding: 16, borderRadius: 22, borderWidth: 1 },
  eqBars: { height: 152, marginTop: 22, alignItems: "flex-end", justifyContent: "space-between", gap: 7 },
  eqBand: { flex: 1, height: "100%", justifyContent: "flex-end", alignItems: "center", gap: 7 },
  eqTrack: { height: 118, width: "100%", maxWidth: 16, borderRadius: 9, justifyContent: "flex-end", overflow: "hidden" },
  eqFill: { width: "100%", borderRadius: 9 },
  eqLabel: { fontSize: 8, lineHeight: 12, fontWeight: "700" },
  textPreviewCard: { marginTop: 12, marginBottom: 10, padding: 13, borderRadius: 18, borderWidth: 1 }, textPreviewHeader: { alignItems: "center", gap: 7 }, textPreviewLabel: { fontSize: 11, lineHeight: 16, fontWeight: "900", flex: 1 }, textPreviewTitle: { marginTop: 9, fontWeight: "900" }, textPreviewBody: { marginTop: 2 },
  contrastPreviewCard: { marginBottom: 12, padding: 13, borderRadius: 20, borderWidth: 2 }, contrastPreviewHeader: { alignItems: "center", gap: 7 }, contrastPreviewLabel: { flex: 1, fontSize: 12, lineHeight: 17, fontWeight: "900" }, contrastSample: { marginTop: 11, padding: 11, borderWidth: 1, borderRadius: 14, alignItems: "center", gap: 9 }, contrastSampleDot: { width: 24, height: 24, borderRadius: 12 }, contrastSampleCopy: { flex: 1 }, contrastSampleTitle: { fontSize: 13, lineHeight: 18, fontWeight: "900" }, contrastSampleText: { fontSize: 10, lineHeight: 15, marginTop: 1 }, contrastAccentHint: { fontSize: 10, lineHeight: 15, marginTop: 10 }, contrastAccentDot: { width: 12, height: 12, borderRadius: 6 },
  resetButton: { marginTop: 17, minHeight: 54, paddingHorizontal: 12, borderWidth: 1, borderRadius: 15, alignItems: "center", gap: 10 },
  resetCopy: { flex: 1 },
  resetTitle: { fontSize: 12, lineHeight: 17, fontWeight: "900" },
  resetHint: { fontSize: 10, lineHeight: 14, marginTop: 1 },
  privacyCard: { marginTop: 12, borderWidth: 1, borderRadius: 15, padding: 12, alignItems: "flex-start", gap: 9 }, privacyCopy: { flex: 1 }, privacyTitle: { fontSize: 12, lineHeight: 17, fontWeight: "900" }, privacyText: { fontSize: 10, lineHeight: 15, marginTop: 1 },
  themePreviewBackdrop: { flex: 1, backgroundColor: "rgba(3, 8, 13, 0.76)", padding: 20, justifyContent: "center" }, themePreviewModal: { width: "100%", maxWidth: 460, alignSelf: "center", maxHeight: "92%", borderRadius: 28, borderWidth: 1, padding: 17 }, themePreviewModalHeader: { alignItems: "center", gap: 10 }, previewClose: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" }, themePreviewDescription: { fontSize: 11, lineHeight: 16, marginTop: 12 }, homePreviewCanvas: { marginTop: 14, borderRadius: 23, padding: 14, overflow: "hidden" }, homePreviewTop: { alignItems: "center", justifyContent: "space-between" }, homePreviewBrand: { alignItems: "center", gap: 5 }, homePreviewBrandDot: { width: 5, height: 5, borderRadius: 3 }, homePreviewBrandText: { fontSize: 9, lineHeight: 12, fontWeight: "900", letterSpacing: 1.5 }, homePreviewHeading: { fontSize: 19, lineHeight: 26, fontWeight: "900", marginTop: 8 }, homePreviewSession: { minHeight: 84, marginTop: 12, padding: 10, borderWidth: 1, borderRadius: 18, alignItems: "center", gap: 9 }, homePreviewArt: { width: 45, height: 45, borderRadius: 15, alignItems: "center", justifyContent: "center" }, homePreviewCopy: { flex: 1 }, homePreviewTitle: { fontSize: 12, lineHeight: 17, fontWeight: "900" }, homePreviewText: { fontSize: 10, lineHeight: 14, marginTop: 1 }, homePreviewQuickRow: { gap: 8, marginTop: 9 }, homePreviewQuick: { flex: 1, minHeight: 51, padding: 8, borderRadius: 14, borderWidth: 1, gap: 4 }, homePreviewQuickText: { fontSize: 9, lineHeight: 13, fontWeight: "900" }, homePreviewNav: { marginTop: 10, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "space-between" }, themePreviewActions: { justifyContent: "flex-start", gap: 9, marginTop: 15 }, previewCancel: { minHeight: 43, paddingHorizontal: 16, borderRadius: 14, alignItems: "center", justifyContent: "center" }, previewCancelText: { fontSize: 12, lineHeight: 17, fontWeight: "900" }, previewApply: { minHeight: 43, paddingHorizontal: 17, borderRadius: 14, alignItems: "center", justifyContent: "center" }, previewApplyText: { fontSize: 12, lineHeight: 17, fontWeight: "900" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
