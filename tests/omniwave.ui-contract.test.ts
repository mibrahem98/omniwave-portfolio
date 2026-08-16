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
    expect(layout).toContain("activeIndicator");
    expect(layout).toContain('accessibilityElementsHidden');
    expect(layout).toContain("AppearanceShortcut");
    expect(layout).toContain('t("appearanceShortcut")');
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
    expect(settings).toContain("themePickerCard");
    expect(settings).toContain("selectedThemeMark");
    expect(settings).toContain("themeAccentLine");
    expect(settings).toContain("haptic.selection");
    expect(settings).toContain("themePreviewId");
    expect(settings).toContain('t("themePreview")');
    expect(settings).toContain('t("applyTheme")');
    expect(settings).toContain("ThemePreviewModal");
    expect(read("components/omniwave/theme-preview-modal.tsx")).toContain("ThemePreviewPlayer");
    expect(read("components/omniwave/theme-preview-player.tsx")).toContain("play-arrow");
  });

  it("keeps quick-access ordering local, validated, and usable with gesture and button alternatives", () => {
    const home = read("app/(tabs)/index.tsx");
    const themeProvider = read("lib/theme-provider.tsx");
    const localization = read("lib/localization.ts");
    expect(themeProvider).toContain("QUICK_ACCESS_IDS");
    expect(themeProvider).toContain("sanitizeQuickAccessOrder");
    expect(themeProvider).toContain("quickAccessOrder");
    expect(themeProvider).toContain("setQuickAccessOrder");
    expect(themeProvider).toContain("resetQuickAccessOrder");
    expect(themeProvider).toContain("quickAccessHintSeen");
    expect(themeProvider).toContain("canUndoQuickAccessOrder");
    expect(themeProvider).toContain("undoQuickAccessOrder");
    expect(themeProvider).toContain("hapticFeedbackEnabled");
    expect(home).toContain("Gesture.Pan()");
    expect(home).toContain("activateAfterLongPress");
    expect(home).toContain("AccessibilityInfo.isReduceMotionEnabled");
    expect(home).toContain("dragStatus");
    expect(home).toContain("Animated.parallel");
    expect(home).toContain('t("moveEarlier")');
    expect(home).toContain('t("moveLater")');
    expect(home).toContain('t("resetQuickAccess")');
    expect(home).toContain('t("quickAccessGuideTitle")');
    expect(home).toContain('t("undoQuickAccess")');
    expect(read("app/(tabs)/settings.tsx")).toContain('t("hapticFeedback")');
    expect(read("lib/omniwave/haptics.ts")).toContain("setHapticFeedbackEnabled");
    const themePreview = read("components/omniwave/theme-preview-modal.tsx");
    expect(themePreview).toContain("queueRows");
    expect(themePreview).toContain("settingsRows");
    for (const key of ["quickAccess", "quickAccessHint", "dragToReorder", "themePreview", "applyTheme", "appearanceShortcut"]) expect(localization).toContain(key);
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

  it("keeps contrast preview, validated accent choices, and metadata review reading scale local", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const metadataReview = read("app/(tabs)/metadata-review.tsx");
    const localization = read("lib/localization.ts");
    expect(themeProvider).toContain("HighContrastAccent");
    expect(themeProvider).toContain("isHighContrastAccent");
    expect(themeProvider).toContain("highContrastAccent");
    expect(themeProvider).toContain("setHighContrastAccent");
    expect(settings).toContain('t("highContrastPreview")');
    expect(settings).toContain("HIGH_CONTRAST_ACCENTS");
    expect(settings).toContain('accessibilityRole="radio"');
    expect(metadataReview).toContain("textScaleMultiplier");
    for (const key of ["highContrastPreview", "highContrastAccent", "highContrastAccentTeal", "highContrastAccentViolet", "highContrastAccentAmber"]) {
      expect(localization).toContain(key);
    }
  });

  it("keeps local font weight, full-player preview, and native-only haptic feedback for reading controls", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const trackRow = read("components/omniwave/track-row.tsx");
    const playerPreview = read("components/omniwave/accessibility-player-preview.tsx");
    const haptics = read("lib/omniwave/haptics.ts");
    const localization = read("lib/localization.ts");
    expect(themeProvider).toContain("FontWeightPreference");
    expect(themeProvider).toContain("FONT_WEIGHT_VALUES");
    expect(themeProvider).toContain("setFontWeightPreference");
    expect(settings).toContain("FONT_WEIGHTS");
    expect(settings).toContain("AccessibilityPlayerPreview");
    expect(settings).toContain("haptic.selection");
    expect(settings).toContain("haptic.medium");
    expect(trackRow).toContain("fontWeightValue");
    expect(playerPreview).toContain("skip-previous");
    expect(haptics).toContain("selectionAsync");
    expect(haptics).toContain('Platform.OS !== "web"');
    for (const key of ["fontWeight", "fontWeightHint", "fontWeightRegular", "fontWeightMedium", "fontWeightBold"]) {
      expect(localization).toContain(key);
    }
  });

  it("keeps line spacing, optional local reading font, and library preview within accessibility preferences", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const trackRow = read("components/omniwave/track-row.tsx");
    const playerPreview = read("components/omniwave/accessibility-player-preview.tsx");
    const libraryPreview = read("components/omniwave/accessibility-library-preview.tsx");
    const appConfig = read("app.config.ts");
    const localization = read("lib/localization.ts");
    expect(themeProvider).toContain("LineSpacingPreference");
    expect(themeProvider).toContain("ReadingFontPreference");
    expect(themeProvider).toContain("LINE_HEIGHT_MULTIPLIERS");
    expect(themeProvider).toContain("OpenDyslexic-Regular");
    expect(settings).toContain("LINE_SPACINGS");
    expect(settings).toContain("READING_FONTS");
    expect(settings).toContain("AccessibilityLibraryPreview");
    expect(trackRow).toContain("lineHeightMultiplier");
    expect(trackRow).toContain("readingFontFamily");
    expect(playerPreview).toContain("lineHeightMultiplier");
    expect(libraryPreview).toContain("music-note");
    expect(appConfig).toContain("expo-font");
    expect(appConfig).toContain("OpenDyslexic-Regular.ttf");
    for (const key of ["lineSpacing", "lineSpacingHint", "lineSpacingStandard", "lineSpacingRelaxed", "lineSpacingSpacious", "readingFont", "readingFontHint", "readingFontSystem", "readingFontDyslexia", "libraryPreview"]) {
      expect(localization).toContain(key);
    }
  });

  it("keeps local video import, playback controls, captions, and privacy boundaries available", () => {
    const types = read("lib/omniwave/types.ts");
    const validation = read("lib/omniwave/validation.ts");
    const store = read("lib/omniwave/video-store.tsx");
    const rootLayout = read("app/_layout.tsx");
    const tabs = read("app/(tabs)/_layout.tsx");
    const home = read("app/(tabs)/index.tsx");
    const library = read("app/(tabs)/videos.tsx");
    const player = read("app/(tabs)/video-player.tsx");
    const localization = read("lib/localization.ts");
    const sharing = read("lib/omniwave/sharing.ts");
    const routers = read("server/routers.ts");
    const llm = read("server/_core/llm.ts");
    expect(types).toContain("export type VideoItem");
    expect(types).toContain("export type VideoPreferences");
    expect(types).toContain("VideoCaptionPosition");
    expect(types).toContain("VideoCaptionBackground");
    expect(types).toContain("VideoSummary");
    expect(types).toContain("VideoSummaryLength");
    expect(validation).toContain("isSafeLocalVideoUri");
    expect(validation).toContain("isSafeLocalSubtitleUri");
    expect(store).toContain("omniwave:video-library:v1");
    expect(store).toContain("attachSubtitleFile");
    expect(store).toContain("removeSubtitleFile");
    expect(store).toContain("clearVideoProgress");
    expect(store).toContain("clearAllVideoProgress");
    expect(store).toContain("CAPTION_POSITIONS");
    expect(store).toContain("CAPTION_BACKGROUNDS");
    expect(store).toContain("DEFAULT_VIDEO_PREFERENCES");
    expect(store).toContain("AsyncStorage.setItem(STORAGE_KEY");
    expect(store).toContain("updateVideoDuration");
    expect(store).toContain("setVideoSummary");
    expect(rootLayout).toContain("VideoProvider");
    expect(tabs).toContain('name="videos" options={{ title: t("videos")');
    expect(tabs).toContain('name="video-player" options={{ href: null }}');
    expect(home).toContain('router.push("/(tabs)/videos"');
    expect(library).toContain("importVideoFiles");
    expect(library).toContain('t("videoLocalOnly")');
    expect(player).toContain("useVideoPlayer");
    expect(player).toContain("allowsFullscreen");
    expect(player).toContain("allowsPictureInPicture");
    expect(player).toContain("availableSubtitleTracks");
    expect(player).toContain("parseWebVtt");
    expect(player).toContain("attachSubtitleFile");
    expect(player).toContain("removeSubtitleFile");
    expect(player).toContain("captionTextSize");
    expect(player).toContain("captionTextColor");
    expect(player).toContain("captionPosition");
    expect(player).toContain("captionBackground");
    expect(player).toContain("seekBy(-30)");
    expect(player).toContain("seekBy(30)");
    expect(player).toContain("speedSettingsOpen");
    expect(player).toContain("Gesture.Tap().numberOfTaps(2)");
    expect(player).toContain("handleDoubleTap");
    expect(player).toContain("useReducedMotion");
    expect(player).toContain("Animated.spring");
    expect(player).toContain("searchVttCues");
    expect(player).toContain("jumpToCaptionResult");
    expect(player).toContain("HighlightedCaption");
    expect(player).toContain("trpc.video.summarizeCaptions");
    expect(routers).toContain("maxCompletionTokens: limit.tokens");
    expect(llm).toContain("max_completion_tokens");
    expect(llm).toContain("payload.max_completion_tokens");
    expect(player).toContain("summaryConsent");
    expect(player).toContain("summaryLengthSettingsOpen");
    expect(player).toContain("Clipboard.setStringAsync");
    expect(player).toContain("exportVideoSummary");
    expect(player).toContain("moveCaptionResult");
    expect(player).toContain("startPictureInPicture");
    expect(player).toContain("isPipStarting");
    expect(player).toContain("pipStarted");
    expect(player).toContain('t("videoPlaybackFailed")');
    expect(player).toContain("errorRetry");
    expect(player).toContain("ScreenOrientation.lockAsync");
    expect(player).toContain("updateVideoPosition");
    expect(library).toContain("continueWatching");
    expect(library).toContain("completion(item)");
    expect(library).toContain("clearAllVideoProgress");
    expect(library).toContain("clearVideoProgress");
    expect(sharing).toContain("buildVideoSummaryText");
    expect(sharing).toContain("Print.printToFileAsync");
    expect(sharing).toContain("exportVideoSummary");
    for (const key of ["videos", "videoLibrary", "videoEmpty", "videoLocalOnly", "playbackSpeed", "captions", "pictureInPicture", "pictureInPictureStarting", "pictureInPictureActive", "pictureInPictureHint", "pictureInPictureUnavailable", "videoPlaybackFailed", "continueWatching", "subtitleAttached", "captionTextSize", "captionTextColor", "captionPosition", "captionBackground", "searchCaptions", "captionPreviousResult", "captionNextResult", "summarizeCaptions", "summaryConsent", "summarySection", "summaryLength", "summaryLengthShort", "summaryLengthMedium", "summaryLengthDetailed", "copySummary", "exportSummaryText", "exportSummaryPdf", "seekBackward30", "seekForward30", "restartVideo", "landscapeVideo", "clearContinueWatching"]) {
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

  it("keeps native full-screen video, complete theme previews, and direct local imports discoverable", () => {
    const player = read("app/(tabs)/video-player.tsx");
    const home = read("app/(tabs)/index.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const preview = read("components/omniwave/theme-preview-modal.tsx");
    expect(player).toContain("OrientationLock.DEFAULT");
    expect(player).toContain("fullscreenOptions={{ enable: true }}");
    expect(player).toContain('contentFit={wideLayout ? "cover" : "contain"}');
    expect(player).toContain("onFullscreenEnter");
    expect(player).toContain("onFullscreenExit={restorePortrait}");
    expect(home).toContain("importAudioFiles");
    expect(home).toContain("importVideoFiles");
    expect(home).toContain('t("addFiles")');
    expect(home).toContain('t("addVideos")');
    expect(settings).toContain("DeprecatedThemePreviewModal");
    expect(preview).toContain("ScrollView");
    expect(preview).toContain("labels.library");
    expect(preview).toContain("labels.videos");
    expect(preview).toContain("labels.addFiles");
    expect(preview).toContain("labels.addVideos");
  });

  it("keeps advanced playback actions, safe local artwork, and an organized settings overview available", () => {
    const nowPlaying = read("app/(tabs)/now-playing.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const playerStore = read("lib/omniwave/player-store.tsx");
    const coverArt = read("components/omniwave/cover-art.tsx");
    const types = read("lib/omniwave/types.ts");
    const validation = read("lib/omniwave/validation.ts");
    const localization = read("lib/localization.ts");
    expect(nowPlaying).toContain('name="more-vert"');
    expect(nowPlaying).toContain("advancedActionsOpen");
    expect(nowPlaying).toContain("selectArtworkForTrack");
    expect(nowPlaying).toContain('t("chooseArtwork")');
    expect(nowPlaying).toContain('t("removeArtwork")');
    expect(settings).toContain("settingsSnapshot");
    expect(settings).toContain('t("settingsOverview")');
    expect(settings).toContain('t("mediaAndLibrary")');
    expect(types).toContain("artworkUri?: string");
    expect(validation).toContain("isSafeArtworkUri");
    expect(playerStore).toContain("MAX_ARTWORK_BYTES");
    expect(playerStore).toContain("selectArtworkForTrack");
    expect(playerStore).toContain("removeArtworkForTrack");
    expect(playerStore).toContain("ARTWORK_DIRECTORY");
    expect(coverArt).toContain('from "expo-image"');
    expect(coverArt).toContain("isSafeArtworkUri");
    for (const key of ["moreActions", "chooseArtwork", "removeArtwork", "artworkHint", "advancedControls", "settingsOverview", "mediaAndLibrary"]) expect(localization).toContain(key);
  });

  it("keeps full device media scanning permission-bound, local, and discoverable", () => {
    const scan = read("lib/omniwave/device-media-scan.ts");
    const audioStore = read("lib/omniwave/player-store.tsx");
    const videoStore = read("lib/omniwave/video-store.tsx");
    const home = read("app/(tabs)/index.tsx");
    const config = read("app.config.ts");
    const localization = read("lib/localization.ts");
    expect(scan).toContain("requestPermissionsAsync(false, granularPermissions)");
    expect(scan).toContain("getAssetsAsync");
    expect(scan).toContain("getAssetInfoAsync");
    expect(scan).toContain("shouldDownloadFromNetwork: false");
    expect(scan).toContain('kind === "audio" ? ["audio"] : ["video"]');
    expect(audioStore).toContain("importAudioFromDeviceLibrary");
    expect(videoStore).toContain("importVideoFromDeviceLibrary");
    expect(home).toContain('t("scanDeviceAudio")');
    expect(home).toContain('t("scanDeviceVideo")');
    expect(config).toContain('"expo-media-library"');
    expect(config).toContain('"granularPermissions": ["audio", "video"]');
    for (const key of ["scanDevice", "scanDeviceAudio", "scanDeviceVideo", "devicePermissionDenied", "deviceLibraryUnavailable", "deviceScanEmpty", "limitedMediaAccess", "deviceScanPrivacy"]) expect(localization).toContain(key);
  });

  it("keeps the floating shortcut movable, imported audio durable, and video chrome out of full screen", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const tabs = read("app/(tabs)/_layout.tsx");
    const audioStore = read("lib/omniwave/player-store.tsx");
    const scan = read("lib/omniwave/device-media-scan.ts");
    const videoPlayer = read("app/(tabs)/video-player.tsx");
    expect(themeProvider).toContain("appearanceShortcutEnabled");
    expect(themeProvider).toContain("appearanceShortcutPosition");
    expect(themeProvider).toContain("sanitizeFloatingShortcutPosition");
    expect(settings).toContain("setAppearanceShortcutEnabled");
    expect(tabs).toContain("PanResponder.create");
    expect(tabs).toContain("setAppearanceShortcutPosition");
    expect(tabs).toContain("opacity: 0.5");
    expect(tabs).toContain("isVideoPlayer");
    expect(audioStore).toContain("AUDIO_DIRECTORY");
    expect(audioStore).toContain("persistAudioAsset");
    expect(audioStore).toContain("useAudioPlayer(null");
    expect(audioStore).toContain("playerStatus.playing");
    expect(scan).toContain("const uri = details.localUri");
    expect(scan).toContain('uri.startsWith("ph:")');
    expect(videoPlayer).toContain('edges={wideLayout ? ["top", "bottom", "left", "right"]');
    expect(videoPlayer).toContain("toolsHeading");
  });

  it("keeps local video playlists, accessible video gestures, and persisted equalizer presets available", () => {
    const types = read("lib/omniwave/types.ts");
    const videoStore = read("lib/omniwave/video-store.tsx");
    const videos = read("app/(tabs)/videos.tsx");
    const videoPlayer = read("app/(tabs)/video-player.tsx");
    const playerStore = read("lib/omniwave/player-store.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const localization = read("lib/localization.ts");
    expect(types).toContain("export type VideoPlaylist");
    expect(videoStore).toContain("videoPlaylists");
    expect(videoStore).toContain("createVideoPlaylist");
    expect(videoStore).toContain("addVideoToPlaylist");
    expect(videos).toContain('t("videoPlaylists")');
    expect(videos).toContain('t("addToVideoPlaylist")');
    expect(videoPlayer).toContain("expo-brightness");
    expect(videoPlayer).toContain("Gesture.Pan()");
    expect(videoPlayer).toContain("applyBrightness");
    expect(videoPlayer).toContain("applyVolume");
    expect(videoPlayer).toContain('accessibilityRole="adjustable"');
    expect(playerStore).toContain("EQ_PRESETS");
    expect(playerStore).toContain("applyEqualizerPreset");
    expect(settings).toContain("EQ_PRESETS");
    for (const key of ["videoPlaylists", "createVideoPlaylist", "addToVideoPlaylist", "videoBrightness", "videoVolume", "equalizerPresetFlat", "equalizerPresetWarm", "equalizerPresetVocal", "equalizerPresetNight"]) expect(localization).toContain(key);
  });
});
