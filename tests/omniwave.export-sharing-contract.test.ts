import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("OmniWave custom export and visual favorite share contract", () => {
  it("limits custom history export to approved fields and supports escaped CSV", () => {
    const sharing = read("lib/omniwave/sharing.ts");
    const exportScreen = read("app/(tabs)/export-history.tsx");
    expect(sharing).toContain('HISTORY_EXPORT_FIELDS = ["title", "artist", "album", "genre", "mood", "tags"]');
    expect(sharing).toContain("normalizeFields");
    expect(sharing).toContain("escapeCsv");
    expect(sharing).toContain('format === "csv"');
    expect(sharing).not.toContain("audioUri");
    expect(exportScreen).toContain('accessibilityRole="checkbox"');
    expect(exportScreen).toContain('accessibilityRole="radio"');
    expect(exportScreen).toContain("buildListeningHistoryExport");
  });

  it("captures a local favorite card and falls back to concise text sharing", () => {
    const card = read("components/omniwave/favorite-share-card.tsx");
    const sharing = read("lib/omniwave/sharing.ts");
    const profile = read("app/(tabs)/profile.tsx");
    expect(card).toContain("collapsable={false}");
    expect(card).toContain("OMNIWAVE FAVORITES");
    expect(sharing).toContain("captureRef(cardRef");
    expect(sharing).toContain('format: "png"');
    expect(sharing).toContain("await shareFavorites(favoriteTracks)");
    expect(profile).toContain("FavoriteShareCard");
    expect(profile).toContain("shareFavoriteCard");
    expect(profile).toContain('router.push("/(tabs)/export-history"');
  });

  it("keeps time filtering and size estimates local before creating an export file", () => {
    const sharing = read("lib/omniwave/sharing.ts");
    const exportScreen = read("app/(tabs)/export-history.tsx");
    expect(sharing).toContain('type HistoryTimeRange = "day" | "week" | "thirtyDays" | "month" | "all" | "custom"');
    expect(sharing).toContain("filterListeningHistory");
    expect(sharing).toContain('range === "month"');
    expect(sharing).toContain("parseHistoryDate");
    expect(sharing).toContain("estimateListeningHistoryExportSize");
    expect(sharing).toContain("formatEstimatedBytes");
    expect(exportScreen).toContain('@react-native-community/datetimepicker');
    expect(exportScreen).toContain("DateTimePicker");
    expect(exportScreen).toContain("datePickerHint");
    expect(exportScreen).toContain('t("estimatedSize")');
    expect(exportScreen).toContain("customRangeInvalid");
    expect(exportScreen).toContain('month: t("thisMonth")');
    expect(exportScreen).toContain('thirtyDays: t("lastThirtyDays")');
    expect(sharing).not.toContain("audioUri");
  });

  it("offers previewable, accessible visual-card styles and accent colors", () => {
    const card = read("components/omniwave/favorite-share-card.tsx");
    const profile = read("app/(tabs)/profile.tsx");
    expect(card).toContain("FavoriteCardStyle");
    expect(card).toContain("FavoriteCardColor");
    expect(profile).toContain('accessibilityRole="radiogroup"');
    expect(profile).toContain("chooseCardStyle");
    expect(profile).toContain("chooseCardColor");
    expect(profile).toContain("variant={cardStyle}");
    expect(profile).toContain("accent={cardColor}");
  });

  it("persists validated favorite-card preferences and exposes real export progress states", () => {
    const sharing = read("lib/omniwave/sharing.ts");
    const exportScreen = read("app/(tabs)/export-history.tsx");
    const themeProvider = read("lib/theme-provider.tsx");
    const profile = read("app/(tabs)/profile.tsx");
    expect(sharing).toContain('HistoryExportProgressStage = "preparing" | "writing" | "sharing"');
    expect(sharing).toContain("onProgress?.(\"writing\")");
    expect(exportScreen).toContain('accessibilityRole="progressbar"');
    expect(exportScreen).toContain("EXPORT_PROGRESS");
    expect(themeProvider).toContain("sanitizeFavoriteCardPreferences");
    expect(themeProvider).toContain("favoriteCardPreferences");
    expect(themeProvider).toContain("setFavoriteCardPreferences");
    expect(themeProvider).toContain("resetFavoriteCardPreferences");
    expect(profile).toContain("resetCardPreferences");
  });

  it("confirms a successful local file creation before opening the system share sheet", () => {
    const sharing = read("lib/omniwave/sharing.ts");
    const exportScreen = read("app/(tabs)/export-history.tsx");
    expect(sharing).toContain("createListeningHistoryExport");
    expect(sharing).toContain("openListeningHistoryShare");
    expect(exportScreen).toContain("ExportSuccessNotice");
    expect(exportScreen).toContain('accessibilityRole="alert"');
    expect(exportScreen).toContain("AccessibilityInfo.isReduceMotionEnabled");
    expect(exportScreen).toContain("waitForConfirmation");
  });
});
