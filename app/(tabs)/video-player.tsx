import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useEvent } from "expo";
import { router, useLocalSearchParams } from "expo-router";
import * as FileSystem from "expo-file-system/legacy";
import * as Clipboard from "expo-clipboard";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Brightness from "expo-brightness";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useReducedMotion } from "react-native-reanimated";
import { Alert, Animated, Platform, Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { VideoView, useVideoPlayer, type VideoView as VideoViewHandle } from "expo-video";

import { PrismBackdrop } from "@/components/omniwave/glass-card";
import { ScreenContainer } from "@/components/screen-container";
import { reportLocalDiagnostic } from "@/lib/_core/local-diagnostics";
import { formatTime } from "@/lib/omniwave/data";
import { haptic } from "@/lib/omniwave/haptics";
import { usePlayer } from "@/lib/omniwave/player-store";
import { exportVideoSummary } from "@/lib/omniwave/sharing";
import type { VideoCaptionBackground, VideoCaptionPosition, VideoCaptionTextColor, VideoCaptionTextSize, VideoPlaybackRate, VideoSummaryLength } from "@/lib/omniwave/types";
import { useVideoLibrary } from "@/lib/omniwave/video-store";
import { parseWebVtt, searchVttCues, type VttCue } from "@/lib/omniwave/vtt";
import { useThemeContext } from "@/lib/theme-provider";
import { resolveMediaGlassAccent } from "@/lib/omniwave/media-visuals";
import { trpc } from "@/lib/trpc";

const PLAYBACK_RATES: VideoPlaybackRate[] = [0.5, 0.75, 1, 1.25, 1.5, 2];
const CAPTION_SIZES: Record<VideoCaptionTextSize, number> = { small: 12, standard: 14, large: 18 };
const CAPTION_COLORS: Record<VideoCaptionTextColor, string> = { white: "#FFFFFF", yellow: "#FFF176", cyan: "#80DEEA" };
const CAPTION_BACKGROUNDS: Record<VideoCaptionBackground, string> = { none: "transparent", black: "#000000BF", indigo: "#1E1B4BCC" };

function CaptionChoice({ selected, label, color, onPress }: { selected: boolean; label: string; color?: string; onPress: () => void }) {
  const { theme } = useThemeContext();
  return <Pressable accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={({ pressed }) => [styles.captionChoice, { borderColor: selected ? theme.colors.primary : theme.colors.glassBorder, backgroundColor: selected ? `${theme.colors.primary}16` : theme.colors.glass }, pressed && styles.pressed]}>{color ? <View style={[styles.colorDot, { backgroundColor: color }]} /> : null}{selected ? <MaterialIcons name="check" size={15} color={theme.colors.primary} /> : null}<Text style={[styles.choiceText, { color: selected ? theme.colors.primary : theme.colors.muted }]}>{label}</Text></Pressable>;
}

function HighlightedCaption({ text, query, color }: { text: string; query: string; color: string }) {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return text;
  const escapedQuery = normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const fragments = text.split(new RegExp(`(${escapedQuery})`, "gi"));
  return <>{fragments.map((fragment, index) => fragment.toLocaleLowerCase() === normalizedQuery.toLocaleLowerCase() ? <Text key={`${fragment}-${index}`} style={[styles.captionSearchHighlight, { color }]}>{fragment}</Text> : fragment)}</>;
}

export default function VideoPlayerScreen() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const videoId = typeof params.id === "string" ? params.id : Array.isArray(params.id) ? params.id[0] : "";
  const { getVideo, preferences, updateVideoPreference, updateVideoPosition, updateVideoDuration, attachSubtitleFile, removeSubtitleFile, toggleVideoFavorite, setVideoSummary } = useVideoLibrary();
  const { stopPlaybackNow } = usePlayer();
  const { theme, t, isRTL, textScaleMultiplier, fontWeightValue, lineHeightMultiplier, readingFontFamily, interfaceDensity } = useThemeContext();
  const video = getVideo(videoId);
  const videoViewRef = useRef<VideoViewHandle>(null);
  const restoredVideoIdRef = useRef<string | null>(null);
  const persistedPositionRef = useRef(0);
  const gestureFeedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialBrightnessRef = useRef<number | null>(null);
  const appliedBrightnessRef = useRef<number | null>(null);
  const verticalGestureRef = useRef<{ kind: "brightness" | "volume"; value: number } | null>(null);
  const gestureFeedbackOpacity = useRef(new Animated.Value(0)).current;
  const gestureFeedbackScale = useRef(new Animated.Value(0.84)).current;
  const [progressWidth, setProgressWidth] = useState(0);
  const [frameWidth, setFrameWidth] = useState(0);
  const [frameHeight, setFrameHeight] = useState(0);
  const [brightnessLevel, setBrightnessLevel] = useState(0.5);
  const [volumeLevel, setVolumeLevel] = useState(1);
  const [gestureFeedback, setGestureFeedback] = useState<"backward" | "forward" | "brightness" | "volume" | null>(null);
  const [captionSettingsOpen, setCaptionSettingsOpen] = useState(false);
  const [captionSearchOpen, setCaptionSearchOpen] = useState(false);
  const [captionQuery, setCaptionQuery] = useState("");
  const [activeCaptionResultIndex, setActiveCaptionResultIndex] = useState(0);
  const [speedSettingsOpen, setSpeedSettingsOpen] = useState(false);
  const [summaryLengthSettingsOpen, setSummaryLengthSettingsOpen] = useState(false);
  const [landscapeLocked, setLandscapeLocked] = useState(false);
  const [localCues, setLocalCues] = useState<VttCue[]>([]);
  const [subtitleLoadFailed, setSubtitleLoadFailed] = useState(false);
  const [summaryIssue, setSummaryIssue] = useState(false);
  const [summaryFeedback, setSummaryFeedback] = useState<"copied" | "exportFailed" | null>(null);
  const [pipIssue, setPipIssue] = useState(false);
  const [isPipStarting, setIsPipStarting] = useState(false);
  const [pipStarted, setPipStarted] = useState(false);
  const { mutateAsync: requestVttSummary, isPending: isSummarizing } = trpc.video.summarizeCaptions.useMutation();
  const prefersReducedMotion = useReducedMotion();
  const compact = interfaceDensity === "compact";
  const direction = isRTL ? "row-reverse" : "row";
  const align = isRTL ? "right" : "left";
  const scaled = (value: number) => Math.round(value * textScaleMultiplier);
  const { width, height } = useWindowDimensions();
  const wideLayout = width > height;
  const videoGlassAccent = resolveMediaGlassAccent(undefined, theme.colors.primary, video?.thumbnailUri ?? video?.id);

  const player = useVideoPlayer(video?.localUri ?? null, (instance) => {
    instance.loop = preferences.loopEnabled;
    instance.muted = preferences.muted;
    instance.playbackRate = preferences.playbackRate;
    instance.preservesPitch = true;
    instance.timeUpdateEventInterval = 0.35;
  });
  const { isPlaying } = useEvent(player, "playingChange", { isPlaying: player.playing });
  const { status, error } = useEvent(player, "statusChange", { status: player.status, error: undefined });
  const timeUpdate = useEvent(player, "timeUpdate", { currentTime: player.currentTime, currentLiveTimestamp: null, currentOffsetFromLive: null, bufferedPosition: 0 });
  const { availableSubtitleTracks } = useEvent(player, "availableSubtitleTracksChange", { availableSubtitleTracks: player.availableSubtitleTracks });
  const duration = Number(player.duration) || video?.durationSeconds || 0;
  const position = Math.max(0, Math.min(Number(timeUpdate?.currentTime) || player.currentTime || 0, duration || Number.MAX_SAFE_INTEGER));
  const progress = duration ? Math.min(1, position / duration) : 0;
  const subtitleTracks = availableSubtitleTracks ?? [];
  const subtitleLabel = useMemo(() => video?.subtitle?.fileName ?? player.subtitleTrack?.label ?? player.subtitleTrack?.language ?? t("captionsOff"), [player.subtitleTrack?.label, player.subtitleTrack?.language, t, video?.subtitle?.fileName]);
  const activeLocalCue = preferences.captionsEnabled ? localCues.find((cue) => position >= cue.startSeconds && position < cue.endSeconds) : undefined;
  const captionSearchResults = useMemo(() => searchVttCues(localCues, captionQuery), [captionQuery, localCues]);
  const captionFontSize = scaled(CAPTION_SIZES[preferences.captionTextSize]);
  const captionPositionStyle = preferences.captionPosition === "top" ? styles.captionTop : preferences.captionPosition === "center" ? styles.captionCenter : styles.captionBottom;

  useEffect(() => { stopPlaybackNow(); }, [stopPlaybackNow]);
  useEffect(() => { player.loop = preferences.loopEnabled; }, [player, preferences.loopEnabled]);
  useEffect(() => { player.muted = preferences.muted; }, [player, preferences.muted]);
  useEffect(() => { player.playbackRate = preferences.playbackRate; }, [player, preferences.playbackRate]);
  useEffect(() => {
    if (Platform.OS === "web") return;
    let active = true;
    void Brightness.getBrightnessAsync().then((value) => {
      if (!active || !Number.isFinite(value)) return;
      const safeValue = Math.max(0, Math.min(1, value));
      initialBrightnessRef.current = safeValue;
      appliedBrightnessRef.current = safeValue;
      setBrightnessLevel(safeValue);
    }).catch(() => reportLocalDiagnostic("video_brightness_access_failed"));
    return () => {
      active = false;
      const initial = initialBrightnessRef.current;
      if (typeof initial === "number") void Brightness.setBrightnessAsync(initial).catch(() => reportLocalDiagnostic("video_brightness_access_failed"));
    };
  }, []);
  useEffect(() => {
    if (Platform.OS === "web") return;
    // Keep the rest of OmniWave portrait-first, but let the video screen follow
    // the device until the user explicitly enters or leaves a full-screen view.
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT).catch(() => reportLocalDiagnostic("video_orientation_update_failed"));
    return () => { void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => reportLocalDiagnostic("video_orientation_update_failed")); };
  }, []);
  useEffect(() => () => { if (gestureFeedbackTimerRef.current) clearTimeout(gestureFeedbackTimerRef.current); }, []);
  useEffect(() => {
    if (!gestureFeedback) return;
    gestureFeedbackOpacity.stopAnimation();
    gestureFeedbackScale.stopAnimation();
    if (prefersReducedMotion) {
      gestureFeedbackOpacity.setValue(1);
      gestureFeedbackScale.setValue(1);
      return;
    }
    gestureFeedbackOpacity.setValue(0);
    gestureFeedbackScale.setValue(0.84);
    Animated.parallel([
      Animated.timing(gestureFeedbackOpacity, { toValue: 1, duration: 140, useNativeDriver: true }),
      Animated.spring(gestureFeedbackScale, { toValue: 1, damping: 18, stiffness: 220, mass: 0.7, useNativeDriver: true }),
    ]).start();
  }, [gestureFeedback, gestureFeedbackOpacity, gestureFeedbackScale, prefersReducedMotion]);
  useEffect(() => { if (video && duration > 0) updateVideoDuration(video.id, duration); }, [duration, updateVideoDuration, video]);
  useEffect(() => {
    let active = true;
    setSubtitleLoadFailed(false);
    if (!video?.subtitle?.localUri) { setLocalCues([]); setCaptionSettingsOpen(false); setCaptionSearchOpen(false); setCaptionQuery(""); return () => { active = false; }; }
    void FileSystem.readAsStringAsync(video.subtitle.localUri, { encoding: FileSystem.EncodingType.UTF8 }).then((content) => {
      const parsed = parseWebVtt(content);
      if (!active) return;
      setLocalCues(parsed);
      setSubtitleLoadFailed(parsed.length === 0);
    }).catch(() => { if (active) { setLocalCues([]); setSubtitleLoadFailed(true); } });
    return () => { active = false; };
  }, [video?.subtitle?.localUri]);
  useEffect(() => { setActiveCaptionResultIndex(0); }, [captionQuery]);
  useEffect(() => { if (activeCaptionResultIndex >= captionSearchResults.length) setActiveCaptionResultIndex(Math.max(0, captionSearchResults.length - 1)); }, [activeCaptionResultIndex, captionSearchResults.length]);
  useEffect(() => {
    if (!video || restoredVideoIdRef.current === video.id || status !== "readyToPlay") return;
    const resumeAt = Math.max(0, Math.min(video.lastPositionSeconds, duration || video.lastPositionSeconds));
    if (resumeAt > 3) player.currentTime = resumeAt;
    persistedPositionRef.current = resumeAt;
    restoredVideoIdRef.current = video.id;
  }, [duration, player, status, video]);
  useEffect(() => {
    if (!video || position < 0 || Math.abs(position - persistedPositionRef.current) < 5) return;
    persistedPositionRef.current = position;
    updateVideoPosition(video.id, position);
  }, [position, updateVideoPosition, video]);
  useEffect(() => () => { if (video && Number.isFinite(player.currentTime)) updateVideoPosition(video.id, player.currentTime); }, [player, updateVideoPosition, video]);

  const togglePlay = () => { if (isPlaying) player.pause(); else player.play(); haptic.light(); };
  const seekBy = (seconds: number) => { player.seekBy(seconds); haptic.light(); };
  const showGestureFeedback = (kind: "backward" | "forward" | "brightness" | "volume") => {
    setGestureFeedback(kind);
    if (gestureFeedbackTimerRef.current) clearTimeout(gestureFeedbackTimerRef.current);
    gestureFeedbackTimerRef.current = setTimeout(() => setGestureFeedback(null), 650);
  };
  const handleDoubleTap = (x: number) => {
    if (!frameWidth) return;
    const isForwardSide = isRTL ? x < frameWidth / 2 : x >= frameWidth / 2;
    seekBy(isForwardSide ? 10 : -10);
    showGestureFeedback(isForwardSide ? "forward" : "backward");
  };
  const doubleTapGesture = Gesture.Tap().numberOfTaps(2).maxDuration(250).runOnJS(true).onEnd((event, success) => { if (success) handleDoubleTap(event.x); });
  const applyBrightness = (value: number) => {
    const next = Math.max(0.1, Math.min(1, value));
    setBrightnessLevel(next);
    if (Platform.OS === "web" || Math.abs((appliedBrightnessRef.current ?? next) - next) < 0.02) return;
    appliedBrightnessRef.current = next;
    void Brightness.setBrightnessAsync(next).catch(() => reportLocalDiagnostic("video_brightness_access_failed"));
  };
  const applyVolume = (value: number) => {
    const next = Math.max(0, Math.min(1, value));
    player.volume = next;
    setVolumeLevel(next);
    if (next > 0 && preferences.muted) updateVideoPreference("muted", false);
  };
  const startVerticalGesture = (x: number) => {
    const controlsBrightness = isRTL ? x >= frameWidth / 2 : x < frameWidth / 2;
    verticalGestureRef.current = controlsBrightness ? { kind: "brightness", value: brightnessLevel } : { kind: "volume", value: volumeLevel };
  };
  const updateVerticalGesture = (translationY: number) => {
    const gesture = verticalGestureRef.current;
    if (!gesture || Platform.OS === "web") return;
    const next = gesture.value - translationY / Math.max(180, frameHeight || 180);
    if (gesture.kind === "brightness") applyBrightness(next); else applyVolume(next);
    showGestureFeedback(gesture.kind);
  };
  const endVerticalGesture = () => { verticalGestureRef.current = null; };
  const verticalGesture = Gesture.Pan().minDistance(12).runOnJS(true).onBegin((event) => startVerticalGesture(event.x)).onUpdate((event) => updateVerticalGesture(event.translationY)).onEnd(endVerticalGesture).onFinalize(endVerticalGesture);
  const mediaGestures = Gesture.Simultaneous(doubleTapGesture, verticalGesture);
  const setProgressAtX = (x: number) => { if (!duration || !progressWidth) return; player.currentTime = Math.max(0, Math.min(duration, (x / progressWidth) * duration)); haptic.light(); };
  const cycleCaptions = () => {
    if (video?.subtitle) { updateVideoPreference("captionsEnabled", !preferences.captionsEnabled); haptic.selection(); return; }
    if (!preferences.captionsEnabled) { updateVideoPreference("captionsEnabled", true); player.subtitleTrack = subtitleTracks[0] ?? null; }
    else {
      const currentIndex = subtitleTracks.findIndex((track) => track.id === player.subtitleTrack?.id);
      const nextTrack = subtitleTracks[currentIndex + 1];
      if (nextTrack) player.subtitleTrack = nextTrack;
      else { player.subtitleTrack = null; updateVideoPreference("captionsEnabled", false); }
    }
    haptic.selection();
  };
  const replaceSubtitle = () => { if (video) void attachSubtitleFile(video.id); };
  const deleteSubtitle = () => { if (video) { void removeSubtitleFile(video.id); haptic.medium(); } };
  const restartVideo = () => { player.currentTime = 0; player.play(); haptic.medium(); };
  const jumpToCaptionResult = (cue: VttCue, resultIndex?: number) => { if (typeof resultIndex === "number") setActiveCaptionResultIndex(resultIndex); player.currentTime = cue.startSeconds; player.play(); haptic.selection(); };
  const moveCaptionResult = (offset: number) => { const nextIndex = activeCaptionResultIndex + offset; const cue = captionSearchResults[nextIndex]; if (!cue) return; jumpToCaptionResult(cue, nextIndex); };
  const createSummary = async () => {
    if (!video || !localCues.length) return;
    const vttText = localCues.map((cue) => cue.text).join("\n").replace(/\s+/g, " ").trim().slice(0, 24_000);
    if (!vttText) return;
    setSummaryIssue(false);
    try { const response = await requestVttSummary({ vttText, length: preferences.summaryLength }); setVideoSummary(video.id, response.summary); haptic.success(); }
    catch { setSummaryIssue(true); haptic.error(); }
  };
  const requestSummary = () => { if (!video?.subtitle || isSummarizing) return; Alert.alert(t("summarizeCaptions"), t("summaryConsent"), [{ text: t("cancel"), style: "cancel" }, { text: t("summarizeCaptions"), onPress: () => { void createSummary(); } }]); };
  const copySummary = async () => { if (!video?.summary?.text) return; setSummaryFeedback(null); try { const copied = await Clipboard.setStringAsync(video.summary.text); if (!copied) throw new Error("copy failed"); setSummaryFeedback("copied"); haptic.success(); } catch { setSummaryFeedback("exportFailed"); haptic.error(); } };
  const shareSummary = async (format: "text" | "pdf") => { if (!video?.summary?.text) return; setSummaryFeedback(null); try { await exportVideoSummary(video.title, video.summary.text, format); haptic.success(); } catch { setSummaryFeedback("exportFailed"); haptic.error(); } };
  const startPictureInPicture = () => {
    if (Platform.OS === "web" || isPipStarting) return;
    const videoView = videoViewRef.current;
    if (!videoView) { setPipIssue(true); setPipStarted(false); haptic.error(); return; }
    setPipIssue(false);
    setPipStarted(false);
    setIsPipStarting(true);
    void videoView.startPictureInPicture().then(() => { setPipStarted(true); haptic.success(); }).catch(() => { setPipIssue(true); setPipStarted(false); haptic.error(); }).finally(() => { setIsPipStarting(false); });
  };
  const restorePortrait = () => {
    if (Platform.OS === "web") return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).then(() => setLandscapeLocked(false)).catch(() => { reportLocalDiagnostic("video_orientation_update_failed"); setLandscapeLocked(false); });
  };
  const toggleLandscape = () => {
    if (Platform.OS === "web") { void videoViewRef.current?.enterFullscreen(); return; }
    if (wideLayout || landscapeLocked) { restorePortrait(); return; }
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).then(() => { setLandscapeLocked(true); haptic.medium(); }).catch(() => { reportLocalDiagnostic("video_orientation_update_failed"); setLandscapeLocked(false); haptic.error(); });
  };
  const enterFullscreen = () => {
    const videoView = videoViewRef.current;
    if (!videoView) return;
    if (Platform.OS === "web") { void videoView.enterFullscreen(); return; }
    void videoView.enterFullscreen()
      .then(() => ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE))
      .then(() => { setLandscapeLocked(true); haptic.medium(); })
      .catch(() => {
        // The visible landscape control remains a safe native fallback if a
        // manufacturer implementation declines the full-screen transition.
        toggleLandscape();
      });
  };

  if (!video) return <ScreenContainer className="px-5"><View style={styles.unavailable}><View style={[styles.unavailableIcon, { backgroundColor: `${theme.colors.accent}18` }]}><MaterialIcons name="videocam-off" size={34} color={theme.colors.accent} /></View><Text style={[styles.unavailableTitle, { color: theme.colors.text, textAlign: align, fontSize: scaled(19), lineHeight: Math.round(scaled(25) * lineHeightMultiplier), fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{t("videoUnavailable")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("videoLibrary")} onPress={() => router.replace("/(tabs)/videos" as never)} style={[styles.libraryButton, { backgroundColor: theme.colors.primary }]}><Text style={[styles.libraryButtonText, { color: theme.colors.onPrimary, fontFamily: readingFontFamily }]}>{t("videoLibrary")}</Text></Pressable></View></ScreenContainer>;

  return <ScreenContainer edges={wideLayout ? ["top", "bottom", "left", "right"] : ["top", "left", "right"]} className={wideLayout ? "" : "px-5"}><PrismBackdrop accent={videoGlassAccent} accentSeed={video?.thumbnailUri ?? video?.id} /><View style={[styles.screen, wideLayout && styles.wideScreen]}>
    {!wideLayout ? <View style={[styles.header, { flexDirection: direction }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("close")} onPress={() => router.back()} style={[styles.headerButton, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}><MaterialIcons name={isRTL ? "arrow-forward" : "arrow-back"} size={21} color={theme.colors.text} /></Pressable>
      <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.colors.text, textAlign: align, fontSize: scaled(13), lineHeight: Math.round(scaled(18) * lineHeightMultiplier), fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{t("videoPlayer")}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={t("fullscreen")} onPress={enterFullscreen} style={[styles.headerButton, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}><MaterialIcons name="fullscreen" size={21} color={theme.colors.text} /></Pressable>
    </View> : null}
    <View onLayout={(event) => { setFrameWidth(event.nativeEvent.layout.width); setFrameHeight(event.nativeEvent.layout.height); }} style={[styles.videoFrame, compact && styles.videoFrameCompact, wideLayout && styles.wideVideoFrame, { backgroundColor: "#000000", borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}>
      <GestureDetector gesture={mediaGestures}><View collapsable={false} style={styles.videoGestureSurface}><VideoView ref={videoViewRef} player={player} style={styles.video} nativeControls={false} contentFit={wideLayout ? "cover" : "contain"} allowsFullscreen fullscreenOptions={{ enable: true }} allowsPictureInPicture={Platform.OS !== "web"} surfaceType="textureView" onFullscreenEnter={() => { if (Platform.OS !== "web") { void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE).then(() => setLandscapeLocked(true)).catch(() => { reportLocalDiagnostic("video_orientation_update_failed"); setLandscapeLocked(false); }); return; } setLandscapeLocked(true); }} onFullscreenExit={restorePortrait} /></View></GestureDetector>
      <View pointerEvents="none" style={styles.videoOverlay}>
        {status === "loading" ? <View style={styles.loadingPill}><MaterialIcons name="hourglass-top" size={18} color="#FFFFFF" /><Text style={styles.loadingText}>{t("videoImporting")}</Text></View> : null}
        {activeLocalCue ? <View style={[styles.captionShell, captionPositionStyle, { backgroundColor: CAPTION_BACKGROUNDS[preferences.captionBackground] }]}><Text style={[styles.captionText, { color: CAPTION_COLORS[preferences.captionTextColor], textAlign: "center", fontSize: captionFontSize, lineHeight: Math.round(captionFontSize * lineHeightMultiplier * 1.25), fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{activeLocalCue.text}</Text></View> : null}
        {gestureFeedback ? <Animated.View style={[styles.gestureFeedback, gestureFeedback === "forward" || gestureFeedback === "volume" ? styles.gestureFeedbackForward : styles.gestureFeedbackBackward, { opacity: gestureFeedbackOpacity, transform: [{ scale: gestureFeedbackScale }] }]}><MaterialIcons name={gestureFeedback === "forward" ? "forward-10" : gestureFeedback === "backward" ? "replay-10" : gestureFeedback === "brightness" ? "brightness-6" : "volume-up"} size={24} color="#FFFFFF" /><Text style={styles.gestureFeedbackText}>{gestureFeedback === "forward" ? "+10" : gestureFeedback === "backward" ? "−10" : `${Math.round((gestureFeedback === "brightness" ? brightnessLevel : volumeLevel) * 100)}%`}</Text></Animated.View> : null}
      </View>
    </View>
    {wideLayout ? <View style={[styles.wideQuickControls, { flexDirection: direction }]}><Pressable accessibilityRole="button" accessibilityLabel={t("close")} onPress={() => router.back()} style={[styles.wideControl, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder }]}><MaterialIcons name="close" size={23} color={theme.colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? t("pause") : t("play")} onPress={togglePlay} style={[styles.wideControl, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}><MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={24} color={theme.colors.onPrimary} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("portraitVideo")} onPress={toggleLandscape} style={[styles.wideControl, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder }]}><MaterialIcons name="screen-rotation" size={23} color={theme.colors.text} /></Pressable></View> : <View style={styles.copy}><Text numberOfLines={2} style={[styles.title, { color: theme.colors.text, textAlign: align, fontSize: scaled(22), lineHeight: Math.round(scaled(29) * lineHeightMultiplier), fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{video.title}</Text><Text style={[styles.detail, { color: theme.colors.muted, textAlign: align, fontSize: scaled(12), lineHeight: Math.round(scaled(17) * lineHeightMultiplier), fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{t("videoLocalOnly")}</Text></View>}
    {!wideLayout ? <>
    {status === "error" || error ? <View style={[styles.errorCard, { backgroundColor: `${theme.colors.accent}12`, borderColor: theme.colors.accent, flexDirection: direction }]}><MaterialIcons name="error-outline" size={19} color={theme.colors.accent} /><Text style={[styles.errorText, { color: theme.colors.text, textAlign: align, fontSize: scaled(12), lineHeight: Math.round(scaled(17) * lineHeightMultiplier), fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{t("videoPlaybackFailed")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("retry")} onPress={restartVideo} style={[styles.errorRetry, { backgroundColor: theme.colors.surfaceMuted }]}><Text style={[styles.errorRetryText, { color: theme.colors.primary, fontFamily: readingFontFamily }]}>{t("retry")}</Text></Pressable></View> : null}
    {subtitleLoadFailed ? <View style={[styles.errorCard, { backgroundColor: `${theme.colors.accent}12`, borderColor: theme.colors.accent, flexDirection: direction }]}><MaterialIcons name="closed-caption-off" size={19} color={theme.colors.accent} /><Text style={[styles.errorText, { color: theme.colors.text, textAlign: align, fontSize: scaled(12), lineHeight: Math.round(scaled(17) * lineHeightMultiplier), fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}>{t("subtitleUnsupported")}</Text></View> : null}
    <Pressable accessibilityRole="adjustable" accessibilityLabel={t("playback")} accessibilityValue={{ min: 0, max: duration, now: position, text: `${formatTime(position)} / ${formatTime(duration)}` }} onLayout={(event) => setProgressWidth(event.nativeEvent.layout.width)} onPress={(event) => setProgressAtX(event.nativeEvent.locationX)} style={[styles.progressTouch, { backgroundColor: theme.colors.border }]}><View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: theme.colors.primary }]}><View style={[styles.progressThumb, { backgroundColor: theme.colors.primary }]} /></View></Pressable>
    <View style={[styles.timeRow, { flexDirection: direction }]}><Text style={[styles.time, { color: theme.colors.muted, fontFamily: readingFontFamily }]}>{formatTime(position)}</Text><Text style={[styles.time, { color: theme.colors.muted, fontFamily: readingFontFamily }]}>{formatTime(duration)}</Text></View>
    <View style={[styles.transport, { flexDirection: direction }]}><Pressable accessibilityRole="button" accessibilityLabel={t("seekBackward30")} onPress={() => seekBy(-30)} style={[styles.jumpButton, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}><MaterialIcons name="replay-30" size={21} color={theme.colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("seekBackward")} onPress={() => seekBy(-10)} style={[styles.jumpButton, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}><MaterialIcons name="replay-10" size={22} color={theme.colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? t("pause") : t("play")} onPress={togglePlay} style={[styles.playButton, { backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary }]}><MaterialIcons name={isPlaying ? "pause" : "play-arrow"} size={36} color={theme.colors.onPrimary} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("seekForward")} onPress={() => seekBy(10)} style={[styles.jumpButton, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}><MaterialIcons name="forward-10" size={22} color={theme.colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("seekForward30")} onPress={() => seekBy(30)} style={[styles.jumpButton, { backgroundColor: theme.colors.glassStrong, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}><MaterialIcons name="forward-30" size={21} color={theme.colors.text} /></Pressable></View>
    <View style={[styles.gestureControls, { flexDirection: direction }]}><Pressable accessibilityRole="adjustable" accessibilityLabel={t("videoBrightness")} accessibilityHint={t("videoBrightnessHint")} accessibilityValue={{ min: 0, max: 100, now: Math.round(brightnessLevel * 100), text: `${Math.round(brightnessLevel * 100)}%` }} onPress={() => applyBrightness(brightnessLevel >= 0.95 ? 0.5 : brightnessLevel + 0.1)} style={[styles.gestureControl, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}><MaterialIcons name="brightness-6" size={17} color={theme.colors.primary} /><Text style={[styles.gestureControlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{t("videoBrightness")} {Math.round(brightnessLevel * 100)}%</Text></Pressable><Pressable accessibilityRole="adjustable" accessibilityLabel={t("videoVolume")} accessibilityHint={t("videoVolumeHint")} accessibilityValue={{ min: 0, max: 100, now: Math.round(volumeLevel * 100), text: `${Math.round(volumeLevel * 100)}%` }} onPress={() => applyVolume(volumeLevel >= 0.95 ? 0.5 : volumeLevel + 0.1)} style={[styles.gestureControl, { backgroundColor: theme.colors.glass, borderColor: theme.colors.glassBorder, shadowColor: theme.colors.shadow }]}><MaterialIcons name="volume-up" size={17} color={theme.colors.primary} /><Text style={[styles.gestureControlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{t("videoVolume")} {Math.round(volumeLevel * 100)}%</Text></Pressable></View>
    <View style={[styles.toolsHeading, { flexDirection: direction }]}><MaterialIcons name="tune" size={18} color={theme.colors.primary} /><Text style={[styles.toolsHeadingText, { color: theme.colors.text, textAlign: align, fontFamily: readingFontFamily }]}>{t("tools")}</Text></View>
    <View style={[styles.controlGrid, { flexDirection: direction }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={t("playbackSpeed")} accessibilityState={{ expanded: speedSettingsOpen }} onPress={() => setSpeedSettingsOpen((open) => !open)} style={[styles.controlChip, { borderColor: speedSettingsOpen || preferences.playbackRate !== 1 ? theme.colors.primary : theme.colors.border, backgroundColor: speedSettingsOpen || preferences.playbackRate !== 1 ? `${theme.colors.primary}14` : theme.colors.surface }]}><MaterialIcons name="speed" size={17} color={theme.colors.primary} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{preferences.playbackRate}×</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={t("restartVideo")} onPress={restartVideo} style={[styles.controlChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}><MaterialIcons name="restart-alt" size={17} color={theme.colors.muted} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{t("restartVideo")}</Text></Pressable>
      <Pressable accessibilityRole="switch" accessibilityLabel={t("favorites")} accessibilityState={{ checked: video.isFavorite }} onPress={() => toggleVideoFavorite(video.id)} style={[styles.controlChip, { borderColor: video.isFavorite ? theme.colors.accent : theme.colors.border, backgroundColor: video.isFavorite ? `${theme.colors.accent}14` : theme.colors.surface }]}><MaterialIcons name={video.isFavorite ? "favorite" : "favorite-border"} size={17} color={video.isFavorite ? theme.colors.accent : theme.colors.muted} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{t("favorites")}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={landscapeLocked ? t("portraitVideo") : t("landscapeVideo")} onPress={toggleLandscape} style={[styles.controlChip, { borderColor: landscapeLocked ? theme.colors.primary : theme.colors.border, backgroundColor: landscapeLocked ? `${theme.colors.primary}14` : theme.colors.surface }]}><MaterialIcons name="screen-rotation" size={17} color={landscapeLocked ? theme.colors.primary : theme.colors.muted} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{landscapeLocked ? t("portraitVideo") : t("landscapeVideo")}</Text></Pressable>
      <Pressable accessibilityRole="switch" accessibilityLabel={t("repeat")} accessibilityState={{ checked: preferences.loopEnabled }} onPress={() => updateVideoPreference("loopEnabled", !preferences.loopEnabled)} style={[styles.controlChip, { borderColor: preferences.loopEnabled ? theme.colors.primary : theme.colors.border, backgroundColor: preferences.loopEnabled ? `${theme.colors.primary}14` : theme.colors.surface }]}><MaterialIcons name="repeat" size={17} color={preferences.loopEnabled ? theme.colors.primary : theme.colors.muted} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{t("repeat")}</Text></Pressable>
      <Pressable accessibilityRole="switch" accessibilityLabel={preferences.muted ? t("unmute") : t("mute")} accessibilityState={{ checked: preferences.muted }} onPress={() => updateVideoPreference("muted", !preferences.muted)} style={[styles.controlChip, { borderColor: preferences.muted ? theme.colors.primary : theme.colors.border, backgroundColor: preferences.muted ? `${theme.colors.primary}14` : theme.colors.surface }]}><MaterialIcons name={preferences.muted ? "volume-off" : "volume-up"} size={17} color={preferences.muted ? theme.colors.primary : theme.colors.muted} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{preferences.muted ? t("unmute") : t("mute")}</Text></Pressable>
      <Pressable accessibilityRole="switch" accessibilityLabel={t("captions")} accessibilityState={{ checked: preferences.captionsEnabled }} onPress={cycleCaptions} style={[styles.controlChip, { borderColor: preferences.captionsEnabled ? theme.colors.primary : theme.colors.border, backgroundColor: preferences.captionsEnabled ? `${theme.colors.primary}14` : theme.colors.surface }]}><MaterialIcons name="closed-caption" size={17} color={preferences.captionsEnabled ? theme.colors.primary : theme.colors.muted} /><Text numberOfLines={1} style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{preferences.captionsEnabled ? subtitleLabel : t("captions")}</Text></Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={video.subtitle ? t("replaceSubtitle") : t("chooseSubtitle")} accessibilityHint={t("subtitleFileLimit")} onPress={replaceSubtitle} style={[styles.controlChip, { borderColor: video.subtitle ? theme.colors.primary : theme.colors.border, backgroundColor: video.subtitle ? `${theme.colors.primary}14` : theme.colors.surface }]}><MaterialIcons name={video.subtitle ? "swap-horiz" : "upload-file"} size={17} color={video.subtitle ? theme.colors.primary : theme.colors.muted} /><Text numberOfLines={1} style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{video.subtitle ? t("replaceSubtitle") : t("chooseSubtitle")}</Text></Pressable>
      {video.subtitle ? <Pressable accessibilityRole="button" accessibilityLabel={t("removeSubtitle")} onPress={deleteSubtitle} style={[styles.controlChip, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}><MaterialIcons name="delete-outline" size={17} color={theme.colors.muted} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{t("removeSubtitle")}</Text></Pressable> : null}
      {video.subtitle ? <Pressable accessibilityRole="button" accessibilityLabel={t("subtitleAppearance")} accessibilityState={{ expanded: captionSettingsOpen }} onPress={() => setCaptionSettingsOpen((open) => !open)} style={[styles.controlChip, { borderColor: captionSettingsOpen ? theme.colors.primary : theme.colors.border, backgroundColor: captionSettingsOpen ? `${theme.colors.primary}14` : theme.colors.surface }]}><MaterialIcons name="format-size" size={17} color={captionSettingsOpen ? theme.colors.primary : theme.colors.muted} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{t("subtitleAppearance")}</Text></Pressable> : null}
      {video.subtitle ? <Pressable accessibilityRole="button" accessibilityLabel={t("searchCaptions")} accessibilityState={{ expanded: captionSearchOpen }} onPress={() => setCaptionSearchOpen((open) => !open)} style={[styles.controlChip, { borderColor: captionSearchOpen ? theme.colors.primary : theme.colors.border, backgroundColor: captionSearchOpen ? `${theme.colors.primary}14` : theme.colors.surface }]}><MaterialIcons name="find-in-page" size={17} color={captionSearchOpen ? theme.colors.primary : theme.colors.muted} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{t("searchCaptions")}</Text></Pressable> : null}
      {video.subtitle ? <Pressable accessibilityRole="button" accessibilityLabel={t("summarizeCaptions")} accessibilityHint={t("summaryConsent")} accessibilityState={{ busy: isSummarizing }} disabled={isSummarizing || !localCues.length} onPress={requestSummary} style={[styles.controlChip, { borderColor: isSummarizing ? theme.colors.primary : theme.colors.border, backgroundColor: isSummarizing ? `${theme.colors.primary}14` : theme.colors.surface, opacity: !localCues.length ? 0.55 : 1 }]}><MaterialIcons name="summarize" size={17} color={isSummarizing ? theme.colors.primary : theme.colors.muted} /><Text numberOfLines={1} style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{isSummarizing ? t("summaryLoading") : t("summarizeCaptions")}</Text></Pressable> : null}
      {video.subtitle ? <Pressable accessibilityRole="button" accessibilityLabel={t("summaryLength")} accessibilityState={{ expanded: summaryLengthSettingsOpen }} onPress={() => setSummaryLengthSettingsOpen((open) => !open)} style={[styles.controlChip, { borderColor: summaryLengthSettingsOpen ? theme.colors.primary : theme.colors.border, backgroundColor: summaryLengthSettingsOpen ? `${theme.colors.primary}14` : theme.colors.surface }]}><MaterialIcons name="format-align-left" size={17} color={summaryLengthSettingsOpen ? theme.colors.primary : theme.colors.muted} /><Text numberOfLines={1} style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{preferences.summaryLength === "short" ? t("summaryLengthShort") : preferences.summaryLength === "detailed" ? t("summaryLengthDetailed") : t("summaryLengthMedium")}</Text></Pressable> : null}
      {Platform.OS !== "web" ? <Pressable accessibilityRole="button" accessibilityLabel={t("pictureInPicture")} accessibilityHint={t("pictureInPictureHint")} accessibilityState={{ busy: isPipStarting, selected: pipStarted, disabled: isPipStarting }} disabled={isPipStarting} onPress={startPictureInPicture} style={[styles.controlChip, { borderColor: pipStarted || isPipStarting ? theme.colors.primary : theme.colors.border, backgroundColor: pipStarted || isPipStarting ? `${theme.colors.primary}14` : theme.colors.surface, opacity: isPipStarting ? 0.7 : 1 }]}><MaterialIcons name={pipStarted ? "picture-in-picture" : "picture-in-picture-alt"} size={17} color={pipStarted || isPipStarting ? theme.colors.primary : theme.colors.muted} /><Text style={[styles.controlText, { color: theme.colors.text, fontFamily: readingFontFamily }]}>{isPipStarting ? t("pictureInPictureStarting") : pipStarted ? t("pictureInPictureActive") : t("pictureInPicture")}</Text></Pressable> : null}
    </View>
    {speedSettingsOpen ? <View style={[styles.captionSettings, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[styles.captionSettingsTitle, { color: theme.colors.text, textAlign: align, fontFamily: readingFontFamily }]}>{t("playbackSpeed")}</Text><View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{PLAYBACK_RATES.map((rate) => <CaptionChoice key={rate} label={`${rate}×`} selected={preferences.playbackRate === rate} onPress={() => { updateVideoPreference("playbackRate", rate); setSpeedSettingsOpen(false); haptic.selection(); }} />)}</View></View> : null}
    {video.subtitle && summaryLengthSettingsOpen ? <View style={[styles.captionSettings, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[styles.captionSettingsTitle, { color: theme.colors.text, textAlign: align, fontFamily: readingFontFamily }]}>{t("summaryLength")}</Text><View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{(["short", "medium", "detailed"] as VideoSummaryLength[]).map((length) => <CaptionChoice key={length} label={length === "short" ? t("summaryLengthShort") : length === "detailed" ? t("summaryLengthDetailed") : t("summaryLengthMedium")} selected={preferences.summaryLength === length} onPress={() => { updateVideoPreference("summaryLength", length); setSummaryLengthSettingsOpen(false); haptic.selection(); }} />)}</View></View> : null}
    {video.subtitle && captionSearchOpen ? <View style={[styles.captionSettings, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><Text style={[styles.captionSettingsTitle, { color: theme.colors.text, textAlign: align, fontFamily: readingFontFamily }]}>{t("searchCaptions")}</Text><Text style={[styles.captionSettingsLabel, { color: theme.colors.muted, textAlign: align, fontFamily: readingFontFamily, marginTop: 4 }]}>{t("searchCaptionsHint")}</Text><View style={[styles.captionSearchField, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border, flexDirection: direction }]}><MaterialIcons name="search" size={19} color={theme.colors.muted} /><TextInput value={captionQuery} onChangeText={setCaptionQuery} maxLength={120} placeholder={t("searchCaptions")} placeholderTextColor={theme.colors.muted} accessibilityLabel={t("searchCaptions")} returnKeyType="search" style={[styles.captionSearchInput, { color: theme.colors.text, textAlign: align, fontWeight: fontWeightValue, fontFamily: readingFontFamily }]} /></View>{captionQuery.trim() ? captionSearchResults.length ? <><View style={[styles.choiceRow, { flexDirection: direction, justifyContent: "space-between", marginTop: 10 }]}><Pressable accessibilityRole="button" accessibilityLabel={t("captionPreviousResult")} accessibilityState={{ disabled: activeCaptionResultIndex === 0 }} disabled={activeCaptionResultIndex === 0} onPress={() => moveCaptionResult(-1)} style={({ pressed }) => [styles.captionChoice, { opacity: activeCaptionResultIndex === 0 ? 0.45 : 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }, pressed && styles.pressed]}><MaterialIcons name="navigate-before" size={18} color={theme.colors.primary} /><Text style={[styles.choiceText, { color: theme.colors.text }]}>{t("captionPreviousResult")}</Text></Pressable><Text style={[styles.choiceText, { color: theme.colors.muted, alignSelf: "center" }]}>{activeCaptionResultIndex + 1}/{captionSearchResults.length}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("captionNextResult")} accessibilityState={{ disabled: activeCaptionResultIndex === captionSearchResults.length - 1 }} disabled={activeCaptionResultIndex === captionSearchResults.length - 1} onPress={() => moveCaptionResult(1)} style={({ pressed }) => [styles.captionChoice, { opacity: activeCaptionResultIndex === captionSearchResults.length - 1 ? 0.45 : 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }, pressed && styles.pressed]}><Text style={[styles.choiceText, { color: theme.colors.text }]}>{t("captionNextResult")}</Text><MaterialIcons name="navigate-next" size={18} color={theme.colors.primary} /></Pressable></View><View style={styles.captionResults}>{captionSearchResults.map((cue, index) => <Pressable key={`${cue.index}-${cue.startSeconds}`} accessibilityRole="button" accessibilityLabel={`${formatTime(cue.startSeconds)}. ${cue.text}`} accessibilityHint={t("resumeVideo")} onPress={() => jumpToCaptionResult(cue, index)} style={({ pressed }) => [styles.captionResult, { backgroundColor: index === activeCaptionResultIndex ? `${theme.colors.primary}12` : theme.colors.surfaceMuted, borderColor: index === activeCaptionResultIndex ? theme.colors.primary : theme.colors.border, flexDirection: direction }, pressed && styles.pressed]}><View style={[styles.captionResultTime, { backgroundColor: `${theme.colors.primary}18` }]}><Text style={[styles.captionResultTimeText, { color: theme.colors.primary }]}>{formatTime(cue.startSeconds)}</Text></View><Text numberOfLines={2} style={[styles.captionResultText, { color: theme.colors.text, textAlign: align, fontWeight: fontWeightValue, fontFamily: readingFontFamily }]}><HighlightedCaption text={cue.text} query={captionQuery} color={theme.colors.primary} /></Text><MaterialIcons name={isRTL ? "chevron-left" : "chevron-right"} size={18} color={theme.colors.muted} /></Pressable>)}</View></> : <Text style={[styles.captionSearchEmpty, { color: theme.colors.muted, textAlign: align, fontFamily: readingFontFamily }]}>{t("captionSearchEmpty")}</Text> : null}</View> : null}
    {video.summary ? <View style={[styles.captionSettings, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}><View style={[styles.choiceRow, { flexDirection: direction, justifyContent: "space-between" }]}><Text style={[styles.captionSettingsTitle, { color: theme.colors.text, textAlign: align, fontFamily: readingFontFamily }]}>{t("summarySection")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("removeSummary")} onPress={() => setVideoSummary(video.id, null)} style={[styles.captionChoice, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }]}><MaterialIcons name="delete-outline" size={17} color={theme.colors.muted} /><Text style={[styles.choiceText, { color: theme.colors.muted }]}>{t("remove")}</Text></Pressable></View><Text style={[styles.captionSearchEmpty, { color: theme.colors.text, textAlign: align, fontFamily: readingFontFamily, fontWeight: fontWeightValue }]}>{video.summary.text}</Text><View style={[styles.choiceRow, { flexDirection: direction, marginTop: 12 }]}><Pressable accessibilityRole="button" accessibilityLabel={t("copySummary")} onPress={() => { void copySummary(); }} style={[styles.captionChoice, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }]}><MaterialIcons name="content-copy" size={17} color={theme.colors.muted} /><Text style={[styles.choiceText, { color: theme.colors.text }]}>{t("copySummary")}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("exportSummaryText")} onPress={() => { void shareSummary("text"); }} style={[styles.captionChoice, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }]}><MaterialIcons name="description" size={17} color={theme.colors.muted} /><Text style={[styles.choiceText, { color: theme.colors.text }]}>{t("exportSummaryText")}</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={t("exportSummaryPdf")} onPress={() => { void shareSummary("pdf"); }} style={[styles.captionChoice, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceMuted }]}><MaterialIcons name="picture-as-pdf" size={17} color={theme.colors.muted} /><Text style={[styles.choiceText, { color: theme.colors.text }]}>{t("exportSummaryPdf")}</Text></Pressable></View>{summaryFeedback === "copied" ? <Text style={[styles.captionSearchEmpty, { color: theme.colors.primary, textAlign: align, fontFamily: readingFontFamily }]}>{t("summaryCopied")}</Text> : summaryFeedback === "exportFailed" ? <Text style={[styles.captionSearchEmpty, { color: theme.colors.accent, textAlign: align, fontFamily: readingFontFamily }]}>{t("summaryExportFailed")}</Text> : null}</View> : null}
    {summaryIssue ? <View style={[styles.errorCard, { backgroundColor: `${theme.colors.accent}12`, borderColor: theme.colors.accent, flexDirection: direction }]}><MaterialIcons name="error-outline" size={19} color={theme.colors.accent} /><Text style={[styles.errorText, { color: theme.colors.text, textAlign: align, fontFamily: readingFontFamily }]}>{t("summaryUnavailable")}</Text></View> : null}
    {pipIssue ? <View style={[styles.errorCard, { backgroundColor: `${theme.colors.accent}12`, borderColor: theme.colors.accent, flexDirection: direction }]}><MaterialIcons name="picture-in-picture-alt" size={19} color={theme.colors.accent} /><Text style={[styles.errorText, { color: theme.colors.text, textAlign: align, fontFamily: readingFontFamily }]}>{t("pictureInPictureUnavailable")}</Text></View> : null}
    {video.subtitle && captionSettingsOpen ? <View style={[styles.captionSettings, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={[styles.captionSettingsTitle, { color: theme.colors.text, textAlign: align, fontFamily: readingFontFamily }]}>{t("subtitleAppearance")}</Text>
      <Text style={[styles.captionSettingsLabel, { color: theme.colors.muted, textAlign: align, fontFamily: readingFontFamily }]}>{t("captionTextSize")}</Text>
      <View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{(["small", "standard", "large"] as VideoCaptionTextSize[]).map((size) => <CaptionChoice key={size} label={size === "small" ? t("captionSizeSmall") : size === "large" ? t("captionSizeLarge") : t("captionSizeStandard")} selected={preferences.captionTextSize === size} onPress={() => { updateVideoPreference("captionTextSize", size); haptic.selection(); }} />)}</View>
      <Text style={[styles.captionSettingsLabel, { color: theme.colors.muted, textAlign: align, fontFamily: readingFontFamily }]}>{t("captionTextColor")}</Text>
      <View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{(["white", "yellow", "cyan"] as VideoCaptionTextColor[]).map((color) => <CaptionChoice key={color} color={CAPTION_COLORS[color]} label={color === "white" ? t("captionColorWhite") : color === "yellow" ? t("captionColorYellow") : t("captionColorCyan")} selected={preferences.captionTextColor === color} onPress={() => { updateVideoPreference("captionTextColor", color); haptic.selection(); }} />)}</View>
      <Text style={[styles.captionSettingsLabel, { color: theme.colors.muted, textAlign: align, fontFamily: readingFontFamily }]}>{t("captionPosition")}</Text>
      <View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{(["top", "center", "bottom"] as VideoCaptionPosition[]).map((positionOption) => <CaptionChoice key={positionOption} label={positionOption === "top" ? t("captionPositionTop") : positionOption === "center" ? t("captionPositionCenter") : t("captionPositionBottom")} selected={preferences.captionPosition === positionOption} onPress={() => { updateVideoPreference("captionPosition", positionOption); haptic.selection(); }} />)}</View>
      <Text style={[styles.captionSettingsLabel, { color: theme.colors.muted, textAlign: align, fontFamily: readingFontFamily }]}>{t("captionBackground")}</Text>
      <View accessibilityRole="radiogroup" style={[styles.choiceRow, { flexDirection: direction }]}>{(["none", "black", "indigo"] as VideoCaptionBackground[]).map((background) => <CaptionChoice key={background} color={CAPTION_BACKGROUNDS[background] === "transparent" ? undefined : CAPTION_BACKGROUNDS[background]} label={background === "none" ? t("captionBackgroundNone") : background === "black" ? t("captionBackgroundBlack") : t("captionBackgroundIndigo")} selected={preferences.captionBackground === background} onPress={() => { updateVideoPreference("captionBackground", background); haptic.selection(); }} />)}</View>
    </View> : null}
    </> : null}
  </View></ScreenContainer>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: 10, paddingBottom: 12 }, wideScreen: { paddingTop: 0, paddingBottom: 0 }, header: { alignItems: "center", justifyContent: "space-between", minHeight: 44 }, headerButton: { width: 42, height: 42, borderRadius: 15, borderWidth: 1, alignItems: "center", justifyContent: "center" }, headerTitle: { flex: 1, marginHorizontal: 12, fontSize: 13, lineHeight: 18, fontWeight: "900" }, videoFrame: { width: "100%", aspectRatio: 16 / 9, borderRadius: 24, overflow: "hidden", marginTop: 16, borderWidth: 1 }, wideVideoFrame: { flex: 1, width: "100%", aspectRatio: undefined, marginTop: 0, borderRadius: 0, borderWidth: 0 }, videoFrameCompact: { marginTop: 10, borderRadius: 20 }, videoGestureSurface: { width: "100%", height: "100%" }, video: { width: "100%", height: "100%" }, videoOverlay: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }, loadingPill: { borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: "#000000B3" }, loadingText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" }, gestureFeedback: { position: "absolute", top: "42%", width: 72, height: 72, borderRadius: 36, backgroundColor: "#000000A6", alignItems: "center", justifyContent: "center" }, gestureFeedbackBackward: { left: 26 }, gestureFeedbackForward: { right: 26 }, gestureFeedbackText: { color: "#FFFFFF", fontSize: 12, fontWeight: "900", marginTop: 1 }, captionShell: { position: "absolute", left: 16, right: 16, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 }, captionTop: { top: 14 }, captionCenter: { top: "50%", transform: [{ translateY: -28 }] }, captionBottom: { bottom: 14 }, captionText: { fontSize: 14, lineHeight: 20, fontWeight: "800" }, wideQuickControls: { position: "absolute", top: 12, right: 14, gap: 8 }, wideControl: { width: 44, height: 44, borderRadius: 15, alignItems: "center", justifyContent: "center" }, copy: { marginTop: 16 }, title: { fontSize: 22, lineHeight: 29, fontWeight: "900" }, detail: { marginTop: 4, fontSize: 12, lineHeight: 17 }, errorCard: { marginTop: 12, padding: 10, borderRadius: 15, borderWidth: 1, alignItems: "center", gap: 8 }, errorText: { flex: 1, fontSize: 12, lineHeight: 17 }, errorRetry: { minHeight: 34, paddingHorizontal: 10, borderRadius: 11, alignItems: "center", justifyContent: "center" }, errorRetryText: { fontSize: 11, fontWeight: "900" }, progressTouch: { height: 6, borderRadius: 4, marginTop: 22, justifyContent: "center" }, progressFill: { height: "100%", borderRadius: 4, position: "relative" }, progressThumb: { position: "absolute", right: -6, top: -4, width: 14, height: 14, borderRadius: 7 }, timeRow: { justifyContent: "space-between", marginTop: 7 }, time: { fontSize: 11, fontVariant: ["tabular-nums"] }, transport: { alignItems: "center", justifyContent: "center", gap: 8, marginTop: 12 }, jumpButton: { width: 42, height: 42, borderRadius: 15, alignItems: "center", justifyContent: "center" }, transportButton: { width: 50, height: 50, borderRadius: 18, alignItems: "center", justifyContent: "center" }, playButton: { width: 66, height: 66, borderRadius: 24, alignItems: "center", justifyContent: "center" }, gestureControls: { gap: 8, marginTop: 12 }, gestureControl: { flex: 1, minHeight: 42, borderWidth: 1, borderRadius: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 9 }, gestureControlText: { fontSize: 10, fontWeight: "800" }, toolsHeading: { alignItems: "center", gap: 7, marginTop: 18 }, toolsHeadingText: { fontSize: 13, lineHeight: 18, fontWeight: "900" }, controlGrid: { flexWrap: "wrap", justifyContent: "center", gap: 8, marginTop: 10 }, controlChip: { height: 40, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, paddingHorizontal: 10, maxWidth: 168 }, controlText: { fontSize: 11, fontWeight: "800" }, captionSettings: { marginTop: 12, padding: 14, borderWidth: 1, borderRadius: 20 }, captionSettingsTitle: { fontSize: 15, fontWeight: "900" }, captionSettingsLabel: { marginTop: 12, marginBottom: 7, fontSize: 12, fontWeight: "700" }, captionSearchField: { minHeight: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 11, alignItems: "center", gap: 8, marginTop: 10 }, captionSearchInput: { flex: 1, paddingVertical: 0, fontSize: 13 }, captionResults: { gap: 8, marginTop: 10 }, captionResult: { minHeight: 52, borderWidth: 1, borderRadius: 14, alignItems: "center", gap: 8, padding: 8 }, captionResultTime: { minWidth: 44, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 }, captionResultTimeText: { fontSize: 10, fontWeight: "900", fontVariant: ["tabular-nums"] }, captionResultText: { flex: 1, minWidth: 0, fontSize: 12, lineHeight: 17 }, captionSearchHighlight: { fontWeight: "900", textDecorationLine: "underline" }, captionSearchEmpty: { marginTop: 12, fontSize: 12, lineHeight: 17 }, choiceRow: { flexWrap: "wrap", gap: 8 }, captionChoice: { minHeight: 38, borderWidth: 1, borderRadius: 13, paddingHorizontal: 10, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6 }, colorDot: { width: 14, height: 14, borderRadius: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: "#00000055" }, choiceText: { fontSize: 12, fontWeight: "800" }, unavailable: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 }, unavailableIcon: { width: 68, height: 68, borderRadius: 24, alignItems: "center", justifyContent: "center", marginBottom: 14 }, unavailableTitle: { fontSize: 19, lineHeight: 25, fontWeight: "900" }, libraryButton: { marginTop: 18, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 15 }, libraryButtonText: { fontSize: 13, fontWeight: "900" }, pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },
});
