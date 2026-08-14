import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(process.cwd());
const read = (relativePath: string) => readFileSync(join(root, relativePath), "utf8");

describe("OmniWave navigation and settings contract", () => {
  it("keeps the core listening destinations and quick tools in bottom navigation", () => {
    const layout = read("app/(tabs)/_layout.tsx");
    expect(layout).toContain('name="index"');
    expect(layout).toContain('name="library"');
    expect(layout).toContain('name="playlists"');
    expect(layout).toContain('name="tools"');
    expect(layout).toContain('name="settings"');
    expect(layout).toContain('name="now-playing" options={{ href: null }}');
    expect(layout).toContain('name="waveform.path.ecg"');
    expect(layout).toContain("tabBarHideOnKeyboard: true");
    expect(read("components/ui/icon-symbol.tsx")).toContain('"waveform.path.ecg": "equalizer"');
  });

  it("keeps direct access to playback controls from the home and mini-player surfaces", () => {
    expect(read("app/(tabs)/index.tsx")).toContain('router.push("/(tabs)/now-playing"');
    const miniPlayer = read("components/omniwave/mini-player.tsx");
    expect(miniPlayer).toContain('router.push("/(tabs)/now-playing"');
    expect(miniPlayer).toContain("togglePlay");
    expect(miniPlayer).toContain("Gesture.Pan()");
    expect(miniPlayer).toContain("nextTrack");
    expect(miniPlayer).toContain("previousTrack");
    expect(miniPlayer).toContain("runOnJS(true)");
  });

  it("keeps persisted listening personalization controls available", () => {
    const settings = read("app/(tabs)/settings.tsx");
    expect(settings).toContain("updatePreference");
    expect(settings).toContain("updateEqBand");
    expect(settings).toContain("setThemeId");
    expect(settings).toContain("setColorScheme");
    expect(settings).toContain("setLocale");
    expect(settings).toContain('t("darkMode")');
    expect(settings).toContain('colorScheme === "dark"');
    expect(settings).toContain("resetOnboarding");
    expect(settings).toContain('t("onboardingReplay")');
    expect(settings).toContain('accessibilityRole="radio"');
    expect(settings).toContain('accessibilityRole="switch"');
  });

  it("keeps queue and sleep-timer controls available in the quick tools screen", () => {
    const tools = read("app/(tabs)/tools.tsx");
    expect(tools).toContain("setSleepTimer");
    expect(tools).toContain("clearQueue");
    expect(tools).toContain("playQueueTrack");
    expect(tools).toContain("moveQueueTrack");
    expect(tools).toContain('t("moveUp")');
    expect(tools).toContain('t("moveDown")');
  });

  it("keeps native background playback and lock-screen metadata configured", () => {
    const store = read("lib/omniwave/player-store.tsx");
    const config = read("app.config.ts");
    expect(store).toContain("shouldPlayInBackground: true");
    expect(store).toContain("setActiveForLockScreen");
    expect(config).toContain("enableBackgroundPlayback: true");
  });

  it("keeps recovery controls visible for playback and import failures", () => {
    const nowPlaying = read("app/(tabs)/now-playing.tsx");
    const library = read("app/(tabs)/library.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    expect(nowPlaying).toContain("playbackIssue === \"playback\"");
    expect(nowPlaying).toContain('t("retry")');
    expect(library).toContain("isImporting");
    expect(library).toContain('t("importFailed")');
    expect(settings).toContain("resetAudioPreferences");
  });

  it("keeps quick access and structural loading for local collections", () => {
    const library = read("app/(tabs)/library.tsx");
    const playlists = read("components/omniwave/playlists-screen.tsx");
    expect(library).toContain("favoriteTracks");
    expect(library).toContain("recentTracks");
    expect(library).toContain("CollectionSkeleton variant=\"library\"");
    expect(playlists).toContain("CollectionSkeleton variant=\"playlists\"");
    expect(read("components/omniwave/content-skeleton.tsx")).toContain("isReduceMotionEnabled");
  });

  it("keeps scoped local search and replayable onboarding available", () => {
    const library = read("app/(tabs)/library.tsx");
    const themeProvider = read("lib/theme-provider.tsx");
    const onboarding = read("components/omniwave/onboarding-coach.tsx");
    expect(library).toContain("SEARCH_SCOPES");
    expect(library).toContain("searchScope");
    expect(library).toContain("clearDiscovery");
    expect(library).toContain("LIBRARY_DISCOVERY_KEY");
    expect(library).toContain("AsyncStorage.getItem");
    expect(library).toContain("AsyncStorage.setItem");
    expect(library).toContain('t("searchIn")');
    expect(themeProvider).toContain("completeOnboarding");
    expect(themeProvider).toContain("resetOnboarding");
    expect(onboarding).toContain("onboardingExportTitle");
    expect(onboarding).toContain("accessibilityViewIsModal");
    expect(onboarding).toContain("AccessibilityInfo.isReduceMotionEnabled");
    expect(onboarding).toContain("Animated.parallel");
    expect(read("CONTRIBUTING.md")).toContain("pnpm check");
    expect(read("CONTRIBUTING.md")).toContain("reduced-motion");
  });

  it("keeps search reset and onboarding skip as explicit local-only actions", () => {
    const library = read("app/(tabs)/library.tsx");
    const themeProvider = read("lib/theme-provider.tsx");
    const onboarding = read("components/omniwave/onboarding-coach.tsx");
    expect(library).toContain("resetDiscoveryPreferences");
    expect(library).toContain("AsyncStorage.removeItem(LIBRARY_DISCOVERY_KEY)");
    expect(library).toContain('t("resetSearchPreferences")');
    expect(themeProvider).toContain("skipOnboarding");
    expect(onboarding).toContain("onPress={skipOnboarding}");
  });

  it("keeps all named light themes selectable with a non-color selection cue", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const localization = read("lib/localization.ts");
    for (const themeId of ["cloud", "tidal", "porcelain"]) {
      expect(themeProvider).toContain(`${themeId}: { id: "${themeId}"`);
    }
    expect(settings).toContain("themeLabels");
    expect(settings).toContain('name="check"');
    expect(settings).toContain('accessibilityState={{ selected }}');
    expect(localization).toContain("themeCloud");
    expect(localization).toContain("themeTidal");
    expect(localization).toContain("themePorcelain");
  });

  it("keeps adaptive appearance and interface density local, explicit, and accessible", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const tabs = read("app/(tabs)/_layout.tsx");
    const localization = read("lib/localization.ts");
    expect(themeProvider).toContain("InterfaceDensity");
    expect(themeProvider).toContain("followSystemAppearance");
    expect(themeProvider).toContain("Appearance.addChangeListener");
    expect(themeProvider).toContain("setFollowSystemAppearance");
    expect(themeProvider).toContain("interfaceDensity");
    expect(settings).toContain("DENSITIES");
    expect(settings).toContain('t("systemAppearance")');
    expect(settings).toContain('t("appearanceDensity")');
    expect(settings).toContain("themeDescriptions");
    expect(settings).toContain('accessibilityRole="radiogroup"');
    expect(tabs).toContain("interfaceDensity");
    expect(tabs).toContain("const compact");
    for (const key of ["appearanceDensity", "systemAppearance", "themeCloudHint", "themeTidalHint", "themePorcelainHint"]) {
      expect(localization).toContain(key);
    }
  });

  it("keeps local text scale, compact listening layouts, and reduced-motion appearance transitions", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const library = read("app/(tabs)/library.tsx");
    const nowPlaying = read("app/(tabs)/now-playing.tsx");
    const trackRow = read("components/omniwave/track-row.tsx");
    const transition = read("components/omniwave/appearance-transition.tsx");
    const rootLayout = read("app/_layout.tsx");
    const localization = read("lib/localization.ts");
    expect(themeProvider).toContain("TextScale");
    expect(themeProvider).toContain("TEXT_SCALE_MULTIPLIERS");
    expect(themeProvider).toContain("setTextScale");
    expect(settings).toContain("TEXT_SCALES");
    expect(settings).toContain('t("textSize")');
    expect(library).toContain("contentCompact");
    expect(nowPlaying).toContain("coverCompact");
    expect(trackRow).toContain("rowCompact");
    expect(transition).toContain("reduceMotionChanged");
    expect(transition).toContain("interfaceDensity");
    expect(rootLayout).toContain("AppearanceTransition");
    for (const key of ["textSize", "textScaleStandard", "textScaleLarge", "textScaleExtraLarge"]) {
      expect(localization).toContain(key);
    }
  });

  it("keeps a live reading preview and limited accessibility reset across export and playlists", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const exportHistory = read("app/(tabs)/export-history.tsx");
    const playlists = read("components/omniwave/playlists-screen.tsx");
    const localization = read("lib/localization.ts");
    expect(themeProvider).toContain("resetAccessibilityPreferences");
    expect(themeProvider).toContain('setInterfaceDensityState("comfortable")');
    expect(themeProvider).toContain('setTextScaleState("standard")');
    expect(settings).toContain('t("textPreviewTitle")');
    expect(settings).toContain('t("resetAccessibility")');
    expect(settings).toContain("textScaleMultiplier");
    expect(exportHistory).toContain("textScaleMultiplier");
    expect(playlists).toContain("textScaleMultiplier");
    for (const key of ["textPreviewTitle", "textPreviewBody", "resetAccessibility", "resetAccessibilityHint"]) {
      expect(localization).toContain(key);
    }
  });

  it("keeps high contrast local, queue reading scaled, and accessibility feedback motion reduced-motion aware", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const tools = read("app/(tabs)/tools.tsx");
    const profile = read("app/(tabs)/profile.tsx");
    const feedback = read("components/omniwave/accessibility-feedback.tsx");
    const localization = read("lib/localization.ts");
    expect(themeProvider).toContain("withHighContrast");
    expect(themeProvider).toContain("highContrast");
    expect(themeProvider).toContain("setHighContrast");
    expect(settings).toContain('t("highContrast")');
    expect(settings).toContain("AccessibilityFeedback");
    expect(settings).toContain("onScrollBeginDrag");
    expect(tools).toContain("textScaleMultiplier");
    expect(profile).toContain("TrackRow");
    expect(feedback).toContain("reduceMotionChanged");
    expect(feedback).toContain("pulseKey");
    for (const key of ["highContrast", "highContrastHint"]) {
      expect(localization).toContain(key);
    }
  });

  it("keeps respectful community standards connected to the public contribution path", () => {
    const codeOfConduct = read("CODE_OF_CONDUCT.md");
    const readme = read("README.md");
    expect(readme).toContain("CODE_OF_CONDUCT.md");
    expect(codeOfConduct).toContain("Unacceptable conduct");
    expect(codeOfConduct).toContain("audio URIs");
  });
});
