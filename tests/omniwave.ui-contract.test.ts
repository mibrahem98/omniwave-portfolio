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
});
