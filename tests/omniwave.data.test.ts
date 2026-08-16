import { describe, expect, it } from "vitest";

import { DEFAULT_AUDIO_PREFERENCES, INITIAL_PLAYLISTS, INITIAL_TRACKS, formatTime } from "../lib/omniwave/data";
import { isSafeArtworkUri, isSafeAudioUri } from "../lib/omniwave/validation";

describe("OmniWave library data", () => {
  it("formats playback time safely", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(Number.NaN)).toBe("0:00");
  });

  it("starts with a valid local-only library shape", () => {
    const ids = INITIAL_TRACKS.map((track) => track.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(INITIAL_TRACKS.every((track) => Boolean(track.audioUri))).toBe(true);
    expect(INITIAL_PLAYLISTS.every((playlist) => playlist.trackIds.every((id) => ids.includes(id)))).toBe(true);
  });

  it("defines all ten equalizer bands", () => {
    expect(DEFAULT_AUDIO_PREFERENCES.eq).toHaveLength(10);
  });

  it("accepts only safe audio URIs for local restoration and playback", () => {
    expect(isSafeAudioUri("file:///music/track.mp3")).toBe(true);
    expect(isSafeAudioUri("content://media/audio/12")).toBe(true);
    expect(isSafeAudioUri("https://example.com/demo.mp3")).toBe(false);
    expect(isSafeAudioUri("javascript:alert(1)")).toBe(false);
    expect(isSafeAudioUri("file:///music/\u0000track.mp3")).toBe(false);
  });

  it("accepts only safe local artwork URIs for cover rendering", () => {
    expect(isSafeArtworkUri("file:///app/omniwave-artwork/cover.jpg")).toBe(true);
    expect(isSafeArtworkUri("content://media/images/12")).toBe(true);
    expect(isSafeArtworkUri("https://example.com/cover.jpg")).toBe(false);
    expect(isSafeArtworkUri("javascript:alert(1)")).toBe(false);
    expect(isSafeArtworkUri("file:///app/cover\u0000.jpg")).toBe(false);
  });
});
