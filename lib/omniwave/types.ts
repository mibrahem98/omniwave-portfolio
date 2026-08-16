export type TrackClassification = { genre: string; mood: string; tags: string[]; confidence: number };
export type ClassificationStatus = "idle" | "pending" | "suggested" | "ready" | "failed";
export type LocalListeningProfile = { displayName: string; bio: string };
export type ListeningHistoryEntry = { trackId: string; playedAt: number };
export type FavoriteCardStyle = "glass" | "editorial" | "minimal";
export type FavoriteCardColor = "teal" | "violet" | "rose";
export type FavoriteCardPreferences = { style: FavoriteCardStyle; color: FavoriteCardColor };
export type VideoPlaybackRate = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 2;
export type VideoCaptionTextSize = "small" | "standard" | "large";
export type VideoCaptionTextColor = "white" | "yellow" | "cyan";
export type VideoCaptionPosition = "top" | "center" | "bottom";
export type VideoCaptionBackground = "none" | "black" | "indigo";
export type VideoSummaryLength = "short" | "medium" | "detailed";
export type VideoPreferences = { playbackRate: VideoPlaybackRate; loopEnabled: boolean; muted: boolean; captionsEnabled: boolean; captionTextSize: VideoCaptionTextSize; captionTextColor: VideoCaptionTextColor; captionPosition: VideoCaptionPosition; captionBackground: VideoCaptionBackground; summaryLength: VideoSummaryLength };
export type VideoSubtitle = { localUri: string; fileName: string; addedAt: number };
export type VideoSummary = { text: string; createdAt: number };
export type VideoItem = { id: string; title: string; localUri: string; thumbnailUri?: string; subtitle?: VideoSubtitle; summary?: VideoSummary; durationSeconds: number; sizeBytes: number; mimeType: string; addedAt: number; lastPositionSeconds: number; isFavorite: boolean };
export type VideoPlaylist = { id: string; name: string; videoIds: string[]; createdAt: number };
export type VideoPlaybackSnapshot = { activeVideoId: string | null; isPlaying: boolean; positionSeconds: number; durationSeconds: number; isBuffering: boolean; playbackRate: VideoPlaybackRate; loopEnabled: boolean; muted: boolean; captionsEnabled: boolean };

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationSeconds: number;
  audioUri: string;
  artworkUri?: string;
  accent: string;
  isFavorite: boolean;
  isImported?: boolean;
  classification?: TrackClassification;
  suggestedClassification?: TrackClassification;
  classificationStatus?: ClassificationStatus;
};

export type Playlist = { id: string; name: string; trackIds: string[]; createdAt: number };

export type PlaybackQuality = "standard" | "high";
export type AudioEqualizerPreset = "flat" | "warm" | "vocal" | "night";
export type AudioPreferences = { bassBoost: boolean; reverb: boolean; surround: boolean; eq: number[]; equalizerPreset: AudioEqualizerPreset; playbackQuality: PlaybackQuality; aiMetadataEnabled: boolean };

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
