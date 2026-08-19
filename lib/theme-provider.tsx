import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import type { ColorScheme } from "@/constants/theme";
import { reportLocalDiagnostic } from "@/lib/_core/local-diagnostics";
import { isAppLocale, LOCALE_META, translate, type AppLocale, type TranslationKey } from "@/lib/localization";
import type { FavoriteCardColor, FavoriteCardPreferences, FavoriteCardStyle } from "@/lib/omniwave/types";
import { setHapticFeedbackEnabled as configureHapticFeedback } from "@/lib/omniwave/haptics";

export type AppThemeId = "aurora" | "midnight" | "pearl" | "velvet" | "sunset" | "cloud" | "tidal" | "porcelain";
export const QUICK_ACCESS_IDS = ["favorites", "playlists", "videos"] as const;
export type QuickAccessId = (typeof QUICK_ACCESS_IDS)[number];
export type InterfaceDensity = "comfortable" | "compact";
export type TextScale = "standard" | "large" | "extraLarge";
export type HighContrastAccent = "teal" | "violet" | "amber";
export type FontWeightPreference = "regular" | "medium" | "bold";
export type LineSpacingPreference = "standard" | "relaxed" | "spacious";
export type ReadingFontPreference = "system" | "dyslexia";
export type FloatingShortcutPosition = { x: number; y: number };
export const TEXT_SCALE_MULTIPLIERS: Record<TextScale, number> = { standard: 1, large: 1.15, extraLarge: 1.3 };
export const FONT_WEIGHT_VALUES: Record<FontWeightPreference, "400" | "600" | "700"> = { regular: "400", medium: "600", bold: "700" };
export const LINE_HEIGHT_MULTIPLIERS: Record<LineSpacingPreference, number> = { standard: 1, relaxed: 1.25, spacious: 1.45 };
export type AppThemeColors = { background: string; surface: string; surfaceMuted: string; text: string; muted: string; border: string; primary: string; secondary: string; accent: string; glow: string; onPrimary: string; glass: string; glassStrong: string; glassInset: string; glassOverlay: string; glassBorder: string; glassHighlight: string; shadow: string };
export type AppTheme = { id: AppThemeId; isDark: boolean; colors: AppThemeColors };

export const APP_THEMES: Record<AppThemeId, AppTheme> = {
  aurora: { id: "aurora", isDark: true, colors: { background: "#06080E", surface: "#121722", surfaceMuted: "#0D121B", text: "#F5FAF8", muted: "#9BAAA6", border: "#273343", primary: "#31E9C4", secondary: "#9F86FF", accent: "#FF6F9F", glow: "#0C3A43", onPrimary: "#04130F", glass: "rgba(18, 26, 38, 0.72)", glassStrong: "rgba(20, 29, 43, 0.88)", glassInset: "rgba(3, 8, 14, 0.46)", glassOverlay: "rgba(49, 233, 196, 0.08)", glassBorder: "rgba(210, 255, 245, 0.16)", glassHighlight: "rgba(255, 255, 255, 0.30)", shadow: "#02040A" } },
  midnight: { id: "midnight", isDark: true, colors: { background: "#090C18", surface: "#151A2B", surfaceMuted: "#101421", text: "#F7F8FF", muted: "#9AA4C0", border: "#2A3150", primary: "#78A9FF", secondary: "#B79AFF", accent: "#FF8FB6", glow: "#18264D", onPrimary: "#081126", glass: "rgba(22, 29, 52, 0.73)", glassStrong: "rgba(24, 31, 56, 0.90)", glassInset: "rgba(4, 8, 22, 0.48)", glassOverlay: "rgba(120, 169, 255, 0.09)", glassBorder: "rgba(218, 228, 255, 0.17)", glassHighlight: "rgba(255, 255, 255, 0.28)", shadow: "#02030B" } },
  pearl: { id: "pearl", isDark: false, colors: { background: "#F7F8F6", surface: "#FFFFFF", surfaceMuted: "#EDF1EE", text: "#15201C", muted: "#61736B", border: "#D9E2DC", primary: "#148B69", secondary: "#7663C7", accent: "#CA4E78", glow: "#D8F0E7", onPrimary: "#F6FFFB", glass: "rgba(255, 255, 255, 0.72)", glassStrong: "rgba(255, 255, 255, 0.90)", glassInset: "rgba(19, 49, 39, 0.055)", glassOverlay: "rgba(20, 139, 105, 0.08)", glassBorder: "rgba(28, 66, 52, 0.12)", glassHighlight: "rgba(255, 255, 255, 0.92)", shadow: "#5D756A" } },
  velvet: { id: "velvet", isDark: true, colors: { background: "#120A18", surface: "#21132B", surfaceMuted: "#191020", text: "#FFF8FE", muted: "#C3AAC5", border: "#3E284A", primary: "#E888D1", secondary: "#A78BFA", accent: "#FFAC67", glow: "#3B1E41", onPrimary: "#280B21", glass: "rgba(39, 21, 49, 0.74)", glassStrong: "rgba(45, 24, 58, 0.90)", glassInset: "rgba(19, 5, 24, 0.48)", glassOverlay: "rgba(232, 136, 209, 0.08)", glassBorder: "rgba(255, 232, 252, 0.17)", glassHighlight: "rgba(255, 255, 255, 0.27)", shadow: "#0B040E" } },
  sunset: { id: "sunset", isDark: true, colors: { background: "#171009", surface: "#261B12", surfaceMuted: "#1E150E", text: "#FFF8F0", muted: "#C8B29B", border: "#4A3320", primary: "#F9B75D", secondary: "#F7797D", accent: "#84DCC6", glow: "#4B2D18", onPrimary: "#2A1904", glass: "rgba(45, 31, 20, 0.74)", glassStrong: "rgba(49, 33, 22, 0.90)", glassInset: "rgba(26, 15, 7, 0.48)", glassOverlay: "rgba(249, 183, 93, 0.08)", glassBorder: "rgba(255, 241, 218, 0.16)", glassHighlight: "rgba(255, 255, 255, 0.25)", shadow: "#0C0804" } },
  cloud: { id: "cloud", isDark: false, colors: { background: "#F8FBFF", surface: "#FFFFFF", surfaceMuted: "#EDF5FF", text: "#10243A", muted: "#5C7187", border: "#D8E8F6", primary: "#2A7EC7", secondary: "#66B9EA", accent: "#6076D9", glow: "#DDECFA", onPrimary: "#FFFFFF", glass: "rgba(255, 255, 255, 0.75)", glassStrong: "rgba(255, 255, 255, 0.92)", glassInset: "rgba(19, 62, 101, 0.055)", glassOverlay: "rgba(42, 126, 199, 0.08)", glassBorder: "rgba(31, 93, 145, 0.13)", glassHighlight: "rgba(255, 255, 255, 0.96)", shadow: "#53799D" } },
  tidal: { id: "tidal", isDark: false, colors: { background: "#F2FBFF", surface: "#FEFFFF", surfaceMuted: "#E5F5FA", text: "#113445", muted: "#53737F", border: "#CBE6EF", primary: "#147FA5", secondary: "#6DCFE4", accent: "#3E8DCC", glow: "#D9F4F9", onPrimary: "#FFFFFF", glass: "rgba(254, 255, 255, 0.74)", glassStrong: "rgba(255, 255, 255, 0.91)", glassInset: "rgba(9, 72, 92, 0.055)", glassOverlay: "rgba(20, 127, 165, 0.08)", glassBorder: "rgba(16, 103, 135, 0.13)", glassHighlight: "rgba(255, 255, 255, 0.96)", shadow: "#43798A" } },
  porcelain: { id: "porcelain", isDark: false, colors: { background: "#FBF8F2", surface: "#FFFFFC", surfaceMuted: "#F2EEE6", text: "#2A2C2A", muted: "#6C706B", border: "#E3DDD2", primary: "#407E9C", secondary: "#88BBD1", accent: "#8A6BA9", glow: "#EEF1EB", onPrimary: "#FFFFFF", glass: "rgba(255, 255, 252, 0.76)", glassStrong: "rgba(255, 255, 252, 0.92)", glassInset: "rgba(69, 65, 58, 0.055)", glassOverlay: "rgba(64, 126, 156, 0.08)", glassBorder: "rgba(80, 88, 82, 0.12)", glassHighlight: "rgba(255, 255, 255, 0.97)", shadow: "#776E63" } },
};

const PREFERENCES_KEY = "omniwave:ui-preferences:v2";
const DEFAULT_FAVORITE_CARD_PREFERENCES: FavoriteCardPreferences = { style: "glass", color: "teal" };
type StoredPreferences = { locale?: unknown; themeId?: unknown; favoriteCard?: unknown; onboardingSeen?: unknown; interfaceDensity?: unknown; followSystemAppearance?: unknown; textScale?: unknown; fontWeight?: unknown; lineSpacing?: unknown; readingFont?: unknown; highContrast?: unknown; highContrastAccent?: unknown; quickAccessOrder?: unknown; quickAccessHintSeen?: unknown; hapticFeedbackEnabled?: unknown; appearanceShortcutEnabled?: unknown; appearanceShortcutPosition?: unknown };
type ThemeContextValue = {
  theme: AppTheme;
  themeId: AppThemeId;
  setThemeId: (themeId: AppThemeId) => void;
  quickAccessOrder: QuickAccessId[];
  setQuickAccessOrder: (order: readonly QuickAccessId[]) => void;
  resetQuickAccessOrder: () => void;
  canUndoQuickAccessOrder: boolean;
  undoQuickAccessOrder: () => void;
  quickAccessHintSeen: boolean;
  dismissQuickAccessHint: () => void;
  hapticFeedbackEnabled: boolean;
  setHapticFeedbackEnabled: (enabled: boolean) => void;
  interfaceDensity: InterfaceDensity;
  setInterfaceDensity: (density: InterfaceDensity) => void;
  textScale: TextScale;
  textScaleMultiplier: number;
  setTextScale: (scale: TextScale) => void;
  fontWeightPreference: FontWeightPreference;
  fontWeightValue: "400" | "600" | "700";
  setFontWeightPreference: (weight: FontWeightPreference) => void;
  lineSpacing: LineSpacingPreference;
  lineHeightMultiplier: number;
  setLineSpacing: (spacing: LineSpacingPreference) => void;
  readingFont: ReadingFontPreference;
  readingFontFamily?: "OpenDyslexic-Regular";
  setReadingFont: (font: ReadingFontPreference) => void;
  resetAccessibilityPreferences: () => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  highContrastAccent: HighContrastAccent;
  setHighContrastAccent: (accent: HighContrastAccent) => void;
  followSystemAppearance: boolean;
  setFollowSystemAppearance: (enabled: boolean) => void;
  appearanceShortcutEnabled: boolean;
  setAppearanceShortcutEnabled: (enabled: boolean) => void;
  appearanceShortcutPosition: FloatingShortcutPosition;
  setAppearanceShortcutPosition: (position: FloatingShortcutPosition) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  favoriteCardPreferences: FavoriteCardPreferences;
  setFavoriteCardPreferences: (preferences: FavoriteCardPreferences) => void;
  resetFavoriteCardPreferences: () => void;
  onboardingSeen: boolean;
  preferencesReady: boolean;
  completeOnboarding: () => void;
  skipOnboarding: () => void;
  resetOnboarding: () => void;
  isRTL: boolean;
  direction: "rtl" | "ltr";
  t: (key: TranslationKey) => string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const isThemeId = (value: unknown): value is AppThemeId => typeof value === "string" && Object.prototype.hasOwnProperty.call(APP_THEMES, value);
const isQuickAccessId = (value: unknown): value is QuickAccessId => typeof value === "string" && QUICK_ACCESS_IDS.includes(value as QuickAccessId);
const sanitizeQuickAccessOrder = (value: unknown): QuickAccessId[] => {
  if (!Array.isArray(value) || value.length !== QUICK_ACCESS_IDS.length || !value.every(isQuickAccessId)) return [...QUICK_ACCESS_IDS];
  const order = value as QuickAccessId[];
  return new Set(order).size === QUICK_ACCESS_IDS.length && QUICK_ACCESS_IDS.every((id) => order.includes(id)) ? [...order] : [...QUICK_ACCESS_IDS];
};
const sameQuickAccessOrder = (left: readonly QuickAccessId[], right: readonly QuickAccessId[]) => left.length === right.length && left.every((id, index) => id === right[index]);
const isInterfaceDensity = (value: unknown): value is InterfaceDensity => value === "comfortable" || value === "compact";
const isTextScale = (value: unknown): value is TextScale => value === "standard" || value === "large" || value === "extraLarge";
const isFontWeightPreference = (value: unknown): value is FontWeightPreference => value === "regular" || value === "medium" || value === "bold";
const isLineSpacingPreference = (value: unknown): value is LineSpacingPreference => value === "standard" || value === "relaxed" || value === "spacious";
const isReadingFontPreference = (value: unknown): value is ReadingFontPreference => value === "system" || value === "dyslexia";
const isHighContrastAccent = (value: unknown): value is HighContrastAccent => value === "teal" || value === "violet" || value === "amber";
const DEFAULT_FLOATING_SHORTCUT_POSITION: FloatingShortcutPosition = { x: 1, y: 1 };
const sanitizeFloatingShortcutPosition = (value: unknown): FloatingShortcutPosition => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return DEFAULT_FLOATING_SHORTCUT_POSITION;
  const candidate = value as Record<string, unknown>;
  if (!Number.isFinite(candidate.x) || !Number.isFinite(candidate.y)) return DEFAULT_FLOATING_SHORTCUT_POSITION;
  return { x: Math.max(0, Math.min(1, Number(candidate.x))), y: Math.max(0, Math.min(1, Number(candidate.y))) };
};
const getSystemColorScheme = (): ColorScheme => Appearance.getColorScheme() === "dark" ? "dark" : "light";
const getSystemThemeId = (): AppThemeId => getSystemColorScheme() === "dark" ? "aurora" : "pearl";
const isFavoriteCardStyle = (value: unknown): value is FavoriteCardStyle => value === "glass" || value === "editorial" || value === "minimal";
const isFavoriteCardColor = (value: unknown): value is FavoriteCardColor => value === "teal" || value === "violet" || value === "rose";
const sanitizeFavoriteCardPreferences = (value: unknown): FavoriteCardPreferences => typeof value === "object" && value !== null && isFavoriteCardStyle((value as Record<string, unknown>).style) && isFavoriteCardColor((value as Record<string, unknown>).color) ? { style: (value as Record<string, FavoriteCardStyle>).style, color: (value as Record<string, FavoriteCardColor>).color } : DEFAULT_FAVORITE_CARD_PREFERENCES;
const HIGH_CONTRAST_ACCENTS: Record<HighContrastAccent, { dark: string; light: string; glow: string }> = { teal: { dark: "#39F2D0", light: "#005C43", glow: "#174B43" }, violet: { dark: "#D1C4FF", light: "#40258B", glow: "#3C2C6E" }, amber: { dark: "#FFE58C", light: "#6A4700", glow: "#5E4716" } };
const withHighContrast = (baseTheme: AppTheme, accent: HighContrastAccent): AppTheme => { const accentColors = HIGH_CONTRAST_ACCENTS[accent]; const primary = baseTheme.isDark ? accentColors.dark : accentColors.light; return { ...baseTheme, colors: baseTheme.isDark ? { ...baseTheme.colors, background: "#000000", surface: "#101010", surfaceMuted: "#1B1B1B", text: "#FFFFFF", muted: "#F2F2F2", border: "#FFFFFF", primary, secondary: "#D1C4FF", accent: "#FFC0D4", glow: accentColors.glow, onPrimary: "#000000", glass: "#101010", glassStrong: "#171717", glassInset: "#000000", glassOverlay: "#1B1B1B", glassBorder: "#FFFFFF", glassHighlight: "#FFFFFF", shadow: "#000000" } : { ...baseTheme.colors, background: "#FFFFFF", surface: "#FFFFFF", surfaceMuted: "#F4F4F4", text: "#000000", muted: "#1E1E1E", border: "#111111", primary, secondary: "#40258B", accent: "#9B0040", glow: accentColors.glow, onPrimary: "#FFFFFF", glass: "#FFFFFF", glassStrong: "#FFFFFF", glassInset: "#F4F4F4", glassOverlay: "#FFFFFF", glassBorder: "#111111", glassHighlight: "#FFFFFF", shadow: "#111111" } }; };

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<AppThemeId>(getSystemThemeId);
  const [quickAccessOrder, setQuickAccessOrderState] = useState<QuickAccessId[]>(() => [...QUICK_ACCESS_IDS]);
  const [previousQuickAccessOrder, setPreviousQuickAccessOrder] = useState<QuickAccessId[] | null>(null);
  const [quickAccessHintSeen, setQuickAccessHintSeen] = useState(false);
  const [hapticFeedbackEnabled, setHapticFeedbackEnabledState] = useState(true);
  const [interfaceDensity, setInterfaceDensityState] = useState<InterfaceDensity>("comfortable");
  const [textScale, setTextScaleState] = useState<TextScale>("standard");
  const [fontWeightPreference, setFontWeightPreferenceState] = useState<FontWeightPreference>("regular");
  const [lineSpacing, setLineSpacingState] = useState<LineSpacingPreference>("standard");
  const [readingFont, setReadingFontState] = useState<ReadingFontPreference>("system");
  const [highContrast, setHighContrastState] = useState(false);
  const [highContrastAccent, setHighContrastAccentState] = useState<HighContrastAccent>("teal");
  const [followSystemAppearance, setFollowSystemAppearanceState] = useState(true);
  const [appearanceShortcutEnabled, setAppearanceShortcutEnabledState] = useState(true);
  const [appearanceShortcutPosition, setAppearanceShortcutPositionState] = useState<FloatingShortcutPosition>(DEFAULT_FLOATING_SHORTCUT_POSITION);
  const [locale, setLocaleState] = useState<AppLocale>("ar");
  const [favoriteCardPreferences, setFavoriteCardPreferencesState] = useState<FavoriteCardPreferences>(DEFAULT_FAVORITE_CARD_PREFERENCES);
  const [isFavoriteCardCustomized, setIsFavoriteCardCustomized] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [ready, setReady] = useState(false);
  const baseTheme = APP_THEMES[themeId];
  const theme = highContrast ? withHighContrast(baseTheme, highContrastAccent) : baseTheme;
  const colorScheme: ColorScheme = theme.isDark ? "dark" : "light";
  const direction = LOCALE_META[locale].direction;

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(PREFERENCES_KEY).then((raw) => {
      if (!active || !raw) return;
      try {
        const stored = JSON.parse(raw) as StoredPreferences;
        const restoredFollowSystem = typeof stored.followSystemAppearance === "boolean" ? stored.followSystemAppearance : !isThemeId(stored.themeId);
        setFollowSystemAppearanceState(restoredFollowSystem);
        if (restoredFollowSystem) setThemeIdState(getSystemThemeId());
        else if (isThemeId(stored.themeId)) setThemeIdState(stored.themeId);
        setQuickAccessOrderState(sanitizeQuickAccessOrder(stored.quickAccessOrder));
        setQuickAccessHintSeen(stored.quickAccessHintSeen === true);
        if (typeof stored.hapticFeedbackEnabled === "boolean") { setHapticFeedbackEnabledState(stored.hapticFeedbackEnabled); configureHapticFeedback(stored.hapticFeedbackEnabled); }
        if (isInterfaceDensity(stored.interfaceDensity)) setInterfaceDensityState(stored.interfaceDensity);
        if (isTextScale(stored.textScale)) setTextScaleState(stored.textScale);
        if (isFontWeightPreference(stored.fontWeight)) setFontWeightPreferenceState(stored.fontWeight);
        if (isLineSpacingPreference(stored.lineSpacing)) setLineSpacingState(stored.lineSpacing);
        if (isReadingFontPreference(stored.readingFont)) setReadingFontState(stored.readingFont);
        if (typeof stored.highContrast === "boolean") setHighContrastState(stored.highContrast);
        if (isHighContrastAccent(stored.highContrastAccent)) setHighContrastAccentState(stored.highContrastAccent);
        if (typeof stored.appearanceShortcutEnabled === "boolean") setAppearanceShortcutEnabledState(stored.appearanceShortcutEnabled);
        setAppearanceShortcutPositionState(sanitizeFloatingShortcutPosition(stored.appearanceShortcutPosition));
        if (isAppLocale(stored.locale)) setLocaleState(stored.locale);
        const restoredCard = sanitizeFavoriteCardPreferences(stored.favoriteCard);
        setFavoriteCardPreferencesState(restoredCard);
        setIsFavoriteCardCustomized(isFavoriteCardStyle((stored.favoriteCard as Record<string, unknown> | undefined)?.style) && isFavoriteCardColor((stored.favoriteCard as Record<string, unknown> | undefined)?.color));
        setOnboardingSeen(typeof stored.onboardingSeen === "boolean" ? stored.onboardingSeen : true);
      } catch { reportLocalDiagnostic("theme_preferences_hydration_failed"); }
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!ready || !followSystemAppearance) return;
    const subscription = Appearance.addChangeListener(() => setThemeIdState(getSystemThemeId()));
    setThemeIdState(getSystemThemeId());
    return () => subscription.remove();
  }, [followSystemAppearance, ready]);

  useEffect(() => {
    nativewindColorScheme.set(colorScheme);
    Appearance.setColorScheme?.(followSystemAppearance ? null : colorScheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = colorScheme;
      root.dir = direction;
      root.lang = locale;
    }
  }, [colorScheme, direction, followSystemAppearance, locale]);

  useEffect(() => {
    if (!ready) return;
    const saved = { locale, themeId, quickAccessOrder, hapticFeedbackEnabled, interfaceDensity, textScale, fontWeight: fontWeightPreference, lineSpacing, readingFont, highContrast, highContrastAccent, followSystemAppearance, appearanceShortcutEnabled, appearanceShortcutPosition, ...(isFavoriteCardCustomized ? { favoriteCard: favoriteCardPreferences } : {}), ...(onboardingSeen ? { onboardingSeen: true } : {}), ...(quickAccessHintSeen ? { quickAccessHintSeen: true } : {}) };
    void AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(saved)).catch(() => reportLocalDiagnostic("theme_preferences_write_failed"));
  }, [appearanceShortcutEnabled, appearanceShortcutPosition, favoriteCardPreferences, followSystemAppearance, fontWeightPreference, hapticFeedbackEnabled, highContrast, highContrastAccent, interfaceDensity, isFavoriteCardCustomized, lineSpacing, locale, onboardingSeen, quickAccessHintSeen, quickAccessOrder, readingFont, ready, textScale, themeId]);

  const setThemeId = useCallback((nextThemeId: AppThemeId) => { if (isThemeId(nextThemeId)) { setFollowSystemAppearanceState(false); setThemeIdState(nextThemeId); } }, []);
  const setQuickAccessOrder = useCallback((nextOrder: readonly QuickAccessId[]) => { const next = sanitizeQuickAccessOrder(nextOrder); if (sameQuickAccessOrder(next, quickAccessOrder)) return; setPreviousQuickAccessOrder([...quickAccessOrder]); setQuickAccessOrderState(next); }, [quickAccessOrder]);
  const resetQuickAccessOrder = useCallback(() => { const next = [...QUICK_ACCESS_IDS]; if (sameQuickAccessOrder(next, quickAccessOrder)) return; setPreviousQuickAccessOrder([...quickAccessOrder]); setQuickAccessOrderState(next); }, [quickAccessOrder]);
  const undoQuickAccessOrder = useCallback(() => { if (!previousQuickAccessOrder) return; setQuickAccessOrderState(previousQuickAccessOrder); setPreviousQuickAccessOrder(null); }, [previousQuickAccessOrder]);
  const dismissQuickAccessHint = useCallback(() => setQuickAccessHintSeen(true), []);
  const setHapticFeedbackEnabled = useCallback((enabled: boolean) => { const next = Boolean(enabled); setHapticFeedbackEnabledState(next); configureHapticFeedback(next); }, []);
  const setInterfaceDensity = useCallback((nextDensity: InterfaceDensity) => { if (isInterfaceDensity(nextDensity)) setInterfaceDensityState(nextDensity); }, []);
  const setTextScale = useCallback((nextScale: TextScale) => { if (isTextScale(nextScale)) setTextScaleState(nextScale); }, []);
  const resetAccessibilityPreferences = useCallback(() => { setInterfaceDensityState("comfortable"); setTextScaleState("standard"); setFontWeightPreferenceState("regular"); setLineSpacingState("standard"); setReadingFontState("system"); setHighContrastState(false); setHighContrastAccentState("teal"); }, []);
  const setFontWeightPreference = useCallback((weight: FontWeightPreference) => { if (isFontWeightPreference(weight)) setFontWeightPreferenceState(weight); }, []);
  const setLineSpacing = useCallback((spacing: LineSpacingPreference) => { if (isLineSpacingPreference(spacing)) setLineSpacingState(spacing); }, []);
  const setReadingFont = useCallback((font: ReadingFontPreference) => { if (isReadingFontPreference(font)) setReadingFontState(font); }, []);
  const setHighContrast = useCallback((enabled: boolean) => setHighContrastState(Boolean(enabled)), []);
  const setHighContrastAccent = useCallback((accent: HighContrastAccent) => { if (isHighContrastAccent(accent)) setHighContrastAccentState(accent); }, []);
  const setFollowSystemAppearance = useCallback((enabled: boolean) => { setFollowSystemAppearanceState(enabled); if (enabled) { Appearance.setColorScheme?.(null); setThemeIdState(getSystemThemeId()); } }, []);
  const setAppearanceShortcutEnabled = useCallback((enabled: boolean) => setAppearanceShortcutEnabledState(Boolean(enabled)), []);
  const setAppearanceShortcutPosition = useCallback((position: FloatingShortcutPosition) => setAppearanceShortcutPositionState(sanitizeFloatingShortcutPosition(position)), []);
  const setColorScheme = useCallback((scheme: ColorScheme) => { setFollowSystemAppearanceState(false); setThemeIdState(scheme === "light" ? "pearl" : "aurora"); }, []);
  const setLocale = useCallback((nextLocale: AppLocale) => { if (isAppLocale(nextLocale)) setLocaleState(nextLocale); }, []);
  const setFavoriteCardPreferences = useCallback((nextPreferences: FavoriteCardPreferences) => { setFavoriteCardPreferencesState(sanitizeFavoriteCardPreferences(nextPreferences)); setIsFavoriteCardCustomized(true); }, []);
  const resetFavoriteCardPreferences = useCallback(() => { setFavoriteCardPreferencesState(DEFAULT_FAVORITE_CARD_PREFERENCES); setIsFavoriteCardCustomized(false); }, []);
  const completeOnboarding = useCallback(() => setOnboardingSeen(true), []);
  const skipOnboarding = useCallback(() => setOnboardingSeen(true), []);
  const resetOnboarding = useCallback(() => setOnboardingSeen(false), []);
  const t = useCallback((key: TranslationKey) => translate(locale, key), [locale]);

  const themeVariables = useMemo(() => vars({
    "color-primary": theme.colors.primary, "color-background": theme.colors.background, "color-surface": theme.colors.surface, "color-foreground": theme.colors.text, "color-muted": theme.colors.muted, "color-border": theme.colors.border, "color-success": theme.colors.primary, "color-warning": theme.colors.secondary, "color-error": theme.colors.accent,
  }), [theme]);
  const textScaleMultiplier = TEXT_SCALE_MULTIPLIERS[textScale];
  const fontWeightValue = FONT_WEIGHT_VALUES[fontWeightPreference];
  const lineHeightMultiplier = LINE_HEIGHT_MULTIPLIERS[lineSpacing];
  const readingFontFamily: "OpenDyslexic-Regular" | undefined = readingFont === "dyslexia" ? "OpenDyslexic-Regular" : undefined;
  const value = useMemo(() => ({ theme, themeId, setThemeId, quickAccessOrder, setQuickAccessOrder, resetQuickAccessOrder, canUndoQuickAccessOrder: previousQuickAccessOrder !== null, undoQuickAccessOrder, quickAccessHintSeen, dismissQuickAccessHint, hapticFeedbackEnabled, setHapticFeedbackEnabled, interfaceDensity, setInterfaceDensity, textScale, textScaleMultiplier, setTextScale, fontWeightPreference, fontWeightValue, setFontWeightPreference, lineSpacing, lineHeightMultiplier, setLineSpacing, readingFont, readingFontFamily, setReadingFont, resetAccessibilityPreferences, highContrast, setHighContrast, highContrastAccent, setHighContrastAccent, followSystemAppearance, setFollowSystemAppearance, appearanceShortcutEnabled, setAppearanceShortcutEnabled, appearanceShortcutPosition, setAppearanceShortcutPosition, colorScheme, setColorScheme, locale, setLocale, favoriteCardPreferences, setFavoriteCardPreferences, resetFavoriteCardPreferences, onboardingSeen, preferencesReady: ready, completeOnboarding, skipOnboarding, resetOnboarding, isRTL: direction === "rtl", direction, t }), [appearanceShortcutEnabled, appearanceShortcutPosition, colorScheme, completeOnboarding, direction, dismissQuickAccessHint, favoriteCardPreferences, followSystemAppearance, fontWeightPreference, fontWeightValue, hapticFeedbackEnabled, highContrast, highContrastAccent, interfaceDensity, lineHeightMultiplier, lineSpacing, locale, onboardingSeen, previousQuickAccessOrder, quickAccessHintSeen, quickAccessOrder, readingFont, readingFontFamily, ready, resetAccessibilityPreferences, resetFavoriteCardPreferences, resetOnboarding, resetQuickAccessOrder, setAppearanceShortcutEnabled, setAppearanceShortcutPosition, setColorScheme, setFavoriteCardPreferences, setFollowSystemAppearance, setFontWeightPreference, setHapticFeedbackEnabled, setHighContrast, setHighContrastAccent, setInterfaceDensity, setLineSpacing, setLocale, setQuickAccessOrder, setReadingFont, setTextScale, setThemeId, skipOnboarding, t, textScale, textScaleMultiplier, theme, themeId, undoQuickAccessOrder]);

  return <ThemeContext.Provider value={value}><View style={[{ flex: 1, backgroundColor: theme.colors.background }, themeVariables]}>{children}</View></ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
