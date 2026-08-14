import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import type { ColorScheme } from "@/constants/theme";
import { isAppLocale, LOCALE_META, TRANSLATIONS, type AppLocale, type TranslationKey } from "@/lib/localization";
import type { FavoriteCardColor, FavoriteCardPreferences, FavoriteCardStyle } from "@/lib/omniwave/types";

export type AppThemeId = "aurora" | "midnight" | "pearl" | "velvet" | "sunset" | "cloud" | "tidal" | "porcelain";
export type InterfaceDensity = "comfortable" | "compact";
export type TextScale = "standard" | "large" | "extraLarge";
export const TEXT_SCALE_MULTIPLIERS: Record<TextScale, number> = { standard: 1, large: 1.15, extraLarge: 1.3 };
export type AppThemeColors = { background: string; surface: string; surfaceMuted: string; text: string; muted: string; border: string; primary: string; secondary: string; accent: string; glow: string; onPrimary: string };
export type AppTheme = { id: AppThemeId; isDark: boolean; colors: AppThemeColors };

export const APP_THEMES: Record<AppThemeId, AppTheme> = {
  aurora: { id: "aurora", isDark: true, colors: { background: "#06080E", surface: "#121722", surfaceMuted: "#0D121B", text: "#F5FAF8", muted: "#9BAAA6", border: "#273343", primary: "#31E9C4", secondary: "#9F86FF", accent: "#FF6F9F", glow: "#0C3A43", onPrimary: "#04130F" } },
  midnight: { id: "midnight", isDark: true, colors: { background: "#090C18", surface: "#151A2B", surfaceMuted: "#101421", text: "#F7F8FF", muted: "#9AA4C0", border: "#2A3150", primary: "#78A9FF", secondary: "#B79AFF", accent: "#FF8FB6", glow: "#18264D", onPrimary: "#081126" } },
  pearl: { id: "pearl", isDark: false, colors: { background: "#F7F8F6", surface: "#FFFFFF", surfaceMuted: "#EDF1EE", text: "#15201C", muted: "#61736B", border: "#D9E2DC", primary: "#148B69", secondary: "#7663C7", accent: "#CA4E78", glow: "#D8F0E7", onPrimary: "#F6FFFB" } },
  velvet: { id: "velvet", isDark: true, colors: { background: "#120A18", surface: "#21132B", surfaceMuted: "#191020", text: "#FFF8FE", muted: "#C3AAC5", border: "#3E284A", primary: "#E888D1", secondary: "#A78BFA", accent: "#FFAC67", glow: "#3B1E41", onPrimary: "#280B21" } },
  sunset: { id: "sunset", isDark: true, colors: { background: "#171009", surface: "#261B12", surfaceMuted: "#1E150E", text: "#FFF8F0", muted: "#C8B29B", border: "#4A3320", primary: "#F9B75D", secondary: "#F7797D", accent: "#84DCC6", glow: "#4B2D18", onPrimary: "#2A1904" } },
  cloud: { id: "cloud", isDark: false, colors: { background: "#F8FBFF", surface: "#FFFFFF", surfaceMuted: "#EDF5FF", text: "#10243A", muted: "#5C7187", border: "#D8E8F6", primary: "#2A7EC7", secondary: "#66B9EA", accent: "#6076D9", glow: "#DDECFA", onPrimary: "#FFFFFF" } },
  tidal: { id: "tidal", isDark: false, colors: { background: "#F2FBFF", surface: "#FEFFFF", surfaceMuted: "#E5F5FA", text: "#113445", muted: "#53737F", border: "#CBE6EF", primary: "#147FA5", secondary: "#6DCFE4", accent: "#3E8DCC", glow: "#D9F4F9", onPrimary: "#FFFFFF" } },
  porcelain: { id: "porcelain", isDark: false, colors: { background: "#FBF8F2", surface: "#FFFFFC", surfaceMuted: "#F2EEE6", text: "#2A2C2A", muted: "#6C706B", border: "#E3DDD2", primary: "#407E9C", secondary: "#88BBD1", accent: "#8A6BA9", glow: "#EEF1EB", onPrimary: "#FFFFFF" } },
};

const PREFERENCES_KEY = "omniwave:ui-preferences:v2";
const DEFAULT_FAVORITE_CARD_PREFERENCES: FavoriteCardPreferences = { style: "glass", color: "teal" };
type StoredPreferences = { locale?: unknown; themeId?: unknown; favoriteCard?: unknown; onboardingSeen?: unknown; interfaceDensity?: unknown; followSystemAppearance?: unknown; textScale?: unknown };
type ThemeContextValue = {
  theme: AppTheme;
  themeId: AppThemeId;
  setThemeId: (themeId: AppThemeId) => void;
  interfaceDensity: InterfaceDensity;
  setInterfaceDensity: (density: InterfaceDensity) => void;
  textScale: TextScale;
  textScaleMultiplier: number;
  setTextScale: (scale: TextScale) => void;
  followSystemAppearance: boolean;
  setFollowSystemAppearance: (enabled: boolean) => void;
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
const isInterfaceDensity = (value: unknown): value is InterfaceDensity => value === "comfortable" || value === "compact";
const isTextScale = (value: unknown): value is TextScale => value === "standard" || value === "large" || value === "extraLarge";
const getSystemColorScheme = (): ColorScheme => Appearance.getColorScheme() === "dark" ? "dark" : "light";
const getSystemThemeId = (): AppThemeId => getSystemColorScheme() === "dark" ? "aurora" : "pearl";
const isFavoriteCardStyle = (value: unknown): value is FavoriteCardStyle => value === "glass" || value === "editorial" || value === "minimal";
const isFavoriteCardColor = (value: unknown): value is FavoriteCardColor => value === "teal" || value === "violet" || value === "rose";
const sanitizeFavoriteCardPreferences = (value: unknown): FavoriteCardPreferences => typeof value === "object" && value !== null && isFavoriteCardStyle((value as Record<string, unknown>).style) && isFavoriteCardColor((value as Record<string, unknown>).color) ? { style: (value as Record<string, FavoriteCardStyle>).style, color: (value as Record<string, FavoriteCardColor>).color } : DEFAULT_FAVORITE_CARD_PREFERENCES;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<AppThemeId>(getSystemThemeId);
  const [interfaceDensity, setInterfaceDensityState] = useState<InterfaceDensity>("comfortable");
  const [textScale, setTextScaleState] = useState<TextScale>("standard");
  const [followSystemAppearance, setFollowSystemAppearanceState] = useState(true);
  const [locale, setLocaleState] = useState<AppLocale>("ar");
  const [favoriteCardPreferences, setFavoriteCardPreferencesState] = useState<FavoriteCardPreferences>(DEFAULT_FAVORITE_CARD_PREFERENCES);
  const [isFavoriteCardCustomized, setIsFavoriteCardCustomized] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const [ready, setReady] = useState(false);
  const theme = APP_THEMES[themeId];
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
        if (isInterfaceDensity(stored.interfaceDensity)) setInterfaceDensityState(stored.interfaceDensity);
        if (isTextScale(stored.textScale)) setTextScaleState(stored.textScale);
        if (isAppLocale(stored.locale)) setLocaleState(stored.locale);
        const restoredCard = sanitizeFavoriteCardPreferences(stored.favoriteCard);
        setFavoriteCardPreferencesState(restoredCard);
        setIsFavoriteCardCustomized(isFavoriteCardStyle((stored.favoriteCard as Record<string, unknown> | undefined)?.style) && isFavoriteCardColor((stored.favoriteCard as Record<string, unknown> | undefined)?.color));
        setOnboardingSeen(typeof stored.onboardingSeen === "boolean" ? stored.onboardingSeen : true);
      } catch { /* Ignore malformed local preferences safely. */ }
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
    const saved = { locale, themeId, interfaceDensity, textScale, followSystemAppearance, ...(isFavoriteCardCustomized ? { favoriteCard: favoriteCardPreferences } : {}), ...(onboardingSeen ? { onboardingSeen: true } : {}) };
    void AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(saved)).catch(() => undefined);
  }, [favoriteCardPreferences, followSystemAppearance, interfaceDensity, isFavoriteCardCustomized, locale, onboardingSeen, ready, textScale, themeId]);

  const setThemeId = useCallback((nextThemeId: AppThemeId) => { if (isThemeId(nextThemeId)) { setFollowSystemAppearanceState(false); setThemeIdState(nextThemeId); } }, []);
  const setInterfaceDensity = useCallback((nextDensity: InterfaceDensity) => { if (isInterfaceDensity(nextDensity)) setInterfaceDensityState(nextDensity); }, []);
  const setTextScale = useCallback((nextScale: TextScale) => { if (isTextScale(nextScale)) setTextScaleState(nextScale); }, []);
  const setFollowSystemAppearance = useCallback((enabled: boolean) => { setFollowSystemAppearanceState(enabled); if (enabled) { Appearance.setColorScheme?.(null); setThemeIdState(getSystemThemeId()); } }, []);
  const setColorScheme = useCallback((scheme: ColorScheme) => { setFollowSystemAppearanceState(false); setThemeIdState(scheme === "light" ? "pearl" : "aurora"); }, []);
  const setLocale = useCallback((nextLocale: AppLocale) => { if (isAppLocale(nextLocale)) setLocaleState(nextLocale); }, []);
  const setFavoriteCardPreferences = useCallback((nextPreferences: FavoriteCardPreferences) => { setFavoriteCardPreferencesState(sanitizeFavoriteCardPreferences(nextPreferences)); setIsFavoriteCardCustomized(true); }, []);
  const resetFavoriteCardPreferences = useCallback(() => { setFavoriteCardPreferencesState(DEFAULT_FAVORITE_CARD_PREFERENCES); setIsFavoriteCardCustomized(false); }, []);
  const completeOnboarding = useCallback(() => setOnboardingSeen(true), []);
  const skipOnboarding = useCallback(() => setOnboardingSeen(true), []);
  const resetOnboarding = useCallback(() => setOnboardingSeen(false), []);
  const t = useCallback((key: TranslationKey) => TRANSLATIONS[locale][key] as string, [locale]);

  const themeVariables = useMemo(() => vars({
    "color-primary": theme.colors.primary, "color-background": theme.colors.background, "color-surface": theme.colors.surface, "color-foreground": theme.colors.text, "color-muted": theme.colors.muted, "color-border": theme.colors.border, "color-success": theme.colors.primary, "color-warning": theme.colors.secondary, "color-error": theme.colors.accent,
  }), [theme]);
  const textScaleMultiplier = TEXT_SCALE_MULTIPLIERS[textScale];
  const value = useMemo(() => ({ theme, themeId, setThemeId, interfaceDensity, setInterfaceDensity, textScale, textScaleMultiplier, setTextScale, followSystemAppearance, setFollowSystemAppearance, colorScheme, setColorScheme, locale, setLocale, favoriteCardPreferences, setFavoriteCardPreferences, resetFavoriteCardPreferences, onboardingSeen, preferencesReady: ready, completeOnboarding, skipOnboarding, resetOnboarding, isRTL: direction === "rtl", direction, t }), [colorScheme, completeOnboarding, direction, favoriteCardPreferences, followSystemAppearance, interfaceDensity, locale, onboardingSeen, ready, resetFavoriteCardPreferences, resetOnboarding, setColorScheme, setFavoriteCardPreferences, setFollowSystemAppearance, setInterfaceDensity, setLocale, setTextScale, setThemeId, skipOnboarding, t, textScale, textScaleMultiplier, theme, themeId]);

  return <ThemeContext.Provider value={value}><View style={[{ flex: 1, backgroundColor: theme.colors.background }, themeVariables]}>{children}</View></ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
