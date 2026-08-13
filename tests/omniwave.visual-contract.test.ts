import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("OmniWave visual polish contract", () => {
  it("keeps complete theme palettes including a dedicated glow color", () => {
    const themeProvider = read("lib/theme-provider.tsx");
    expect(themeProvider).toContain("glow: string");
    expect(themeProvider.match(/glow:/g)).toHaveLength(6);
    expect(themeProvider).toContain('id: "aurora"');
    expect(themeProvider).toContain('id: "sunset"');
  });

  it("keeps hierarchy and motion on the primary listening screen", () => {
    const home = read("app/(tabs)/index.tsx");
    expect(home).toContain("sessionGlowPrimary");
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
});
