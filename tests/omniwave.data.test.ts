import { describe, expect, it } from "vitest";

import { DEFAULT_AUDIO_PREFERENCES, INITIAL_PLAYLISTS, INITIAL_TRACKS, formatTime } from "../lib/omniwave/data";
import { isSafeAudioUri } from "../lib/omniwave/validation";

describe("OmniWave library data", () => {
  it("formats playback time safely", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(65)).toBe("1:05");
    expect(formatTime(Number.NaN)).toBe("0:00");
  });

  it("ships playable library records with unique IDs", () => {
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
    expect(isSafeAudioUri("https://example.com/demo.mp3")).toBe(true);
    expect(isSafeAudioUri("javascript:alert(1)")).toBe(false);
    expect(isSafeAudioUri("file:///music/\u0000track.mp3")).toBe(false);
  });
});
