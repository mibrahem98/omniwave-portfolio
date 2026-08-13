import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("OmniWave discovery and playlist management contract", () => {
  it("keeps compound filters and deterministic local sorting available", () => {
    const library = read("app/(tabs)/library.tsx");
    expect(library).toContain('const FILTERS = ["favorites", "imports", "short", "long"]');
    expect(library).toContain('const SORTS = ["recent", "title", "artist", "album", "duration"]');
    expect(library).toContain("activeFilters.every");
    expect(library).toContain('accessibilityRole="checkbox"');
    expect(library).toContain('accessibilityRole="radio"');
  });

  it("keeps playlist rename and order changes inside validated player actions", () => {
    const store = read("lib/omniwave/player-store.tsx");
    const playlists = read("components/omniwave/playlists-screen.tsx");
    expect(store).toContain("normalizePlaylistName");
    expect(store).toContain("renamePlaylist");
    expect(store).toContain("movePlaylist");
    expect(playlists).toContain('t("renamePlaylist")');
    expect(playlists).toContain('t("moveUp")');
    expect(playlists).toContain('t("moveDown")');
  });

  it("keeps content reveal motion optional for reduced-motion users", () => {
    const reveal = read("components/omniwave/reveal.tsx");
    expect(reveal).toContain("isReduceMotionEnabled");
    expect(reveal).toContain("reduceMotionChanged");
    expect(reveal).toContain("useNativeDriver: true");
  });
});
