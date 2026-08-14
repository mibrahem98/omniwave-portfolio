import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { router } from "expo-router";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Switch, Text, View } from "react-native";

import { AccessibilityFeedback } from "@/components/omniwave/accessibility-feedback";
import { AccessibilityPlayerPreview } from "@/components/omniwave/accessibility-player-preview";
import { ScreenContainer } from "@/components/screen-container";
import { EQ_LABELS } from "@/lib/omniwave/data";
import { LOCALE_META, SUPPORTED_LOCALES, TRANSLATIONS } from "@/lib/localization";
import { haptic } from "@/lib/omniwave/haptics";
import { usePlayer } from "@/lib/omniwave/player-store";
import { APP_THEMES, type AppThemeId, type FontWeightPreference, type HighContrastAccent, type InterfaceDensity, type TextScale, useThemeContext } from "@/lib/theme-provider";

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
const HIGH_CONTRAST_ACCENTS: { value: HighContrastAccent; swatch: string; labelKey: "highContrastAccentTeal" | "highContrastAccentViolet" | "highContrastAccentAmber" }[] = [{ value: "teal", swatch: "#39F2D0", labelKey: "highContrastAccentTeal" }, { value: "violet", swatch: "#D1C4FF", labelKey: "highContrastAccentViolet" }, { value: "amber", swatch: "#FFE58C", labelKey: "highContrastAccentAmber" }];

export default function SettingsScreen() {
  const { preferences, profile, snapshot, updatePreference, updateEqBand, resetAudioPreferences } = usePlayer();
  const { theme, themeId, setThemeId, interfaceDensity, setInterfaceDensity, textScale, textScaleMultiplier, setTextScale, fontWeightPreference, fontWeightValue, setFontWeightPreference, resetAccessibilityPreferences, highContrast, setHighContrast, highContrastAccent, setHighContrastAccent, followSystemAppearance, setFollowSystemAppearance, colorScheme, setColorScheme, locale, setLocale, resetOnboarding, isRTL, t } = useThemeContext();
  const align = isRTL ? "right" : "left";
  const direction = isRTL ? "row-reverse" : "row";
  const themeLabels: Record<AppThemeId, string> = { ...TRANSLATIONS[locale].themeNames, cloud: t("themeCloud"), tidal: t("themeTidal"), porcelain: t("themePorcelain") };
  const themeDescriptions: Partial<Record<AppThemeId, string>> = { cloud: t("themeCloudHint"), tidal: t("themeTidalHint"), porcelain: t("themePorcelainHint") };
  const textScaleLabels: Record<TextScale, string> = { standard: t("textScaleStandard"), large: t("textScaleLarge"), extraLarge: t("textScaleExtraLarge") };
  const fontWeightLabels: Record<FontWeightPreference, string> = { regular: t("fontWeightRegular"), medium: t("fontWeightMedium"), bold: t("fontWeightBold") };
  const highContrastAccentLabels: Record<HighContrastAccent, string> = { teal: t("highContrastAccentTeal"), violet: t("highContrastAccentViolet"), amber: t("highContrastAccentAmber") };
  const selectedThemeName = themeLabels[themeId];
  const scaled = (value: number) => Math.round(value * textScaleMultiplier);
  const contrastPreview = theme.isDark ? { background: "#000000", surface: "#101010", text: "#FFFFFF", muted: "#F2F2F2", border: "#FFFFFF", primary: HIGH_CONTRAST_ACCENTS.find((option) => option.value === highContrastAccent)?.swatch ?? "#39F2D0" } : { background: "#FFFFFF", surface: "#F4F4F4", text: "#000000", muted: "#1E1E1E", border: "#111111", primary: highContrastAccent === "teal" ? "#005C43" : highContrastAccent === "violet" ? "#40258B" : "#6A4700" };
  const [accessibilityPulse, setAccessibilityPulse] = useState(0);
  const pulseAccessibility = () => setAccessibilityPulse((value) => value + 1);

  return (
    <ScreenContainer className="px-5">
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
            </View>

            <Pressable accessibilityRole="button" accessibilityLabel={t("profile")} accessibilityHint={t("editProfile")} onPress={() => router.push("/(tabs)/profile" as never)} style={({ pressed }) => [styles.profileCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, pressed && styles.pressed]}>
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

            <Pressable accessibilityRole="button" accessibilityLabel={t("manageListening")} accessibilityHint={t("queueStatus")} onPress={() => router.push("/(tabs)/tools" as never)} style={({ pressed }) => [styles.sessionRoute, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, flexDirection: direction }, pressed && styles.pressed]}>
              <View style={[styles.routeIcon, { backgroundColor: `${theme.colors.primary}1A` }]}><MaterialIcons name="queue-music" size={21} color={theme.colors.primary} /></View>
              <View style={styles.routeCopy}><Text style={[styles.routeTitle, { color: theme.colors.text, textAlign: align }]}>{t("manageListening")}</Text><Text style={[styles.routeText, { color: theme.colors.muted, textAlign: align }]}>{snapshot.queueLength ? `${snapshot.queueLength} ${t("queueStatus")}` : t("queueStatusEmpty")}{snapshot.sleepTimerEndsAt ? ` · ${t("sleepTimer")}` : ""}</Text></View>
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

              <View style={[styles.settingRow, { flexDirection: direction, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, marginBottom: 8 }]}>
              <View style={[styles.rowHeader, { flexDirection: direction }]}><View style={[styles.settingIcon, { backgroundColor: `${theme.colors.secondary}18` }]}><MaterialIcons name={theme.isDark ? "dark-mode" : "light-mode"} size={20} color={theme.colors.secondary} /></View><View style={styles.settingCopy}><Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("darkMode")}</Text><Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{t("darkModeHint")}</Text></View></View>
              <Switch accessibilityRole="switch" accessibilityLabel={t("darkMode")} accessibilityHint={t("darkModeHint")} accessibilityState={{ checked: colorScheme === "dark" }} value={colorScheme === "dark"} onValueChange={(enabled) => setColorScheme(enabled ? "dark" : "light")} trackColor={{ false: theme.colors.border, true: `${theme.colors.primary}88` }} thumbColor={colorScheme === "dark" ? theme.colors.primary : theme.colors.text} />
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
            <View style={[styles.textPreviewCard, { backgroundColor: `${theme.colors.primary}0D`, borderColor: `${theme.colors.primary}45` }]}><View style={[styles.textPreviewHeader, { flexDirection: direction }]}><MaterialIcons name="visibility" size={18} color={theme.colors.primary} /><Text style={[styles.textPreviewLabel, { color: theme.colors.primary, textAlign: align, fontWeight: fontWeightValue }]}>{t("textPreviewTitle")}</Text></View><Text style={[styles.textPreviewTitle, { color: theme.colors.text, textAlign: align, fontSize: scaled(18), lineHeight: scaled(25), fontWeight: fontWeightValue }]}>{t("nowPlaying")}</Text><Text style={[styles.textPreviewBody, { color: theme.colors.muted, textAlign: align, fontSize: scaled(12), lineHeight: scaled(18), fontWeight: fontWeightValue }]}>{t("textPreviewBody")}</Text><AccessibilityPlayerPreview colors={contrastPreview} isRTL={isRTL} textScaleMultiplier={textScaleMultiplier} fontWeight={fontWeightValue} title={t("nowPlaying")} detail={t("textPreviewBody")} label={t("highContrastPreview")} /></View>
            <AccessibilityFeedback pulseKey={accessibilityPulse}><Pressable accessibilityRole="button" accessibilityLabel={t("resetAccessibility")} accessibilityHint={t("resetAccessibilityHint")} onFocus={pulseAccessibility} onPress={() => { resetAccessibilityPreferences(); pulseAccessibility(); }} style={({ pressed }) => [styles.resetButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted, flexDirection: direction, marginTop: 0, marginBottom: 8 }, pressed && styles.pressed]}><MaterialIcons name="accessibility-new" size={18} color={theme.colors.primary} /><View style={styles.resetCopy}><Text style={[styles.resetTitle, { color: theme.colors.text, textAlign: align }]}>{t("resetAccessibility")}</Text><Text style={[styles.resetHint, { color: theme.colors.muted, textAlign: align }]}>{t("resetAccessibilityHint")}</Text></View></Pressable></AccessibilityFeedback>
            <Pressable accessibilityRole="button" accessibilityLabel={t("onboardingReplay")} accessibilityHint={t("onboardingReplayHint")} onPress={resetOnboarding} style={({ pressed }) => [styles.sessionRoute, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, flexDirection: direction, marginBottom: 8 }, pressed && styles.pressed]}><View style={[styles.routeIcon, { backgroundColor: `${theme.colors.primary}18` }]}><MaterialIcons name="auto-stories" size={21} color={theme.colors.primary} /></View><View style={styles.routeCopy}><Text style={[styles.routeTitle, { color: theme.colors.text, textAlign: align }]}>{t("onboardingReplay")}</Text><Text style={[styles.routeText, { color: theme.colors.muted, textAlign: align }]}>{t("onboardingReplayHint")}</Text></View><MaterialIcons name={isRTL ? "chevron-left" : "chevron-right"} size={23} color={theme.colors.muted} /></Pressable>

            <View style={[styles.pickerCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <View style={[styles.pickerTitleRow, { flexDirection: direction }]}>
                <View style={[styles.settingIcon, { backgroundColor: `${theme.colors.secondary}18` }]}><MaterialIcons name="palette" size={20} color={theme.colors.secondary} /></View>
                <View style={styles.pickerCopy}>
                  <Text style={[styles.settingTitle, { color: theme.colors.text, textAlign: align }]}>{t("themes")}</Text>
                  <Text style={[styles.settingSubtitle, { color: theme.colors.muted, textAlign: align }]}>{`${selectedThemeName} · ${t("themePaletteHint")}`}</Text>
                </View>
              </View>
              <View accessibilityRole="radiogroup" style={styles.themeGrid}>
                {THEME_IDS.map((id) => {
                  const option = APP_THEMES[id];
                  const selected = id === themeId;
                  const description = themeDescriptions[id] ?? t("themePaletteHint");
                  return <Pressable key={id} accessibilityRole="radio" accessibilityLabel={`${themeLabels[id]}. ${description}`} accessibilityState={{ selected }} onPress={() => setThemeId(id)} style={({ pressed }) => [styles.themeOption, interfaceDensity === "compact" && styles.themeOptionCompact, { borderColor: selected ? theme.colors.primary : theme.colors.border, backgroundColor: option.colors.surface }, pressed && styles.pressed]}><View style={[styles.themeSwatch, { backgroundColor: option.colors.background }]}><View style={[styles.themeDot, { backgroundColor: option.colors.primary }]} /><View style={[styles.themeLine, { backgroundColor: option.colors.text }]} />{selected ? <View style={[styles.themeCheck, { backgroundColor: option.colors.primary }]}><MaterialIcons name="check" size={11} color={option.colors.onPrimary} /></View> : null}</View><Text numberOfLines={1} style={[styles.themeName, { color: selected ? theme.colors.primary : theme.colors.text }]}>{themeLabels[id]}</Text><Text numberOfLines={2} style={[styles.themeDescription, { color: selected ? option.colors.primary : option.colors.muted }]}>{description}</Text></Pressable>;
                })}
              </View>
            </View>

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
  headingBlock: { marginBottom: 18 },
  eyebrow: { fontSize: 10, lineHeight: 15, fontWeight: "900", letterSpacing: 1.9 },
  heading: { fontSize: 30, lineHeight: 38, fontWeight: "900" },
  profileCard: { padding: 17, borderRadius: 23, borderWidth: 1, marginBottom: 25 },
  profileHeader: { alignItems: "center", gap: 13 },
  profileMark: { width: 52, height: 52, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  profileCopy: { flex: 1 },
  profileOverline: { fontSize: 10, lineHeight: 14, fontWeight: "800" },
  profileTitle: { fontSize: 17, lineHeight: 23, fontWeight: "900" },
  profileText: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  profileLine: { alignItems: "center", justifyContent: "flex-start", gap: 7, marginTop: 16, paddingTop: 13, borderTopWidth: StyleSheet.hairlineWidth },
  profileDot: { width: 7, height: 7, borderRadius: 4 },
  profileStatus: { fontSize: 11, lineHeight: 15, fontWeight: "700" },
  sessionRoute: { minHeight: 68, borderRadius: 20, borderWidth: 1, paddingHorizontal: 13, alignItems: "center", gap: 11, marginBottom: 22 }, routeIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" }, routeCopy: { flex: 1 }, routeTitle: { fontSize: 13, lineHeight: 19, fontWeight: "900" }, routeText: { fontSize: 11, lineHeight: 16, marginTop: 1 },
  groupLabel: { fontSize: 11, lineHeight: 16, fontWeight: "900", letterSpacing: 1.2, marginBottom: 8 },
  pickerCard: { padding: 14, borderRadius: 21, borderWidth: 1, marginBottom: 12 },
  pickerTitleRow: { alignItems: "center", gap: 12 },
  pickerCopy: { flex: 1 },
  choiceRow: { flexWrap: "wrap", gap: 7, marginTop: 14 },
  choice: { minWidth: 74, minHeight: 38, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 13, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  choiceText: { fontSize: 11, lineHeight: 16, fontWeight: "800" }, densityChoice: { flex: 1, minWidth: 132, flexDirection: "row", gap: 7 },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  themeOption: { width: "48%", minHeight: 102, padding: 8, borderRadius: 15, borderWidth: 1 }, themeOptionCompact: { minHeight: 92 },
  themeSwatch: { height: 31, borderRadius: 10, padding: 6, flexDirection: "row", alignItems: "center", gap: 5 },
  themeDot: { width: 10, height: 10, borderRadius: 5 },
  themeLine: { height: 4, width: 22, borderRadius: 4, opacity: 0.85 },
  themeCheck: { width: 18, height: 18, borderRadius: 9, marginLeft: "auto", alignItems: "center", justifyContent: "center" },
  themeName: { fontSize: 10, lineHeight: 14, fontWeight: "800", textAlign: "center", marginTop: 6 }, themeDescription: { fontSize: 8, lineHeight: 11, fontWeight: "700", textAlign: "center", marginTop: 2 },
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
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
