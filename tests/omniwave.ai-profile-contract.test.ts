import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");

describe("OmniWave AI metadata and local profile contract", () => {
  it("keeps metadata classification bounded, structured, and free of audio paths", () => {
    const router = read("server/routers.ts");
    const store = read("lib/omniwave/player-store.tsx");
    expect(router).toContain('classifyMetadata');
    expect(router).toContain("z.array(metadataInput).min(1).max(4)");
    expect(router).toContain('response_format: { type: "json_schema"');
    expect(store).toContain("aiMetadataEnabled");
    expect(store).toContain("sanitizeClassification");
    expect(store).toContain("classifyImportedTracks");
    expect(store).not.toContain("audioUri: track.audioUri");
  });

  it("keeps the listening profile local and editable without account routes", () => {
    const store = read("lib/omniwave/player-store.tsx");
    const profile = read("app/(tabs)/profile.tsx");
    expect(store).toContain("LocalListeningProfile");
    expect(store).toContain("sanitizeProfile");
    expect(store).toContain("updateProfile");
    expect(profile).toContain('t("localProfileHint")');
    expect(profile).toContain("updateProfile(name, bio)");
  });

  it("keeps the player visual and seek surface accessible", () => {
    const player = read("app/(tabs)/now-playing.tsx");
    const pulse = read("components/omniwave/audio-pulse.tsx");
    const transition = read("components/omniwave/track-transition.tsx");
    expect(player).toContain("PanResponder.create");
    expect(player).toContain('accessibilityRole="adjustable"');
    expect(player).toContain("accessibilityActions");
    expect(player).toContain("<AudioPulse");
    expect(pulse).toContain("isReduceMotionEnabled");
    expect(transition).toContain("isReduceMotionEnabled");
    expect(transition).toContain("duration: 280");
  });

  it("requires manual review before committing classification and keeps exports local", () => {
    const store = read("lib/omniwave/player-store.tsx");
    const review = read("app/(tabs)/metadata-review.tsx");
    const sharing = read("lib/omniwave/sharing.ts");
    expect(store).toContain("suggestedClassification");
    expect(store).toContain("acceptClassification");
    expect(store).toContain("rejectClassification");
    expect(store).toContain("reclassifyTrack");
    expect(review).toContain("metadataReviewHint");
    expect(review).toContain("acceptClassification(selected.id, value)");
    expect(sharing).toContain("Sharing.isAvailableAsync()");
    expect(sharing).toContain("FileSystem.writeAsStringAsync");
    expect(sharing).toContain("track.classification?.tags");
    expect(sharing).not.toContain("audioUri");
  });
});
