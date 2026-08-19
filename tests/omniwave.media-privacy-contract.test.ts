import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) => readFileSync(join(process.cwd(), relativePath), "utf8");
const MEDIA_PATHS = [
  "lib/omniwave/player-store.tsx",
  "lib/omniwave/video-store.tsx",
  "lib/omniwave/device-media-scan.ts",
  "app/(tabs)/video-player.tsx",
];

describe("local media privacy contract", () => {
  it("keeps direct diagnostic logging out of media import and playback paths", () => {
    for (const relativePath of MEDIA_PATHS) {
      expect(read(relativePath)).not.toMatch(/console\.(log|warn|error)|logger\./);
    }
  });

  it("retains the validated local-only boundaries for import and playback", () => {
    const playerStore = read("lib/omniwave/player-store.tsx");
    const videoStore = read("lib/omniwave/video-store.tsx");
    expect(playerStore).toContain("isSafeAudioUri");
    expect(playerStore).toContain("createLocalMediaFingerprint");
    expect(videoStore).toContain("isSafeLocalVideoUri");
    expect(videoStore).toContain("createLocalMediaFingerprint");
  });
});
