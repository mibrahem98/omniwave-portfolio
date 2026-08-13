import type { AudioPreferences, Playlist, Track } from "@/lib/omniwave/types";

export const DEMO_AUDIO_URI = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";
export const INITIAL_TRACKS: Track[] = [
  { id: "aurora-lines", title: "Aurora Lines", artist: "Nova Vela", album: "Afterglow", durationSeconds: 243, audioUri: DEMO_AUDIO_URI, accent: "#8B5CF6", isFavorite: true },
  { id: "cyan-drift", title: "Cyan Drift", artist: "Lumen Coast", album: "Tidal Memory", durationSeconds: 198, audioUri: DEMO_AUDIO_URI, accent: "#00D9FF", isFavorite: false },
  { id: "night-signal", title: "Night Signal", artist: "The Meridian", album: "Low Orbit", durationSeconds: 267, audioUri: DEMO_AUDIO_URI, accent: "#FF2E9F", isFavorite: true },
  { id: "still-water", title: "Still Water", artist: "Ari Sato", album: "Folding Light", durationSeconds: 221, audioUri: DEMO_AUDIO_URI, accent: "#00E676", isFavorite: false },
];
export const INITIAL_PLAYLISTS: Playlist[] = [
  { id: "deep-focus", name: "تركيز عميق", trackIds: ["aurora-lines", "still-water"], createdAt: 1 },
  { id: "night-drive", name: "قيادة ليلية", trackIds: ["cyan-drift", "night-signal"], createdAt: 2 },
];
export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = { bassBoost: true, reverb: false, surround: true, eq: [0, 2, 4, 2, 0, -1, 1, 3, 2, 0], playbackQuality: "standard", aiMetadataEnabled: false };
export const EQ_LABELS = ["32", "64", "125", "250", "500", "1K", "2K", "4K", "8K", "16K"];
export function formatTime(seconds: number) { if (!Number.isFinite(seconds) || seconds <= 0) return "0:00"; const minutes = Math.floor(seconds / 60); const remainder = Math.floor(seconds % 60).toString().padStart(2, "0"); return `${minutes}:${remainder}`; }
