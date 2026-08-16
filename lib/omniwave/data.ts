import type { AudioPreferences, Playlist, Track } from "@/lib/omniwave/types";

/** The app starts with no remote samples; users import media from their device. */
export const INITIAL_TRACKS: Track[] = [];
export const INITIAL_PLAYLISTS: Playlist[] = [];
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = { bassBoost: true, reverb: false, surround: true, eq: [0, 2, 4, 2, 0, -1, 1, 3, 2, 0], equalizerPreset: "flat", playbackQuality: "standard", aiMetadataEnabled: false };
export const EQ_LABELS = ["32", "64", "125", "250", "500", "1K", "2K", "4K", "8K", "16K"];
export function formatTime(seconds: number) { if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"; const minutes = Math.floor(seconds / 60); const remainder = Math.floor(seconds % 60).toString().padStart(2, "0"); return `${minutes}:${remainder}`; }
