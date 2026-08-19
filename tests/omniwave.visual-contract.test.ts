import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("OmniWave visual polish contract", () => {
  it("keeps complete theme palettes including a dedicated glow color", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    expect(themeProvider).toContain("glow: string");
    expect(themeProvider).toContain("glass: string");
    expect(themeProvider).toContain("glassStrong: string");
    expect(themeProvider).toContain("glassInset: string");
    expect(themeProvider).toContain("glassOverlay: string");
    expect(themeProvider).toContain("glassBorder: string");
    expect(themeProvider).toContain("glassHighlight: string");
    expect(themeProvider.match(/glow:/g)?.length).toBeGreaterThanOrEqual(9);
    expect(themeProvider).toContain("withHighContrast");
    expect(themeProvider).toContain('id: "aurora"');
    expect(themeProvider).toContain('id: "sunset"');
    expect(themeProvider).toContain('id: "cloud"');
    expect(themeProvider).toContain('id: "tidal"');
    expect(themeProvider).toContain('id: "porcelain"');
  });

  it("keeps hierarchy and motion on the primary listening screen", () => {
    const home = read("app/(tabs)/index.tsx");
    expect(home).toContain("sessionGlowPrimary");
    expect(home).toContain("PrismBackdrop");
    expect(home).toContain("theme.colors.glassStrong");
    expect(home).toContain("queueSummary");
    expect(home).toContain("<Reveal");
    expect(home).toContain('accessibilityRole="button"');
  });

  it("keeps clear active navigation and reduced-motion support", () => {
    const tabs = read("app/(tabs)/_layout.tsx");
    const reveal = read("components/omniwave/reveal.tsx");
    expect(tabs).toContain("tabBarActiveBackgroundColor");
    expect(tabs).toContain("tabBarHideOnKeyboard: true");
    expect(reveal).toContain("isReduceMotionEnabled");
    expect(reveal).toContain("reduceMotionChanged");
  });

  it("keeps the shared glass primitive and applies it across media and settings surfaces", () => {
    const glassCard = read("components/omniwave/glass-card.tsx");
    const player = read("app/(tabs)/now-playing.tsx");
    const video = read("app/(tabs)/video-player.tsx");
    const settings = read("app/(tabs)/settings.tsx");
    const miniPlayer = read("components/omniwave/mini-player.tsx");
    const preview = read("components/omniwave/theme-preview-modal.tsx");
    const appearanceTransition = read("components/omniwave/appearance-transition.tsx");
    const trackRow = read("components/omniwave/track-row.tsx");
    expect(glassCard).toContain("PrismBackdrop");
    expect(glassCard).toContain("RIPPLE_HEIGHTS");
    expect(glassCard).toContain("rippleCluster");
    expect(glassCard).toContain('tone?: "hero" | "elevated" | "quiet" | "inset"');
    expect(glassCard).toContain("lumaRail");
    expect(glassCard).toContain("blurLayer");
    expect(glassCard).toContain("return <View style={[styles.card");
    expect(glassCard).toContain('style={styles.blurLayer}');
    expect(player).toContain("PrismBackdrop");
    expect(video).toContain("PrismBackdrop");
    expect(settings).toContain("theme.colors.glassStrong");
    expect(settings).toContain("theme.colors.glassBorder");
    expect(miniPlayer).toContain("theme.colors.glassStrong");
    expect(miniPlayer).toContain("lumaRail");
    expect(preview).toContain("previewGlow");
    expect(preview).toContain("theme.colors.glassInset");
    expect(appearanceTransition).toContain("sheenOpacity");
    expect(appearanceTransition).toContain("isReduceMotionEnabled");
    expect(trackRow).toContain("useReducedMotion");
    expect(trackRow).toContain("pressedReduced");
    expect(player).toContain("resolveMediaGlassAccent");
    expect(video).toContain("resolveMediaGlassAccent");
  });
});
