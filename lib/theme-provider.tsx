import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Appearance, View } from "react-native";
import { colorScheme as nativewindColorScheme, vars } from "nativewind";

import type { ColorScheme } from "@/constants/theme";
import { isAppLocale, LOCALE_META, TRANSLATIONS, type AppLocale, type TranslationKey } from "@/lib/localization";
import type { FavoriteCardColor, FavoriteCardPreferences, FavoriteCardStyle } from "@/lib/omniwave/types";

export type AppThemeId = "aurora" | "midnight" | "pearl" | "velvet" | "sunset";
export type AppThemeColors = { background: string; surface: string; surfaceMuted: string; text: string; muted: string; border: string; primary: string; secondary: string; accent: string; glow: string; onPrimary: string };
export type AppTheme = { id: AppThemeId; isDark: boolean; colors: AppThemeColors };

export const APP_THEMES: Record<AppThemeId, AppTheme> = {
  aurora: { id: "aurora", isDark: true, colors: { background: "#06080E", surface: "#121722", surfaceMuted: "#0D121B", text: "#F5FAF8", muted: "#9BAAA6", border: "#273343", primary: "#31E9C4", secondary: "#9F86FF", accent: "#FF6F9F", glow: "#0C3A43", onPrimary: "#04130F" } },
  midnight: { id: "midnight", isDark: true, colors: { background: "#090C18", surface: "#151A2B", surfaceMuted: "#101421", text: "#F7F8FF", muted: "#9AA4C0", border: "#2A3150", primary: "#78A9FF", secondary: "#B79AFF", accent: "#FF8FB6", glow: "#18264D", onPrimary: "#081126" } },
  pearl: { id: "pearl", isDark: false, colors: { background: "#F7F8F6", surface: "#FFFFFF", surfaceMuted: "#EDF1EE", text: "#15201C", muted: "#61736B", border: "#D9E2DC", primary: "#148B69", secondary: "#7663C7", accent: "#CA4E78", glow: "#D8F0E7", onPrimary: "#F6FFFB" } },
  velvet: { id: "velvet", isDark: true, colors: { background: "#120A18", surface: "#21132B", surfaceMuted: "#191020", text: "#FFF8FE", muted: "#C3AAC5", border: "#3E284A", primary: "#E888D1", secondary: "#A78BFA", accent: "#FFAC67", glow: "#3B1E41", onPrimary: "#280B21" } },
  sunset: { id: "sunset", isDark: true, colors: { background: "#171009", surface: "#261B12", surfaceMuted: "#1E150E", text: "#FFF8F0", muted: "#C8B29B", border: "#4A3320", primary: "#F9B75D", secondary: "#F7797D", accent: "#84DCC6", glow: "#4B2D18", onPrimary: "#2A1904" } },
};

const PREFERENCES_KEY = "omniwave:ui-preferences:v2";
const DEFAULT_FAVORITE_CARD_PREFERENCES: FavoriteCardPreferences = { style: "glass", color: "teal" };
type StoredPreferences = { locale?: unknown; themeId?: unknown; favoriteCard?: unknown };
type ThemeContextValue = {
  theme: AppTheme;
  themeId: AppThemeId;
  setThemeId: (themeId: AppThemeId) => void;
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  favoriteCardPreferences: FavoriteCardPreferences;
  setFavoriteCardPreferences: (preferences: FavoriteCardPreferences) => void;
  resetFavoriteCardPreferences: () => void;
  isRTL: boolean;
  direction: "rtl" | "ltr";
  t: (key: TranslationKey) => string;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);
const isThemeId = (value: unknown): value is AppThemeId => typeof value === "string" && Object.prototype.hasOwnProperty.call(APP_THEMES, value);
const isFavoriteCardStyle = (value: unknown): value is FavoriteCardStyle => value === "glass" || value === "editorial" || value === "minimal";
const isFavoriteCardColor = (value: unknown): value is FavoriteCardColor => value === "teal" || value === "violet" || value === "rose";
const sanitizeFavoriteCardPreferences = (value: unknown): FavoriteCardPreferences => typeof value === "object" && value !== null && isFavoriteCardStyle((value as Record<string, unknown>).style) && isFavoriteCardColor((value as Record<string, unknown>).color) ? { style: (value as Record<string, FavoriteCardStyle>).style, color: (value as Record<string, FavoriteCardColor>).color } : DEFAULT_FAVORITE_CARD_PREFERENCES;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeIdState] = useState<AppThemeId>("aurora");
  const [locale, setLocaleState] = useState<AppLocale>("ar");
  const [favoriteCardPreferences, setFavoriteCardPreferencesState] = useState<FavoriteCardPreferences>(DEFAULT_FAVORITE_CARD_PREFERENCES);
  const [isFavoriteCardCustomized, setIsFavoriteCardCustomized] = useState(false);
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
        if (isThemeId(stored.themeId)) setThemeIdState(stored.themeId);
        if (isAppLocale(stored.locale)) setLocaleState(stored.locale);
        const restoredCard = sanitizeFavoriteCardPreferences(stored.favoriteCard);
        setFavoriteCardPreferencesState(restoredCard);
        setIsFavoriteCardCustomized(isFavoriteCardStyle((stored.favoriteCard as Record<string, unknown> | undefined)?.style) && isFavoriteCardColor((stored.favoriteCard as Record<string, unknown> | undefined)?.color));
      } catch { /* Ignore malformed local preferences safely. */ }
    }).finally(() => { if (active) setReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    nativewindColorScheme.set(colorScheme);
    Appearance.setColorScheme?.(colorScheme);
    if (typeof document !== "undefined") {
      const root = document.documentElement;
      root.dataset.theme = colorScheme;
      root.dir = direction;
      root.lang = locale;
    }
  }, [colorScheme, direction, locale]);

  useEffect(() => {
    if (!ready) return;
    const saved = isFavoriteCardCustomized ? { locale, themeId, favoriteCard: favoriteCardPreferences } : { locale, themeId };
    void AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(saved)).catch(() => undefined);
  }, [favoriteCardPreferences, isFavoriteCardCustomized, locale, ready, themeId]);

  const setThemeId = useCallback((nextThemeId: AppThemeId) => { if (isThemeId(nextThemeId)) setThemeIdState(nextThemeId); }, []);
  const setColorScheme = useCallback((scheme: ColorScheme) => setThemeIdState(scheme === "light" ? "pearl" : "aurora"), []);
  const setLocale = useCallback((nextLocale: AppLocale) => { if (isAppLocale(nextLocale)) setLocaleState(nextLocale); }, []);
  const setFavoriteCardPreferences = useCallback((nextPreferences: FavoriteCardPreferences) => { setFavoriteCardPreferencesState(sanitizeFavoriteCardPreferences(nextPreferences)); setIsFavoriteCardCustomized(true); }, []);
  const resetFavoriteCardPreferences = useCallback(() => { setFavoriteCardPreferencesState(DEFAULT_FAVORITE_CARD_PREFERENCES); setIsFavoriteCardCustomized(false); }, []);
  const t = useCallback((key: TranslationKey) => TRANSLATIONS[locale][key] as string, [locale]);

  const themeVariables = useMemo(() => vars({
    "color-primary": theme.colors.primary, "color-background": theme.colors.background, "color-surface": theme.colors.surface, "color-foreground": theme.colors.text, "color-muted": theme.colors.muted, "color-border": theme.colors.border, "color-success": theme.colors.primary, "color-warning": theme.colors.secondary, "color-error": theme.colors.accent,
  }), [theme]);
  const value = useMemo(() => ({ theme, themeId, setThemeId, colorScheme, setColorScheme, locale, setLocale, favoriteCardPreferences, setFavoriteCardPreferences, resetFavoriteCardPreferences, isRTL: direction === "rtl", direction, t }), [colorScheme, direction, favoriteCardPreferences, locale, resetFavoriteCardPreferences, setColorScheme, setFavoriteCardPreferences, setLocale, setThemeId, t, theme, themeId]);

  return <ThemeContext.Provider value={value}><View style={[{ flex: 1, backgroundColor: theme.colors.background }, themeVariables]}>{children}</View></ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used within ThemeProvider");
  return ctx;
}
