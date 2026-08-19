import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { reportLocalDiagnostic } from "@/lib/_core/local-diagnostics";
import { DEFAULT_AUDIO_PREFERENCES, INITIAL_PLAYLISTS, INITIAL_TRACKS } from "@/lib/omniwave/data";
import { haptic } from "@/lib/omniwave/haptics";
import { trpc } from "@/lib/trpc";
import { scanDeviceMedia, type DeviceMediaIssue, type DeviceMediaCandidate } from "@/lib/omniwave/device-media-scan";
import { createLocalMediaFingerprint, filterNewLocalMedia, isLocalMediaFingerprint, shouldReplaceAudioSource } from "@/lib/omniwave/media-stability";
import type { AudioEqualizerPreset, AudioPreferences, ClassificationStatus, ListeningHistoryEntry, LocalListeningProfile, PlayerSnapshot, Playlist, Track, TrackClassification } from "@/lib/omniwave/types";
import { isSafeArtworkUri, isSafeAudioUri } from "@/lib/omniwave/validation";

const STORAGE_KEY = "omniwave:library:v2";
const MAX_QUEUE_ITEMS = 50;
const MAX_PLAYLIST_NAME_LENGTH = 60;
const MAX_ARTWORK_BYTES = 5 * 1024 * 1024;
const ARTWORK_DIRECTORY = "omniwave-artwork";
const AUDIO_DIRECTORY = "omniwave-audio";
const MAX_AUDIO_FILE_BYTES = 200 * 1024 * 1024;
const SLEEP_TIMER_OPTIONS = [0, 15, 30, 45, 60] as const;
const EQ_PRESETS: Record<AudioEqualizerPreset, number[]> = { flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], warm: [5, 4, 3, 2, 1, 0, 0, -1, -1, -1], vocal: [-2, -1, 0, 1, 2, 4, 4, 2, 1, 0], night: [2, 2, 1, 0, -1, -2, -1, 0, 1, 1] };
export type PlaybackIssue = "playback" | "import" | null;
export type DeviceScanStatus = DeviceMediaIssue | "complete" | "limited" | null;
const DEFAULT_PROFILE: LocalListeningProfile = { displayName: "OmniWave", bio: "" };
type PersistedLibrary = { tracks: Track[]; playlists: Playlist[]; historyIds: string[]; historyEntries: ListeningHistoryEntry[]; preferences: AudioPreferences; queueIds: string[]; profile: LocalListeningProfile };
type PlayerContextValue = {
  tracks: Track[]; playlists: Playlist[]; historyIds: string[]; historyEntries: ListeningHistoryEntry[]; profile: LocalListeningProfile; queueTracks: Track[]; currentTrack: Track | null; snapshot: PlayerSnapshot; preferences: AudioPreferences; isReady: boolean; isImporting: boolean; isArtworkUpdating: boolean; isClassifyingMetadata: boolean; playbackIssue: PlaybackIssue; deviceScanStatus: DeviceScanStatus;
  playTrack: (track: Track) => void; togglePlay: () => void; seekTo: (seconds: number) => void; nextTrack: () => void; previousTrack: () => void;
  toggleFavorite: (trackId: string) => void; toggleShuffle: () => void; toggleRepeat: () => void; importAudioFiles: () => Promise<void>; importAudioFromDeviceLibrary: () => Promise<void>; clearDeviceScanStatus: () => void; selectArtworkForTrack: (trackId: string) => Promise<boolean>; removeArtworkForTrack: (trackId: string) => Promise<void>;
  createPlaylist: (name: string) => void; renamePlaylist: (playlistId: string, name: string) => void; movePlaylist: (playlistId: string, direction: -1 | 1) => void; addTrackToPlaylist: (playlistId: string, trackId: string) => void; removeTrackFromPlaylist: (playlistId: string, trackId: string) => void;
  updatePreference: <K extends keyof AudioPreferences>(key: K, value: AudioPreferences[K]) => void; updateEqBand: (index: number, value: number) => void; applyEqualizerPreset: (preset: AudioEqualizerPreset) => void; getTrack: (trackId: string) => Track | undefined;
  addToQueue: (trackId: string) => void; removeFromQueue: (trackId: string) => void; moveQueueTrack: (trackId: string, direction: -1 | 1) => void; clearQueue: () => void; playQueueTrack: (trackId: string) => void; setSleepTimer: (minutes: number) => void; stopPlaybackNow: () => void; clearPlaybackIssue: () => void; resetAudioPreferences: () => void; updateProfile: (displayName: string, bio: string) => void; classifyImportedTracks: (tracks: Track[]) => Promise<void>; reclassifyTrack: (trackId: string) => Promise<void>; acceptClassification: (trackId: string, value: TrackClassification) => void; rejectClassification: (trackId: string) => void;
};
const PlayerContext = createContext<PlayerContextValue | null>(null);

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }
function normalizePlaylistName(value: unknown): string { return typeof value === "string" ? value.trim().replace(/[\u0000-\u001F]/g, "").replace(/\s+/g, " ").slice(0, MAX_PLAYLIST_NAME_LENGTH) : ""; }
function normalizeProfileText(value: unknown, maxLength: number): string { return typeof value === "string" ? value.trim().replace(/[\u0000-\u001F]/g, "").replace(/\s+/g, " ").slice(0, maxLength) : ""; }
function sanitizeClassification(value: unknown): TrackClassification | undefined { if (!isRecord(value)) return undefined; const genre = normalizeProfileText(value.genre, 32); const mood = normalizeProfileText(value.mood, 32); const tags = Array.isArray(value.tags) ? value.tags.map((tag) => normalizeProfileText(tag, 24)).filter(Boolean).slice(0, 3) : []; const confidence = Number.isFinite(value.confidence) ? Math.max(0, Math.min(100, Math.round(Number(value.confidence)))) : 0; return genre && mood ? { genre, mood, tags, confidence } : undefined; }
function classificationStatus(value: unknown, classification: TrackClassification | undefined, suggestedClassification: TrackClassification | undefined): ClassificationStatus { if (value === "failed") return "failed"; if (suggestedClassification) return "suggested"; return classification ? "ready" : "idle"; }
function sanitizeProfile(value: unknown): LocalListeningProfile { if (!isRecord(value)) return DEFAULT_PROFILE; return { displayName: normalizeProfileText(value.displayName, 40) || DEFAULT_PROFILE.displayName, bio: normalizeProfileText(value.bio, 120) }; }
function isHistoryEntry(value: unknown): value is ListeningHistoryEntry { return isRecord(value) && typeof value.trackId === "string" && Number.isFinite(value.playedAt) && Number(value.playedAt) > 0; }
function isTrack(value: unknown): value is Track { return isRecord(value) && typeof value.id === "string" && typeof value.title === "string" && typeof value.artist === "string" && typeof value.album === "string" && isSafeAudioUri(value.audioUri) && (value.artworkUri === undefined || isSafeArtworkUri(value.artworkUri)) && (value.sourceFingerprint === undefined || isLocalMediaFingerprint(value.sourceFingerprint)) && typeof value.accent === "string" && typeof value.isFavorite === "boolean" && Number.isFinite(value.durationSeconds); }
function isPlaylist(value: unknown): value is Playlist { return isRecord(value) && typeof value.id === "string" && Boolean(normalizePlaylistName(value.name)) && Array.isArray(value.trackIds) && value.trackIds.every((id) => typeof id === "string") && Number.isFinite(value.createdAt); }
function sanitizePreferences(value: unknown): AudioPreferences { if (!isRecord(value)) return DEFAULT_AUDIO_PREFERENCES; const eq = Array.isArray(value.eq) ? value.eq.filter(Number.isFinite).slice(0, 10) : DEFAULT_AUDIO_PREFERENCES.eq; const equalizerPreset = value.equalizerPreset === "warm" || value.equalizerPreset === "vocal" || value.equalizerPreset === "night" ? value.equalizerPreset : "flat"; return { bassBoost: Boolean(value.bassBoost), reverb: Boolean(value.reverb), surround: Boolean(value.surround), eq: eq.length === 10 ? eq.map((band) => Math.max(-10, Math.min(10, Number(band)))) : DEFAULT_AUDIO_PREFERENCES.eq, equalizerPreset, playbackQuality: value.playbackQuality === "high" ? "high" : "standard", aiMetadataEnabled: Boolean(value.aiMetadataEnabled) }; }
function createLocalTrack(uri: string, fileName: string, index: number, album: string, durationSeconds = 0, sourceFingerprint?: string): Track | null { if (!isSafeAudioUri(uri)) return null; const name = fileName.replace(/\.[^/.]+$/, "").trim().replace(/[\u0000-\u001F]/g, "").slice(0, 100); const accents = ["#20E3B2", "#A78BFA", "#FF6999", "#84DCC6"]; return { id: `imported-${Date.now()}-${index}`, title: name || "Untitled track", artist: "Local file", album, durationSeconds: Number.isFinite(durationSeconds) ? Math.max(0, durationSeconds) : 0, audioUri: uri, accent: accents[index % accents.length], isFavorite: false, isImported: true, sourceFingerprint: isLocalMediaFingerprint(sourceFingerprint) ? sourceFingerprint : undefined }; }
function audioExtension(value: unknown): string | null { const extension = typeof value === "string" ? value.trim().toLowerCase().split(".").pop() : ""; return extension && ["mp3", "m4a", "aac", "wav", "flac", "ogg", "opus"].includes(extension) ? extension : null; }
async function persistAudioAsset(asset: { uri: string; name?: string | null; size?: number | null }, index: number, album: string, durationSeconds = 0): Promise<Track | null> {
  const extension = audioExtension(asset.name);
  if (!extension || !isSafeAudioUri(asset.uri) || (asset.size !== undefined && asset.size !== null && (!Number.isFinite(asset.size) || Number(asset.size) < 0 || Number(asset.size) > MAX_AUDIO_FILE_BYTES)) || !FileSystem.documentDirectory) return null;
  const directory = `${FileSystem.documentDirectory}${AUDIO_DIRECTORY}/`;
  const destination = `${directory}${Date.now()}-${index}.${extension}`;
  try {
    await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    await FileSystem.copyAsync({ from: asset.uri, to: destination });
    const file = await FileSystem.getInfoAsync(destination);
    if (!file.exists) { await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => reportLocalDiagnostic("audio_library_cleanup_failed")); reportLocalDiagnostic("audio_library_persist_failed"); return null; }
    const copiedSize = "size" in file && Number.isFinite(file.size) ? Number(file.size) : asset.size;
    return createLocalTrack(destination, String(asset.name ?? "Local audio"), index, album, durationSeconds, createLocalMediaFingerprint({ fileName: asset.name, sizeBytes: copiedSize }));
  } catch { await FileSystem.deleteAsync(destination, { idempotent: true }).catch(() => reportLocalDiagnostic("audio_library_cleanup_failed")); reportLocalDiagnostic("audio_library_persist_failed"); return null; }
}
async function removeManagedAudioFile(uri: string) {
  if (!FileSystem.documentDirectory || !uri.startsWith(`${FileSystem.documentDirectory}${AUDIO_DIRECTORY}/`)) return;
  try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch { reportLocalDiagnostic("audio_library_cleanup_failed"); }
}
function artworkExtension(value: unknown): "jpg" | "png" | "webp" | null { const extension = typeof value === "string" ? value.trim().toLowerCase().split(".").pop() : ""; return extension === "jpg" || extension === "jpeg" ? "jpg" : extension === "png" || extension === "webp" ? extension : null; }
function isManagedArtworkUri(value: string | undefined): boolean { return Boolean(value && FileSystem.documentDirectory && value.startsWith(`${FileSystem.documentDirectory}${ARTWORK_DIRECTORY}/`)); }

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>(INITIAL_TRACKS);
  const [playlists, setPlaylists] = useState<Playlist[]>(INITIAL_PLAYLISTS);
  const [historyIds, setHistoryIds] = useState<string[]>([]);
  const [historyEntries, setHistoryEntries] = useState<ListeningHistoryEntry[]>([]);
  const [queueIds, setQueueIds] = useState<string[]>([]);
  const [preferences, setPreferences] = useState<AudioPreferences>(DEFAULT_AUDIO_PREFERENCES);
  const [profile, setProfile] = useState<LocalListeningProfile>(DEFAULT_PROFILE);
  const [activeTrackId, setActiveTrackId] = useState<string | null>(INITIAL_TRACKS[0]?.id ?? null);
  const [isPlaying, setIsPlaying] = useState(false); const [shuffleEnabled, setShuffleEnabled] = useState(false); const [repeatEnabled, setRepeatEnabled] = useState(false); const [sleepTimerEndsAt, setSleepTimerEndsAt] = useState<number | null>(null); const [now, setNow] = useState(Date.now()); const [isReady, setIsReady] = useState(false); const [isImporting, setIsImporting] = useState(false); const [isArtworkUpdating, setIsArtworkUpdating] = useState(false); const [isClassifyingMetadata, setIsClassifyingMetadata] = useState(false); const [playbackIssue, setPlaybackIssue] = useState<PlaybackIssue>(null); const [deviceScanStatus, setDeviceScanStatus] = useState<DeviceScanStatus>(null);
  const { mutateAsync: requestMetadataClassification } = trpc.music.classifyMetadata.useMutation();
  const latestTracks = useRef(tracks); const latestQueue = useRef(queueIds); const loadedTrackIdRef = useRef<string | null>(null);
  const currentTrack = tracks.find((track) => track.id === activeTrackId) ?? null;
  const queueTracks = queueIds.map((id) => tracks.find((track) => track.id === id)).filter((track): track is Track => Boolean(track));
  const player = useAudioPlayer(null, { updateInterval: 250 }); const playerStatus = useAudioPlayerStatus(player);

  useEffect(() => { latestTracks.current = tracks; }, [tracks]); useEffect(() => { latestQueue.current = queueIds; }, [queueIds]);
  useEffect(() => { if (playerStatus.playing !== isPlaying) setIsPlaying(playerStatus.playing); }, [isPlaying, playerStatus.playing]);
  useEffect(() => { void setAudioModeAsync({ playsInSilentMode: true, shouldPlayInBackground: true, interruptionMode: "doNotMix" }).catch(() => reportLocalDiagnostic("audio_mode_configuration_failed")); }, []);
  useEffect(() => { try { if (!currentTrack) { player.setActiveForLockScreen(false); return; } player.setActiveForLockScreen(isPlaying, { title: currentTrack.title, artist: currentTrack.artist, albumTitle: currentTrack.album }); } catch { reportLocalDiagnostic("audio_lock_screen_metadata_failed"); } }, [currentTrack, isPlaying, player]);
  useEffect(() => {
    let mounted = true;
    const hydrateLibrary = async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw || !mounted) return;
        const stored = JSON.parse(raw) as unknown;
        if (!isRecord(stored)) {
          reportLocalDiagnostic("audio_library_hydration_failed");
          return;
        }
        const storedTracks = Array.isArray(stored.tracks)
          ? stored.tracks
              .filter(isTrack)
              .map((track) => {
                const classification = sanitizeClassification(track.classification);
                const suggestedClassification = sanitizeClassification(track.suggestedClassification);
                return {
                  ...track,
                  classification,
                  suggestedClassification,
                  classificationStatus: classificationStatus(track.classificationStatus, classification, suggestedClassification),
                };
              })
              .slice(0, 250)
          : [];
        const resolvedTracks = storedTracks.length ? storedTracks : INITIAL_TRACKS;
        if (storedTracks.length) {
          setTracks(storedTracks);
          setActiveTrackId(storedTracks[0]?.id ?? null);
        }
        if (Array.isArray(stored.playlists)) {
          setPlaylists(
            stored.playlists
              .filter(isPlaylist)
              .slice(0, 100)
              .map((playlist) => ({
                ...playlist,
                name: playlist.name.slice(0, MAX_PLAYLIST_NAME_LENGTH),
                trackIds: playlist.trackIds.filter((id) => resolvedTracks.some((track) => track.id === id)).slice(0, 250),
              })),
          );
        }
        if (Array.isArray(stored.historyIds)) {
          setHistoryIds(
            stored.historyIds
              .filter((id): id is string => typeof id === "string" && resolvedTracks.some((track) => track.id === id))
              .slice(0, 12),
          );
        }
        if (Array.isArray(stored.historyEntries)) {
          setHistoryEntries(
            stored.historyEntries
              .filter(isHistoryEntry)
              .filter((entry) => resolvedTracks.some((track) => track.id === entry.trackId))
              .slice(0, 12),
          );
        }
        if (Array.isArray(stored.queueIds)) {
          setQueueIds(
            stored.queueIds
              .filter((id): id is string => typeof id === "string" && resolvedTracks.some((track) => track.id === id))
              .slice(0, MAX_QUEUE_ITEMS),
          );
        }
        setPreferences(sanitizePreferences(stored.preferences));
        setProfile(sanitizeProfile(stored.profile));
      } catch {
        reportLocalDiagnostic("audio_library_hydration_failed");
      } finally {
        if (mounted) setIsReady(true);
      }
    };
    void hydrateLibrary();
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (!isReady || historyEntries.length || !historyIds.length) return; const now = Date.now(); setHistoryEntries(historyIds.map((trackId, index) => ({ trackId, playedAt: now - index }))); }, [historyEntries.length, historyIds, isReady]);
  useEffect(() => { if (!isReady) return; const value: PersistedLibrary = { tracks, playlists, historyIds, historyEntries, preferences, queueIds, profile }; void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value)).catch(() => reportLocalDiagnostic("audio_library_write_failed")); }, [historyEntries, historyIds, isReady, playlists, preferences, profile, queueIds, tracks]);
  useEffect(() => { if (!sleepTimerEndsAt) return; const interval = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, [sleepTimerEndsAt]);
  useEffect(() => { if (sleepTimerEndsAt && now >= sleepTimerEndsAt) { player.pause(); setIsPlaying(false); setSleepTimerEndsAt(null); haptic.light(); } }, [now, player, sleepTimerEndsAt]);

  const recordHistory = useCallback((trackId: string) => { const playedAt = Date.now(); setHistoryIds((previous) => [trackId, ...previous.filter((id) => id !== trackId)].slice(0, 12)); setHistoryEntries((previous) => [{ trackId, playedAt }, ...previous.filter((entry) => entry.trackId !== trackId)].slice(0, 12)); }, []);
  const playTrack = useCallback((track: Track) => { if (!isSafeAudioUri(track.audioUri)) { setIsPlaying(false); setPlaybackIssue("playback"); haptic.error(); return; } try { if (shouldReplaceAudioSource(loadedTrackIdRef.current, track.id)) { player.replace(track.audioUri); loadedTrackIdRef.current = track.id; } setActiveTrackId(track.id); setPlaybackIssue(null); setIsPlaying(true); recordHistory(track.id); player.play(); haptic.light(); } catch { setIsPlaying(false); setPlaybackIssue("playback"); haptic.error(); } }, [player, recordHistory]);
  const stopPlaybackNow = useCallback(() => { player.pause(); setIsPlaying(false); setSleepTimerEndsAt(null); haptic.light(); }, [player]);
  const togglePlay = useCallback(() => { const track = latestTracks.current.find((item) => item.id === activeTrackId) ?? latestTracks.current[0]; if (!track) return; if (isPlaying) { player.pause(); setIsPlaying(false); haptic.light(); return; } playTrack(track); }, [activeTrackId, isPlaying, playTrack, player]);
  const seekTo = useCallback((seconds: number) => { const duration = Number(playerStatus.duration) || currentTrack?.durationSeconds || 0; void player.seekTo(Math.min(Math.max(Number.isFinite(seconds) ? seconds : 0, 0), duration)).catch(() => { setPlaybackIssue("playback"); haptic.error(); }); }, [currentTrack?.durationSeconds, player, playerStatus.duration]);
  const selectRelativeTrack = useCallback((direction: 1 | -1) => { const source = latestTracks.current; if (!source.length) return; if (direction === 1 && latestQueue.current.length) { const queuedId = latestQueue.current[0]; setQueueIds((previous) => previous.slice(1)); const queuedTrack = source.find((track) => track.id === queuedId); if (queuedTrack) { playTrack(queuedTrack); return; } } const currentIndex = Math.max(source.findIndex((track) => track.id === activeTrackId), 0); const nextIndex = shuffleEnabled ? Math.floor(Math.random() * source.length) : (currentIndex + direction + source.length) % source.length; playTrack(source[nextIndex]); }, [activeTrackId, playTrack, shuffleEnabled]);
  const nextTrack = useCallback(() => selectRelativeTrack(1), [selectRelativeTrack]); const previousTrack = useCallback(() => selectRelativeTrack(-1), [selectRelativeTrack]);
  useEffect(() => { const duration = Number(playerStatus.duration) || 0; const position = Number(playerStatus.currentTime) || 0; if (duration > 0 && position >= duration - 0.25 && isPlaying) { if (repeatEnabled) { player.seekTo(0); player.play(); } else nextTrack(); } }, [isPlaying, nextTrack, player, playerStatus.currentTime, playerStatus.duration, repeatEnabled]);
  const toggleFavorite = useCallback((trackId: string) => { setTracks((previous) => previous.map((track) => track.id === trackId ? { ...track, isFavorite: !track.isFavorite } : track)); haptic.light(); }, []);
  const classifyImportedTracks = useCallback(async (candidateTracks: Track[]) => { const candidates = candidateTracks.filter((track) => track.isImported).slice(0, 4); if (!candidates.length) return; setTracks((previous) => previous.map((track) => candidates.some((candidate) => candidate.id === track.id) ? { ...track, classificationStatus: "pending" } : track)); setIsClassifyingMetadata(true); try { const result = await requestMetadataClassification({ tracks: candidates.map((track) => ({ id: track.id, title: track.title, artist: track.artist, album: track.album, durationSeconds: Math.max(0, Math.min(86_400, track.durationSeconds)) })) }); const byId = new Map(result.items.map((item) => [item.id, { genre: item.genre, mood: item.mood, tags: item.tags, confidence: item.confidence }])); setTracks((previous) => previous.map((track) => { const suggestedClassification = byId.get(track.id); return suggestedClassification ? { ...track, suggestedClassification, classificationStatus: "suggested" } : candidates.some((candidate) => candidate.id === track.id) ? { ...track, classificationStatus: "failed" } : track; })); } catch { setTracks((previous) => previous.map((track) => candidates.some((candidate) => candidate.id === track.id) ? { ...track, classificationStatus: "failed" } : track)); } finally { setIsClassifyingMetadata(false); } }, [requestMetadataClassification]);
  const importAudioFiles = useCallback(async () => { setIsImporting(true); setPlaybackIssue(null); try { const result = await DocumentPicker.getDocumentAsync({ type: "audio/*", multiple: true, copyToCacheDirectory: true }); if (result.canceled) return; const capacity = Math.max(0, 250 - latestTracks.current.length); if (!capacity) { setPlaybackIssue("import"); haptic.error(); return; } const existingFingerprints = latestTracks.current.map((track) => track.sourceFingerprint).filter(isLocalMediaFingerprint); const assets = filterNewLocalMedia(result.assets.slice(0, Math.min(25, capacity)), existingFingerprints, (asset) => createLocalMediaFingerprint({ fileName: asset.name, sizeBytes: asset.size })); const created = await Promise.all(assets.map((asset, index) => persistAudioAsset(asset, index, "Local library"))); const persisted = created.filter((track): track is Track => Boolean(track)); const nextTracks = filterNewLocalMedia(persisted, existingFingerprints, (track) => track.sourceFingerprint ?? ""); await Promise.all(persisted.filter((track) => !nextTracks.includes(track)).map((track) => removeManagedAudioFile(track.audioUri))); if (!nextTracks.length) { setPlaybackIssue("import"); haptic.error(); return; } setTracks((previous) => [...nextTracks, ...previous].slice(0, 250)); setActiveTrackId(nextTracks[0].id); if (preferences.aiMetadataEnabled) void classifyImportedTracks(nextTracks); haptic.success(); } catch { setPlaybackIssue("import"); haptic.error(); } finally { setIsImporting(false); } }, [classifyImportedTracks, preferences.aiMetadataEnabled]);
  const importAudioFromDeviceLibrary = useCallback(async () => { setIsImporting(true); setPlaybackIssue(null); setDeviceScanStatus(null); try { const capacity = Math.max(0, 250 - latestTracks.current.length); const result = await scanDeviceMedia("audio", capacity); if (result.issue) { setDeviceScanStatus(result.issue); haptic.error(); return; } const created = await Promise.all(result.candidates.map((candidate, index) => persistAudioAsset({ uri: candidate.uri, name: candidate.name }, index, "Device library", candidate.durationSeconds))); const persisted = created.filter((track): track is Track => Boolean(track)); const existingFingerprints = latestTracks.current.map((track) => track.sourceFingerprint).filter(isLocalMediaFingerprint); const nextTracks = filterNewLocalMedia(persisted, existingFingerprints, (track) => track.sourceFingerprint ?? ""); await Promise.all(persisted.filter((track) => !nextTracks.includes(track)).map((track) => removeManagedAudioFile(track.audioUri))); if (!nextTracks.length) { setDeviceScanStatus("empty"); haptic.error(); return; } setTracks((previous) => [...nextTracks, ...previous].slice(0, 250)); setActiveTrackId(nextTracks[0].id); if (preferences.aiMetadataEnabled) void classifyImportedTracks(nextTracks); setDeviceScanStatus(result.limitedAccess ? "limited" : "complete"); haptic.success(); } catch { setDeviceScanStatus("unavailable"); haptic.error(); } finally { setIsImporting(false); } }, [classifyImportedTracks, preferences.aiMetadataEnabled]);
  const selectArtworkForTrack = useCallback(async (trackId: string): Promise<boolean> => { if (!latestTracks.current.some((track) => track.id === trackId)) return false; setIsArtworkUpdating(true); try { const result = await DocumentPicker.getDocumentAsync({ type: "image/*", multiple: false, copyToCacheDirectory: true }); if (result.canceled) return false; const asset = result.assets[0]; const extension = artworkExtension(asset?.name); if (!asset || !extension || !isSafeArtworkUri(asset.uri) || (Number.isFinite(asset.size) && Number(asset.size) > MAX_ARTWORK_BYTES) || !FileSystem.documentDirectory) { haptic.error(); return false; } const directory = `${FileSystem.documentDirectory}${ARTWORK_DIRECTORY}/`; await FileSystem.makeDirectoryAsync(directory, { intermediates: true }); const safeTrackId = trackId.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80); const destination = `${directory}${safeTrackId}-${Date.now()}.${extension}`; await FileSystem.copyAsync({ from: asset.uri, to: destination }); const previousArtwork = latestTracks.current.find((track) => track.id === trackId)?.artworkUri; setTracks((previous) => previous.map((track) => track.id === trackId ? { ...track, artworkUri: destination } : track)); if (previousArtwork && isManagedArtworkUri(previousArtwork) && previousArtwork !== destination) void FileSystem.deleteAsync(previousArtwork, { idempotent: true }).catch(() => reportLocalDiagnostic("audio_artwork_cleanup_failed")); haptic.success(); return true; } catch { haptic.error(); return false; } finally { setIsArtworkUpdating(false); } }, []);
  const removeArtworkForTrack = useCallback(async (trackId: string): Promise<void> => { const previousArtwork = latestTracks.current.find((track) => track.id === trackId)?.artworkUri; if (!previousArtwork) return; setTracks((previous) => previous.map((track) => track.id === trackId ? { ...track, artworkUri: undefined } : track)); if (isManagedArtworkUri(previousArtwork)) await FileSystem.deleteAsync(previousArtwork, { idempotent: true }).catch(() => reportLocalDiagnostic("audio_artwork_cleanup_failed")); haptic.light(); }, []);
  const createPlaylist = useCallback((name: string) => { const normalized = normalizePlaylistName(name); if (!normalized) return; setPlaylists((previous) => [{ id: `playlist-${Date.now()}`, name: normalized, trackIds: [], createdAt: Date.now() }, ...previous].slice(0, 100)); haptic.success(); }, []);
  const renamePlaylist = useCallback((playlistId: string, name: string) => { const normalized = normalizePlaylistName(name); if (!normalized) return; setPlaylists((previous) => previous.map((playlist) => playlist.id === playlistId ? { ...playlist, name: normalized } : playlist)); haptic.success(); }, []);
  const movePlaylist = useCallback((playlistId: string, direction: -1 | 1) => { setPlaylists((previous) => { const fromIndex = previous.findIndex((playlist) => playlist.id === playlistId); const toIndex = fromIndex + direction; if (fromIndex < 0 || toIndex < 0 || toIndex >= previous.length) return previous; const next = [...previous]; [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]]; return next; }); haptic.light(); }, []);
  const addTrackToPlaylist = useCallback((playlistId: string, trackId: string) => { setPlaylists((previous) => previous.map((playlist) => playlist.id === playlistId && !playlist.trackIds.includes(trackId) ? { ...playlist, trackIds: [...playlist.trackIds, trackId].slice(0, 250) } : playlist)); haptic.success(); }, []);
  const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => { setPlaylists((previous) => previous.map((playlist) => playlist.id === playlistId ? { ...playlist, trackIds: playlist.trackIds.filter((id) => id !== trackId) } : playlist)); }, []);
  const updatePreference = useCallback(<K extends keyof AudioPreferences>(key: K, value: AudioPreferences[K]) => { setPreferences((previous) => ({ ...previous, [key]: value })); haptic.medium(); }, []);
  const updateEqBand = useCallback((index: number, value: number) => { if (!Number.isInteger(index) || index < 0 || index >= 10 || !Number.isFinite(value)) return; setPreferences((previous) => ({ ...previous, equalizerPreset: "flat", eq: previous.eq.map((band, bandIndex) => bandIndex === index ? Math.max(-10, Math.min(10, value)) : band) })); }, []);
  const applyEqualizerPreset = useCallback((preset: AudioEqualizerPreset) => { const bands = EQ_PRESETS[preset]; if (!bands) return; setPreferences((previous) => ({ ...previous, equalizerPreset: preset, eq: [...bands] })); haptic.selection(); }, []);
  const resetAudioPreferences = useCallback(() => { setPreferences({ ...DEFAULT_AUDIO_PREFERENCES, eq: [...DEFAULT_AUDIO_PREFERENCES.eq] }); haptic.success(); }, []);
  const updateProfile = useCallback((displayName: string, bio: string) => { setProfile({ displayName: normalizeProfileText(displayName, 40) || DEFAULT_PROFILE.displayName, bio: normalizeProfileText(bio, 120) }); haptic.success(); }, []);
  const acceptClassification = useCallback((trackId: string, value: TrackClassification) => { const classification = sanitizeClassification(value); if (!classification) return; setTracks((previous) => previous.map((track) => track.id === trackId ? { ...track, classification, suggestedClassification: undefined, classificationStatus: "ready" } : track)); haptic.success(); }, []);
  const rejectClassification = useCallback((trackId: string) => { setTracks((previous) => previous.map((track) => track.id === trackId ? { ...track, suggestedClassification: undefined, classificationStatus: track.classification ? "ready" : "idle" } : track)); haptic.light(); }, []);
  const reclassifyTrack = useCallback(async (trackId: string) => { if (!preferences.aiMetadataEnabled) return; const track = latestTracks.current.find((item) => item.id === trackId); if (track) await classifyImportedTracks([track]); }, [classifyImportedTracks, preferences.aiMetadataEnabled]);
  const addToQueue = useCallback((trackId: string) => { if (!latestTracks.current.some((track) => track.id === trackId)) return; setQueueIds((previous) => previous.includes(trackId) ? previous : [...previous, trackId].slice(0, MAX_QUEUE_ITEMS)); haptic.light(); }, []);
  const removeFromQueue = useCallback((trackId: string) => setQueueIds((previous) => previous.filter((id) => id !== trackId)), []);
  const moveQueueTrack = useCallback((trackId: string, direction: -1 | 1) => {
    setQueueIds((previous) => {
      const fromIndex = previous.indexOf(trackId);
      const toIndex = fromIndex + direction;
      if (fromIndex < 0 || toIndex < 0 || toIndex >= previous.length) return previous;
      const next = [...previous];
      [next[fromIndex], next[toIndex]] = [next[toIndex], next[fromIndex]];
      return next;
    });
    haptic.light();
  }, []);
  const clearQueue = useCallback(() => setQueueIds([]), []); const playQueueTrack = useCallback((trackId: string) => { const track = latestTracks.current.find((item) => item.id === trackId); if (!track) return; setQueueIds((previous) => previous.filter((id) => id !== trackId)); playTrack(track); }, [playTrack]);
  const setSleepTimer = useCallback((minutes: number) => { if (!SLEEP_TIMER_OPTIONS.includes(minutes as (typeof SLEEP_TIMER_OPTIONS)[number])) return; setSleepTimerEndsAt(minutes ? Date.now() + minutes * 60_000 : null); setNow(Date.now()); haptic.medium(); }, []);
  const sleepTimerRemainingSeconds = sleepTimerEndsAt ? Math.max(0, Math.ceil((sleepTimerEndsAt - now) / 1000)) : 0;
  const snapshot = useMemo<PlayerSnapshot>(() => ({ activeTrackId, isPlaying, positionSeconds: Number(playerStatus.currentTime) || 0, durationSeconds: Number(playerStatus.duration) || currentTrack?.durationSeconds || 0, shuffleEnabled, repeatEnabled, queueLength: queueTracks.length, sleepTimerEndsAt, sleepTimerRemainingSeconds }), [activeTrackId, currentTrack?.durationSeconds, isPlaying, playerStatus.currentTime, playerStatus.duration, queueTracks.length, repeatEnabled, shuffleEnabled, sleepTimerEndsAt, sleepTimerRemainingSeconds]);
  const value = useMemo<PlayerContextValue>(() => ({ tracks, playlists, historyIds, historyEntries, profile, queueTracks, currentTrack, snapshot, preferences, isReady, isImporting, isArtworkUpdating, isClassifyingMetadata, playbackIssue, deviceScanStatus, playTrack, togglePlay, seekTo, nextTrack, previousTrack, toggleFavorite, toggleShuffle: () => { setShuffleEnabled((value) => !value); haptic.medium(); }, toggleRepeat: () => { setRepeatEnabled((value) => !value); haptic.medium(); }, importAudioFiles, importAudioFromDeviceLibrary, clearDeviceScanStatus: () => setDeviceScanStatus(null), selectArtworkForTrack, removeArtworkForTrack, createPlaylist, renamePlaylist, movePlaylist, addToQueue, addTrackToPlaylist, removeTrackFromPlaylist, updatePreference, updateEqBand, applyEqualizerPreset, getTrack: (trackId) => tracks.find((track) => track.id === trackId), removeFromQueue, moveQueueTrack, clearQueue, playQueueTrack, setSleepTimer, stopPlaybackNow, clearPlaybackIssue: () => setPlaybackIssue(null), resetAudioPreferences, updateProfile, classifyImportedTracks, reclassifyTrack, acceptClassification, rejectClassification }), [acceptClassification, addToQueue, addTrackToPlaylist, applyEqualizerPreset, classifyImportedTracks, clearQueue, createPlaylist, currentTrack, deviceScanStatus, historyEntries, historyIds, importAudioFiles, importAudioFromDeviceLibrary, isArtworkUpdating, isClassifyingMetadata, isImporting, isReady, movePlaylist, moveQueueTrack, nextTrack, playQueueTrack, playTrack, playbackIssue, playlists, preferences, previousTrack, profile, queueTracks, reclassifyTrack, rejectClassification, removeArtworkForTrack, removeFromQueue, removeTrackFromPlaylist, renamePlaylist, resetAudioPreferences, seekTo, selectArtworkForTrack, setSleepTimer, snapshot, stopPlaybackNow, toggleFavorite, togglePlay, tracks, updateEqBand, updatePreference, updateProfile]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
export function usePlayer() { const context = useContext(PlayerContext); if (!context) throw new Error("usePlayer must be used within PlayerProvider"); return context; }
