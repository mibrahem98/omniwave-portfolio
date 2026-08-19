import { describe, expect, it } from "vitest";

import { createLocalMediaFingerprint, filterNewLocalMedia, shouldReplaceAudioSource } from "../lib/omniwave/media-stability";

describe("local media stability guards", () => {
  it("creates a stable one-way fingerprint without retaining the source name", () => {
    const fingerprint = createLocalMediaFingerprint({ fileName: "جلسة خاصة.mp3", sizeBytes: 2048, durationSeconds: 181 });
    expect(fingerprint).toMatch(/^lm-[a-f0-9]{16}$/);
    expect(fingerprint).not.toContain("جلسة");
    expect(fingerprint).toBe(createLocalMediaFingerprint({ fileName: "جلسة خاصة.mp3", sizeBytes: 2048, durationSeconds: 181 }));
    expect(fingerprint).toBe(createLocalMediaFingerprint({ fileName: "جلسة خاصة.mp3", sizeBytes: 2048, durationSeconds: 0 }));
  });

  it("filters repeated source entries both against the library and within one batch", () => {
    const existing = createLocalMediaFingerprint({ fileName: "already.mp3", sizeBytes: 10, durationSeconds: 2 });
    const entries = [{ name: "already.mp3", size: 10, duration: 2 }, { name: "new.m4a", size: 12, duration: 3 }, { name: "new.m4a", size: 12, duration: 3 }];
    const accepted = filterNewLocalMedia(entries, [existing], (entry) => createLocalMediaFingerprint({ fileName: entry.name, sizeBytes: entry.size, durationSeconds: entry.duration }));
    expect(accepted).toEqual([entries[1]]);
  });

  it("replaces the native source when the loaded track is missing or changes", () => {
    expect(shouldReplaceAudioSource(null, "track-a")).toBe(true);
    expect(shouldReplaceAudioSource("track-a", "track-a")).toBe(false);
    expect(shouldReplaceAudioSource("track-a", "track-b")).toBe(true);
  });
});
