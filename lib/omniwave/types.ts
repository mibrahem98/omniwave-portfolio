export type TrackClassification = { genre: string; mood: string; tags: string[]; confidence: number };
export type ClassificationStatus = "idle" | "pending" | "suggested" | "ready" | "failed";
export type LocalListeningProfile = { displayName: string; bio: string };
export type ListeningHistoryEntry = { trackId: string; playedAt: number };
export type FavoriteCardStyle = "glass" | "editorial" | "minimal";
export type FavoriteCardColor = "teal" | "violet" | "rose";
export type FavoriteCardPreferences = { style: FavoriteCardStyle; color: FavoriteCardColor };

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  audioUri: string;
  accent: string;
  isFavorite: boolean;
  isImported?: boolean;
  classification?: TrackClassification;
  suggestedClassification?: TrackClassification;
  classificationStatus?: ClassificationStatus;
};

export type Playlist = { id: string; name: string; trackIds: string[]; createdAt: number };

export type PlaybackQuality = "standard" | "high";
export type AudioPreferences = { bassBoost: boolean; reverb: boolean; surround: boolean; eq: number[]; playbackQuality: PlaybackQuality; aiMetadataEnabled: boolean };

export type PlayerSnapshot = {
  activeTrackId: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  durationSeconds: number;
  shuffleEnabled: boolean;
  repeatEnabled: boolean;
  queueLength: number;
  sleepTimerEndsAt: number | null;
  sleepTimerRemainingSeconds: number;
};
