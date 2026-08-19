import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as VideoThumbnails from "expo-video-thumbnails";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import { reportLocalDiagnostic } from "@/lib/_core/local-diagnostics";
import type { VideoCaptionBackground, VideoCaptionPosition, VideoCaptionTextColor, VideoCaptionTextSize, VideoItem, VideoPlaybackRate, VideoPlaylist, VideoPreferences, VideoSubtitle, VideoSummary, VideoSummaryLength } from "@/lib/omniwave/types";
import { isSafeLocalSubtitleUri, isSafeLocalVideoUri } from "@/lib/omniwave/validation";
import { haptic } from "@/lib/omniwave/haptics";
import { scanDeviceMedia, type DeviceMediaCandidate, type DeviceMediaIssue } from "@/lib/omniwave/device-media-scan";
import { createLocalMediaFingerprint, filterNewLocalMedia, isLocalMediaFingerprint } from "@/lib/omniwave/media-stability";

const STORAGE_KEY = "omniwave:video-library:v1";
const VIDEO_DIRECTORY = "omniwave-videos/";
const SUBTITLE_DIRECTORY = "omniwave-subtitles/";
const MAX_VIDEO_ITEMS = 40;
const MAX_IMPORT_ITEMS = 12;
const MAX_VIDEO_BYTES = 1_500_000_000;
const MAX_SUBTITLE_BYTES = 2_000_000;
const VIDEO_EXTENSIONS = new Set(["mp4", "m4v", "mov", "webm"]);
const SUBTITLE_EXTENSIONS = new Set(["vtt"]);
const VIDEO_RATES: VideoPlaybackRate[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CAPTION_TEXT_SIZES: VideoCaptionTextSize[] = ["small", "standard", "large"];
const CAPTION_TEXT_COLORS: VideoCaptionTextColor[] = ["white", "yellow", "cyan"];
const CAPTION_POSITIONS: VideoCaptionPosition[] = ["top", "center", "bottom"];
const CAPTION_BACKGROUNDS: VideoCaptionBackground[] = ["none", "black", "indigo"];
const SUMMARY_LENGTHS: VideoSummaryLength[] = ["short", "medium", "detailed"];

export type VideoLibraryIssue = "import" | "unsupported" | "storage" | "subtitleImport" | "subtitleUnsupported" | null;
export type VideoDeviceScanStatus = DeviceMediaIssue | "complete" | "limited" | null;
type PersistedVideoLibrary = { videos: VideoItem[]; videoPlaylists: VideoPlaylist[]; preferences: VideoPreferences };
type VideoContextValue = {
  videos: VideoItem[];
  videoPlaylists: VideoPlaylist[];
  preferences: VideoPreferences;
  isReady: boolean;
  isImporting: boolean;
  videoIssue: VideoLibraryIssue;
  deviceScanStatus: VideoDeviceScanStatus;
  importVideoFiles: () => Promise<void>;
  importVideoFromDeviceLibrary: () => Promise<void>;
  createVideoPlaylist: (name: string) => string | null;
  removeVideoPlaylist: (playlistId: string) => void;
  addVideoToPlaylist: (playlistId: string, videoId: string) => void;
  removeVideoFromPlaylist: (playlistId: string, videoId: string) => void;
  attachSubtitleFile: (videoId: string) => Promise<void>;
  removeSubtitleFile: (videoId: string) => Promise<void>;
  removeVideo: (videoId: string) => Promise<void>;
  toggleVideoFavorite: (videoId: string) => void;
  updateVideoPosition: (videoId: string, seconds: number) => void;
  clearVideoProgress: (videoId: string) => void;
  clearAllVideoProgress: () => void;
  updateVideoDuration: (videoId: string, seconds: number) => void;
  setVideoSummary: (videoId: string, text: string | null) => void;
  updateVideoPreference: <K extends keyof VideoPreferences>(key: K, value: VideoPreferences[K]) => void;
  getVideo: (videoId: string) => VideoItem | undefined;
  clearVideoIssue: () => void;
  clearDeviceScanStatus: () => void;
};

const VideoContext = createContext<VideoContextValue | null>(null);
const DEFAULT_VIDEO_PREFERENCES: VideoPreferences = { playbackRate: 1, loopEnabled: false, muted: false, captionsEnabled: true, captionTextSize: "standard", captionTextColor: "white", captionPosition: "bottom", captionBackground: "black", summaryLength: "medium" };

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

function subtitleExtensionFor(name: string) {
  const result = name.split(".").pop()?.toLowerCase() ?? "";
  return SUBTITLE_EXTENSIONS.has(result) ? result : null;
}

function isVideoAsset(asset: DocumentPicker.DocumentPickerAsset) {
  const extension = extensionFor(asset.name ?? "");
  const isSupportedType = asset.mimeType?.startsWith("video/") === true || extension !== null;
  const hasSafeSize = typeof asset.size !== "number" || (asset.size >= 0 && asset.size <= MAX_VIDEO_BYTES);
  return isSafeLocalVideoUri(asset.uri) && isSupportedType && hasSafeSize;
}

function videoAssetFromDeviceCandidate(candidate: DeviceMediaCandidate): DocumentPicker.DocumentPickerAsset {
  return { name: candidate.name, uri: candidate.uri, mimeType: candidate.mimeType, lastModified: 0 };
}

function isSubtitleAsset(asset: DocumentPicker.DocumentPickerAsset) {
  const extension = subtitleExtensionFor(asset.name ?? "");
  const isSupportedType = asset.mimeType === "text/vtt" || extension !== null;
  const hasSafeSize = typeof asset.size !== "number" || (asset.size >= 0 && asset.size <= MAX_SUBTITLE_BYTES);
  return isSafeLocalSubtitleUri(asset.uri) && isSupportedType && hasSafeSize;
}

function isVideoSubtitle(value: unknown): value is VideoSubtitle {
  return isRecord(value) && isSafeLocalSubtitleUri(value.localUri) && typeof value.fileName === "string" && value.fileName.length > 0 && value.fileName.length <= 120 && Number.isFinite(value.addedAt);
}

function isVideoSummary(value: unknown): value is VideoSummary {
  return isRecord(value) && typeof value.text === "string" && value.text.trim().length >= 1 && value.text.length <= 1_800 && Number.isFinite(value.createdAt);
}

function isVideoItem(value: unknown): value is VideoItem {
  return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && isSafeLocalVideoUri(value.localUri) && (typeof value.thumbnailUri === "undefined" || isSafeLocalVideoUri(value.thumbnailUri)) && (typeof value.subtitle === "undefined" || isVideoSubtitle(value.subtitle)) && (typeof value.summary === "undefined" || isVideoSummary(value.summary)) && (value.sourceFingerprint === undefined || isLocalMediaFingerprint(value.sourceFingerprint)) && Number.isFinite(value.durationSeconds) && Number(value.durationSeconds) >= 0 && Number.isFinite(value.sizeBytes) && Number(value.sizeBytes) >= 0 && typeof value.mimeType === "string" && Number.isFinite(value.addedAt) && Number.isFinite(value.lastPositionSeconds) && Number(value.lastPositionSeconds) >= 0 && typeof value.isFavorite === "boolean";
}

function normalizePlaylistName(value: unknown) {
  if (typeof value !== "string") return null;
  const name = value.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 56);
  return name || null;
}

function isVideoPlaylist(value: unknown): value is VideoPlaylist {
  return isRecord(value) && typeof value.id === "string" && value.id.length > 0 && value.id.length <= 90 && typeof value.name === "string" && value.name.length > 0 && value.name.length <= 56 && Array.isArray(value.videoIds) && value.videoIds.length <= 100 && value.videoIds.every((id) => typeof id === "string" && id.length > 0 && id.length <= 90) && Number.isFinite(value.createdAt);
}

function sanitizePreferences(value: unknown): VideoPreferences {
  if (!isRecord(value)) return DEFAULT_VIDEO_PREFERENCES;
  const playbackRate = VIDEO_RATES.includes(value.playbackRate as VideoPlaybackRate) ? value.playbackRate as VideoPlaybackRate : 1;
  const captionTextSize = CAPTION_TEXT_SIZES.includes(value.captionTextSize as VideoCaptionTextSize) ? value.captionTextSize as VideoCaptionTextSize : DEFAULT_VIDEO_PREFERENCES.captionTextSize;
  const captionTextColor = CAPTION_TEXT_COLORS.includes(value.captionTextColor as VideoCaptionTextColor) ? value.captionTextColor as VideoCaptionTextColor : DEFAULT_VIDEO_PREFERENCES.captionTextColor;
  const captionPosition = CAPTION_POSITIONS.includes(value.captionPosition as VideoCaptionPosition) ? value.captionPosition as VideoCaptionPosition : DEFAULT_VIDEO_PREFERENCES.captionPosition;
  const captionBackground = CAPTION_BACKGROUNDS.includes(value.captionBackground as VideoCaptionBackground) ? value.captionBackground as VideoCaptionBackground : DEFAULT_VIDEO_PREFERENCES.captionBackground;
  const summaryLength = SUMMARY_LENGTHS.includes(value.summaryLength as VideoSummaryLength) ? value.summaryLength as VideoSummaryLength : DEFAULT_VIDEO_PREFERENCES.summaryLength;
  return { playbackRate, loopEnabled: Boolean(value.loopEnabled), muted: Boolean(value.muted), captionsEnabled: Boolean(value.captionsEnabled), captionTextSize, captionTextColor, captionPosition, captionBackground, summaryLength };
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
    reportLocalDiagnostic("video_thumbnail_generation_failed");
    thumbnailUri = undefined;
  }
  return { uri, thumbnailUri };
}

async function persistSubtitleAsset(asset: DocumentPicker.DocumentPickerAsset): Promise<VideoSubtitle> {
  const fileName = `${normalizedName(asset.name, "captions")}.vtt`;
  if (Platform.OS === "web") return { localUri: asset.uri, fileName, addedAt: Date.now() };
  const root = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}${SUBTITLE_DIRECTORY}` : null;
  if (!root) throw new Error("storage unavailable");
  await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  const localUri = `${root}subtitle-${Date.now()}.vtt`;
  await FileSystem.copyAsync({ from: asset.uri, to: localUri });
  return { localUri, fileName, addedAt: Date.now() };
}

async function removeManagedFile(uri: string | undefined) {
  if (!uri || Platform.OS === "web" || !FileSystem.documentDirectory) return;
  const documentRoot = FileSystem.documentDirectory;
  if (!uri.startsWith(`${documentRoot}${VIDEO_DIRECTORY}`) && !uri.startsWith(`${documentRoot}${SUBTITLE_DIRECTORY}`)) return;
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    reportLocalDiagnostic("video_library_cleanup_failed");
  }
}

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [videoPlaylists, setVideoPlaylists] = useState<VideoPlaylist[]>([]);
  const [preferences, setPreferences] = useState<VideoPreferences>(DEFAULT_VIDEO_PREFERENCES);
  const [isReady, setIsReady] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [videoIssue, setVideoIssue] = useState<VideoLibraryIssue>(null);
  const [deviceScanStatus, setDeviceScanStatus] = useState<VideoDeviceScanStatus>(null);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw || !active) return;
      try {
        const stored = JSON.parse(raw) as unknown;
        if (!isRecord(stored)) return;
        const restoredVideos = Array.isArray(stored.videos) ? stored.videos.filter(isVideoItem).slice(0, MAX_VIDEO_ITEMS) : [];
        setVideos(restoredVideos);
        const validVideoIds = new Set(restoredVideos.map((video) => video.id));
        if (Array.isArray(stored.videoPlaylists)) setVideoPlaylists(stored.videoPlaylists.filter(isVideoPlaylist).slice(0, 24).map((playlist) => ({ ...playlist, videoIds: playlist.videoIds.filter((id, index, values) => validVideoIds.has(id) && values.indexOf(id) === index) })));
        setPreferences(sanitizePreferences(stored.preferences));
      } catch {
        // Ignore malformed local video metadata without exposing paths.
      }
    }).finally(() => { if (active) setIsReady(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const next: PersistedVideoLibrary = { videos, videoPlaylists, preferences };
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => reportLocalDiagnostic("video_library_write_failed"));
  }, [isReady, preferences, videoPlaylists, videos]);

  const importVideoFiles = useCallback(async () => {
    setIsImporting(true);
    setVideoIssue(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "video/*", multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const capacity = Math.max(0, MAX_VIDEO_ITEMS - videos.length);
      if (!capacity) { setVideoIssue("import"); haptic.error(); return; }
      const accepted = result.assets.filter(isVideoAsset).slice(0, Math.min(MAX_IMPORT_ITEMS, capacity));
      if (!accepted.length) { setVideoIssue("unsupported"); haptic.error(); return; }
      const existingFingerprints = videos.map((video) => video.sourceFingerprint ?? createLocalMediaFingerprint({ fileName: video.title, sizeBytes: video.sizeBytes })).filter(isLocalMediaFingerprint);
      const unique = filterNewLocalMedia(accepted, existingFingerprints, (asset) => createLocalMediaFingerprint({ fileName: asset.name, sizeBytes: asset.size }));
      if (!unique.length) { setVideoIssue("import"); haptic.error(); return; }
      const created = await Promise.all(unique.map(async (asset, index): Promise<VideoItem | null> => {
        try {
          const local = await persistAsset(asset, index);
          if (!isSafeLocalVideoUri(local.uri)) return null;
          return { id: `video-${Date.now()}-${index}`, title: normalizedName(asset.name, "Local video"), localUri: local.uri, thumbnailUri: local.thumbnailUri, durationSeconds: 0, sizeBytes: Math.max(0, asset.size ?? 0), mimeType: typeof asset.mimeType === "string" ? asset.mimeType.slice(0, 100) : "video/local", addedAt: Date.now(), lastPositionSeconds: 0, isFavorite: false, sourceFingerprint: createLocalMediaFingerprint({ fileName: asset.name, sizeBytes: asset.size }) };
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

  const importVideoFromDeviceLibrary = useCallback(async () => {
    setIsImporting(true);
    setVideoIssue(null);
    setDeviceScanStatus(null);
    try {
      const capacity = Math.max(0, MAX_VIDEO_ITEMS - videos.length);
      const result = await scanDeviceMedia("video", capacity);
      if (result.issue) { setDeviceScanStatus(result.issue); haptic.error(); return; }
      const existingTitles = new Set(videos.map((video) => video.title));
      const existingFingerprints = videos.map((video) => video.sourceFingerprint ?? createLocalMediaFingerprint({ fileName: video.title, sizeBytes: video.sizeBytes })).filter(isLocalMediaFingerprint);
      const candidates = result.candidates.map(videoAssetFromDeviceCandidate).filter(isVideoAsset);
      const unique = filterNewLocalMedia(candidates, existingFingerprints, (asset) => createLocalMediaFingerprint({ fileName: asset.name, sizeBytes: asset.size })).filter((asset) => !existingTitles.has(normalizedName(asset.name, "Local video")));
      if (!unique.length) { setDeviceScanStatus("empty"); haptic.error(); return; }
      const created = await Promise.all(unique.map(async (asset, index): Promise<VideoItem | null> => {
        try {
          const local = await persistAsset(asset, index);
          if (!isSafeLocalVideoUri(local.uri)) return null;
          return { id: `device-video-${Date.now()}-${index}`, title: normalizedName(asset.name, "Local video"), localUri: local.uri, thumbnailUri: local.thumbnailUri, durationSeconds: 0, sizeBytes: 0, mimeType: typeof asset.mimeType === "string" ? asset.mimeType.slice(0, 100) : "video/local", addedAt: Date.now(), lastPositionSeconds: 0, isFavorite: false, sourceFingerprint: createLocalMediaFingerprint({ fileName: asset.name, sizeBytes: asset.size }) };
        } catch {
          return null;
        }
      }));
      const added = created.filter((video): video is VideoItem => Boolean(video));
      if (!added.length) { setVideoIssue("storage"); haptic.error(); return; }
      setVideos((previous) => [...added, ...previous].slice(0, MAX_VIDEO_ITEMS));
      setDeviceScanStatus(result.limitedAccess ? "limited" : "complete");
      haptic.success();
    } catch {
      setDeviceScanStatus("unavailable");
      haptic.error();
    } finally {
      setIsImporting(false);
    }
  }, [videos]);

  const attachSubtitleFile = useCallback(async (videoId: string) => {
    if (!videos.some((video) => video.id === videoId)) return;
    setVideoIssue(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ["text/vtt", "text/plain", "application/octet-stream"], multiple: false, copyToCacheDirectory: true });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || !isSubtitleAsset(asset)) { setVideoIssue("subtitleUnsupported"); haptic.error(); return; }
      const subtitle = await persistSubtitleAsset(asset);
      if (!isSafeLocalSubtitleUri(subtitle.localUri)) { setVideoIssue("subtitleUnsupported"); haptic.error(); return; }
      const existing = videos.find((video) => video.id === videoId)?.subtitle;
      setVideos((previous) => previous.map((video) => video.id === videoId ? { ...video, subtitle } : video));
      await removeManagedFile(existing?.localUri);
      haptic.success();
    } catch {
      setVideoIssue("subtitleImport");
      haptic.error();
    }
  }, [videos]);

  const removeSubtitleFile = useCallback(async (videoId: string) => {
    const subtitle = videos.find((video) => video.id === videoId)?.subtitle;
    if (!subtitle) return;
    setVideos((previous) => previous.map((video) => video.id === videoId ? { ...video, subtitle: undefined } : video));
    await removeManagedFile(subtitle.localUri);
    haptic.light();
  }, [videos]);

  const removeVideo = useCallback(async (videoId: string) => {
    const target = videos.find((video) => video.id === videoId);
    setVideos((previous) => previous.filter((video) => video.id !== videoId));
    setVideoPlaylists((previous) => previous.map((playlist) => playlist.videoIds.includes(videoId) ? { ...playlist, videoIds: playlist.videoIds.filter((id) => id !== videoId) } : playlist));
    await removeManagedFile(target?.localUri);
    await removeManagedFile(target?.thumbnailUri);
    await removeManagedFile(target?.subtitle?.localUri);
    haptic.light();
  }, [videos]);
  const createVideoPlaylist = useCallback((name: string) => {
    const normalized = normalizePlaylistName(name);
    if (!normalized || videoPlaylists.length >= 24 || videoPlaylists.some((playlist) => playlist.name.toLocaleLowerCase() === normalized.toLocaleLowerCase())) { haptic.error(); return null; }
    const id = `video-playlist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setVideoPlaylists((previous) => [{ id, name: normalized, videoIds: [], createdAt: Date.now() }, ...previous]);
    haptic.success();
    return id;
  }, [videoPlaylists]);
  const removeVideoPlaylist = useCallback((playlistId: string) => { setVideoPlaylists((previous) => previous.filter((playlist) => playlist.id !== playlistId)); haptic.light(); }, []);
  const addVideoToPlaylist = useCallback((playlistId: string, videoId: string) => {
    if (!videos.some((video) => video.id === videoId)) return;
    setVideoPlaylists((previous) => previous.map((playlist) => playlist.id === playlistId && !playlist.videoIds.includes(videoId) && playlist.videoIds.length < 100 ? { ...playlist, videoIds: [...playlist.videoIds, videoId] } : playlist));
    haptic.selection();
  }, [videos]);
  const removeVideoFromPlaylist = useCallback((playlistId: string, videoId: string) => { setVideoPlaylists((previous) => previous.map((playlist) => playlist.id === playlistId ? { ...playlist, videoIds: playlist.videoIds.filter((id) => id !== videoId) } : playlist)); haptic.light(); }, []);
  const toggleVideoFavorite = useCallback((videoId: string) => { setVideos((previous) => previous.map((video) => video.id === videoId ? { ...video, isFavorite: !video.isFavorite } : video)); haptic.light(); }, []);
  const updateVideoPosition = useCallback((videoId: string, seconds: number) => { if (!Number.isFinite(seconds)) return; setVideos((previous) => previous.map((video) => video.id === videoId ? { ...video, lastPositionSeconds: Math.max(0, Math.min(seconds, 86_400)) } : video)); }, []);
  const clearVideoProgress = useCallback((videoId: string) => { setVideos((previous) => previous.map((video) => video.id === videoId ? { ...video, lastPositionSeconds: 0 } : video)); haptic.light(); }, []);
  const clearAllVideoProgress = useCallback(() => { setVideos((previous) => previous.map((video) => video.lastPositionSeconds > 0 ? { ...video, lastPositionSeconds: 0 } : video)); haptic.medium(); }, []);
  const updateVideoDuration = useCallback((videoId: string, seconds: number) => { if (!Number.isFinite(seconds) || seconds <= 0) return; const durationSeconds = Math.min(seconds, 86_400); setVideos((previous) => previous.map((video) => video.id === videoId && Math.abs(video.durationSeconds - durationSeconds) > 0.5 ? { ...video, durationSeconds } : video)); }, []);
  const setVideoSummary = useCallback((videoId: string, text: string | null) => { const normalized = typeof text === "string" ? text.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, 1_800) : null; if (normalized === null) { setVideos((previous) => previous.map((video) => video.id === videoId ? { ...video, summary: undefined } : video)); return; } if (!normalized) return; setVideos((previous) => previous.map((video) => video.id === videoId ? { ...video, summary: { text: normalized, createdAt: Date.now() } } : video)); }, []);
  const updateVideoPreference = useCallback(<K extends keyof VideoPreferences>(key: K, value: VideoPreferences[K]) => { setPreferences((previous) => ({ ...previous, [key]: value })); }, []);
  const value = useMemo<VideoContextValue>(() => ({ videos, videoPlaylists, preferences, isReady, isImporting, videoIssue, deviceScanStatus, importVideoFiles, importVideoFromDeviceLibrary, createVideoPlaylist, removeVideoPlaylist, addVideoToPlaylist, removeVideoFromPlaylist, attachSubtitleFile, removeSubtitleFile, removeVideo, toggleVideoFavorite, updateVideoPosition, clearVideoProgress, clearAllVideoProgress, updateVideoDuration, setVideoSummary, updateVideoPreference, getVideo: (videoId) => videos.find((video) => video.id === videoId), clearVideoIssue: () => setVideoIssue(null), clearDeviceScanStatus: () => setDeviceScanStatus(null) }), [addVideoToPlaylist, attachSubtitleFile, clearAllVideoProgress, clearVideoProgress, createVideoPlaylist, deviceScanStatus, importVideoFiles, importVideoFromDeviceLibrary, isImporting, isReady, preferences, removeSubtitleFile, removeVideo, removeVideoFromPlaylist, removeVideoPlaylist, setVideoSummary, toggleVideoFavorite, updateVideoDuration, updateVideoPosition, updateVideoPreference, videoIssue, videoPlaylists, videos]);
  return <VideoContext.Provider value={value}>{children}</VideoContext.Provider>;
}

export function useVideoLibrary() {
  const context = useContext(VideoContext);
  if (!context) throw new Error("useVideoLibrary must be used within VideoProvider");
  return context;
}
