import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as VideoThumbnails from "expo-video-thumbnails";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import type { VideoItem, VideoPlaybackRate, VideoPreferences } from "@/lib/omniwave/types";
import { isSafeLocalVideoUri } from "@/lib/omniwave/validation";
import { haptic } from "@/lib/omniwave/haptics";

const STORAGE_KEY = "omniwave:video-library:v1";
const VIDEO_DIRECTORY = "omniwave-videos/";
const MAX_VIDEO_ITEMS = 40;
const MAX_IMPORT_ITEMS = 12;
const MAX_VIDEO_BYTES = 1_500_000_000;
const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "mov", "webm"]);
const VIDEO_RATES: VideoPlaybackRate[] = [0.5, 0.75, 1, 1.25, 1.5, 2];

export type VideoLibraryIssue = "import" | "unsupported" | "storage" | null;
type PersistedVideoLibrary = { videos: VideoItem[]; preferences: VideoPreferences };
type VideoContextValue = {
  videos: VideoItem[];
  preferences: VideoPreferences;
  isReady: boolean;
  isImporting: boolean;
  videoIssue: VideoLibraryIssue;
  importVideoFiles: () => Promise<void>;
  removeVideo: (videoId: string) => Promise<void>;
  toggleVideoFavorite: (videoId: string) => void;
  updateVideoPosition: (videoId: string, seconds: number) => void;
  updateVideoPreference: <K extends keyof VideoPreferences>(key: K, value: VideoPreferences[K]) => void;
  getVideo: (videoId: string) => VideoItem | undefined;
  clearVideoIssue: () => void;
};

const VideoContext = createContext<VideoContextValue | null>(null);
const DEFAULT_VIDEO_PREFERENCES: VideoPreferences = { playbackRate: 1, loopEnabled: false, muted: false, captionsEnabled: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedName(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return value.replace(/\.[^/.]+$/, "").replace(/[\u0000-\u001F]/g, "").trim().replace(/\s+/g, " ").slice(0, 100) || fallback;
}

function extensionFor(name: string) {
  const result = name.split(".").pop()?.toLowerCase() ?? "";
  return VIDEO_EXTENSIONS.has(result) ? result : null;
}

function isVideoAsset(asset: DocumentPicker.DocumentPickerAsset) {
  const extension = extensionFor(asset.name ?? "");
  const isSupportedType = asset.mimeType?.startsWith("video/") === true || extension !== null;
  const hasSafeSize = typeof asset.size !== "number" || (asset.size >= 0 && asset.size <= MAX_VIDEO_BYTES);
  return isSafeLocalVideoUri(asset.uri) && isSupportedType && hasSafeSize;
}

function isVideoItem(value: unknown): value is VideoItem {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && isSafeLocalVideoUri(value.localUri) && (typeof value.thumbnailUri === "undefined" || isSafeLocalVideoUri(value.thumbnailUri)) && Number.isFinite(value.durationSeconds) && Number(value.durationSeconds) >= 0 && Number.isFinite(value.sizeBytes) && Number(value.sizeBytes) >= 0 && typeof value.mimeType === "string" && Number.isFinite(value.addedAt) && Number.isFinite(value.lastPositionSeconds) && Number(value.lastPositionSeconds) >= 0 && typeof value.isFavorite === "boolean";
}

function sanitizePreferences(value: unknown): VideoPreferences {
  if (!isRecord(value)) return DEFAULT_VIDEO_PREFERENCES;
  const playbackRate = VIDEO_RATES.includes(value.playbackRate as VideoPlaybackRate) ? value.playbackRate as VideoPlaybackRate : 1;
  return { playbackRate, loopEnabled: Boolean(value.loopEnabled), muted: Boolean(value.muted), captionsEnabled: Boolean(value.captionsEnabled) };
}

async function persistAsset(asset: DocumentPicker.DocumentPickerAsset, index: number) {
  const extension = extensionFor(asset.name ?? "") ?? "mp4";
  if (Platform.OS === "web") return { uri: asset.uri, thumbnailUri: undefined };
  const root = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${VIDEO_DIRECTORY}` : null;
  if (!root) throw new Error("storage unavailable");
  await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  const fileName = `video-${Date.now()}-${index}.${extension}`;
  const uri = `${root}${fileName}`;
  await FileSystem.copyAsync({ from: asset.uri, to: uri });
  let thumbnailUri: string | undefined;
  try {
    const thumbnail = await VideoThumbnails.getThumbnailAsync(uri, { time: 800, quality: 0.55 });
    const destination = `${root}poster-${Date.now()}-${index}.jpg`;
    await FileSystem.copyAsync({ from: thumbnail.uri, to: destination });
    thumbnailUri = destination;
  } catch {
    thumbnailUri = undefined;
  }
  return { uri, thumbnailUri };
}

async function removeManagedFile(uri: string | undefined) {
  if (!uri || Platform.OS === "web" || !FileSystem.documentDirectory || !uri.startsWith(`${FileSystem.documentDirectory}${VIDEO_DIRECTORY}`)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Library state is still removed if a managed file has already disappeared.
  }
}

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [preferences, setPreferences] = useState<VideoPreferences>(DEFAULT_VIDEO_PREFERENCES);
  const [isReady, setIsReady] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [videoIssue, setVideoIssue] = useState<VideoLibraryIssue>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw || !active) return;
      try {
        const stored = JSON.parse(raw) as unknown;
        if (!isRecord(stored)) return;
        if (Array.isArray(stored.videos)) setVideos(stored.videos.filter(isVideoItem).slice(0, MAX_VIDEO_ITEMS));
        setPreferences(sanitizePreferences(stored.preferences));
      } catch {
        // Ignore malformed local video metadata without exposing paths.
      }
    }).finally(() => { if (active) setIsReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const next: PersistedVideoLibrary = { videos, preferences };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
  }, [isReady, preferences, videos]);

  const importVideoFiles = useCallback(async () => {
    setIsImporting(true);
    setVideoIssue(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "video/*", multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const accepted = result.assets.filter(isVideoAsset).slice(0, MAX_IMPORT_ITEMS);
      if (!accepted.length) { setVideoIssue("unsupported"); haptic.error(); return; }
      const existingSignatures = new Set(videos.map((video) => `${video.title}:${video.sizeBytes}`));
      const unique = accepted.filter((asset) => !existingSignatures.has(`${normalizedName(asset.name, "Local video")}:${Math.max(0, asset.size ?? 0)}`));
      if (!unique.length) { setVideoIssue("import"); haptic.error(); return; }
      const created = await Promise.all(unique.map(async (asset, index): Promise<VideoItem | null> => {
        try {
          const local = await persistAsset(asset, index);
          if (!isSafeLocalVideoUri(local.uri)) return null;
          return { id: `video-${Date.now()}-${index}`, title: normalizedName(asset.name, "Local video"), localUri: local.uri, thumbnailUri: local.thumbnailUri, durationSeconds: 0, sizeBytes: Math.max(0, asset.size ?? 0), mimeType: typeof asset.mimeType === "string" ? asset.mimeType.slice(0, 100) : "video/local", addedAt: Date.now(), lastPositionSeconds: 0, isFavorite: false };
        } catch {
          return null;
        }
      }));
      const added = created.filter((video): video is VideoItem => Boolean(video));
      if (!added.length) { setVideoIssue("storage"); haptic.error(); return; }
      setVideos((previous) => [...added, ...previous].slice(0, MAX_VIDEO_ITEMS));
      haptic.success();
    } catch {
      setVideoIssue("import");
      haptic.error();
    } finally {
      setIsImporting(false);
    }
  }, [videos]);

  const removeVideo = useCallback(async (videoId: string) => {
    const target = videos.find((video) => video.id === videoId);
    setVideos((previous) => previous.filter((video) => video.id !== videoId));
    await removeManagedFile(target?.localUri);
    await removeManagedFile(target?.thumbnailUri);
    haptic.light();
  }, [videos]);
  const toggleVideoFavorite = useCallback((videoId: string) => { setVideos((previous) => previous.map((video) => video.id === videoId ? { ...video, isFavorite: !video.isFavorite } : video)); haptic.light(); }, []);
  const updateVideoPosition = useCallback((videoId: string, seconds: number) => { if (!Number.isFinite(seconds)) return; setVideos((previous) => previous.map((video) => video.id === videoId ? { ...video, lastPositionSeconds: Math.max(0, Math.min(seconds, 86_400)) } : video)); }, []);
  const updateVideoPreference = useCallback(<K extends keyof VideoPreferences>(key: K, value: VideoPreferences[K]) => { setPreferences((previous) => ({ ...previous, [key]: value })); }, []);
  const value = useMemo<VideoContextValue>(() => ({ videos, preferences, isReady, isImporting, videoIssue, importVideoFiles, removeVideo, toggleVideoFavorite, updateVideoPosition, updateVideoPreference, getVideo: (videoId) => videos.find((video) => video.id === videoId), clearVideoIssue: () => setVideoIssue(null) }), [importVideoFiles, isImporting, isReady, preferences, removeVideo, toggleVideoFavorite, updateVideoPosition, updateVideoPreference, videoIssue, videos]);
  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
}

export function useVideoLibrary() {
  const context = useContext(VideoContext);
  if (!context) throw new Error("useVideoLibrary must be used within VideoProvider");
  return context;
}
