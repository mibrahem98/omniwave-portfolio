import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { PixelRatio, Platform, Share, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import type { RefObject } from "react";

import type { ListeningHistoryEntry, Track } from "@/lib/omniwave/types";

function safeText(value: string, maxLength: number) { return value.replace(/[\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength); }
export const HISTORY_EXPORT_FIELDS = ["title", "artist", "album", "genre", "mood", "tags"] as const;
export type HistoryExportField = (typeof HISTORY_EXPORT_FIELDS)[number];
export type HistoryExportFormat = "text" | "csv";
export type HistoryExportOptions = { fields: HistoryExportField[]; format: HistoryExportFormat };
export type HistoryTimeRange = "day" | "week" | "thirtyDays" | "month" | "all" | "custom";
export type HistoryExportProgressStage = "preparing" | "writing" | "sharing";
export type HistoryExportArtifact = { fileUri: string; mimeType: string; uti: string };

function normalizeFields(fields: HistoryExportField[]) { const allowed = new Set(HISTORY_EXPORT_FIELDS); const unique = fields.filter((field, index) => allowed.has(field) && fields.indexOf(field) === index).slice(0, HISTORY_EXPORT_FIELDS.length); return unique.length ? unique : ["title", "artist", "album"] as HistoryExportField[]; }
function fieldValue(track: Track, field: HistoryExportField) { if (field === "title") return safeText(track.title, 100); if (field === "artist") return safeText(track.artist, 100); if (field === "album") return safeText(track.album, 100); if (field === "genre") return safeText(track.classification?.genre ?? "", 32); if (field === "mood") return safeText(track.classification?.mood ?? "", 32); return (track.classification?.tags ?? []).map((tag) => safeText(tag, 24)).join("; "); }
function escapeCsv(value: string) { return `"${value.replace(/"/g, '""')}"`; }

export function buildListeningHistoryExport(historyTracks: Track[], options: HistoryExportOptions) {
  const fields = normalizeFields(options.fields);
  const rows = historyTracks.slice(0, 12).map((track) => fields.map((field) => fieldValue(track, field)));
  if (options.format === "csv") return [fields.join(","), ...rows.map((row) => row.map(escapeCsv).join(","))].join("\n");
  return ["OmniWave listening history", "", ...(rows.length ? rows.map((row, index) => `${index + 1}. ${row.filter(Boolean).join(" — ")}`) : ["No recent tracks"]), "", "Created locally by OmniWave"].join("\n");
}

export function buildListeningHistoryText(historyTracks: Track[]) { return buildListeningHistoryExport(historyTracks, { fields: ["title", "artist", "album"], format: "text" }); }

export function historyRangeStart(range: Exclude<HistoryTimeRange, "custom" | "all">, now = Date.now()) {
  if (range === "month") { const value = new Date(now); return new Date(value.getFullYear(), value.getMonth(), 1).getTime(); }
  const days = range === "day" ? 1 : range === "week" ? 7 : 30;
  return now - days * 24 * 60 * 60 * 1000;
}

export function parseHistoryDate(value: string, boundary: "start" | "end") {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, year, month, day] = match;
  const result = new Date(`${year}-${month}-${day}T${boundary === "start" ? "00:00:00.000" : "23:59:59.999"}`);
  return Number.isFinite(result.getTime()) && result.getFullYear() === Number(year) && result.getMonth() + 1 === Number(month) && result.getDate() === Number(day) ? result.getTime() : null;
}

export function filterListeningHistory(entries: ListeningHistoryEntry[], range: HistoryTimeRange, customStart?: string, customEnd?: string, now = Date.now()) {
  const start = range === "custom" ? parseHistoryDate(customStart ?? "", "start") : range === "all" ? null : historyRangeStart(range, now);
  const end = range === "custom" ? parseHistoryDate(customEnd ?? "", "end") : now;
  if (range === "custom" && (start === null || end === null || start > end)) return [];
  return entries.filter((entry) => (!start || entry.playedAt >= start) && (!end || entry.playedAt <= end));
}

export function estimateListeningHistoryExportSize(content: string) {
  let bytes = 0;
  for (let index = 0; index < content.length; index += 1) {
    const code = content.charCodeAt(index);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && index + 1 < content.length && content.charCodeAt(index + 1) >= 0xdc00 && content.charCodeAt(index + 1) <= 0xdfff) { bytes += 4; index += 1; }
    else bytes += 3;
  }
  return bytes;
}

export function formatEstimatedBytes(bytes: number) {
  const safeBytes = Math.max(0, Math.floor(Number.isFinite(bytes) ? bytes : 0));
  return safeBytes < 1024 ? `${safeBytes} B` : `${(safeBytes / 1024).toFixed(1)} KB`;
}

export function buildFavoritesText(favoriteTracks: Track[]) {
  const lines = favoriteTracks.slice(0, 20).map((track) => {
    const tags = track.classification?.tags.length ? ` · ${track.classification.tags.map((tag) => safeText(tag, 24)).join(", ")}` : "";
    return `• ${safeText(track.title, 100)} — ${safeText(track.artist, 100)} · ${safeText(track.album, 100)}${tags}`;
  });
  return ["My OmniWave favorites", "", ...(lines.length ? lines : ["No favorite tracks yet"]), "", "Shared from OmniWave"].join("\n");
}

export async function createListeningHistoryExport(historyTracks: Track[], options: HistoryExportOptions = { fields: ["title", "artist", "album"], format: "text" }, onProgress?: (stage: Exclude<HistoryExportProgressStage, "sharing">) => void): Promise<HistoryExportArtifact> {
  onProgress?.("preparing");
  if (Platform.OS === "web" || !FileSystem.cacheDirectory || !(await Sharing.isAvailableAsync())) throw new Error("EXPORT_UNAVAILABLE");
  const isCsv = options.format === "csv";
  const fileName = `omniwave-history-${Date.now()}.${isCsv ? "csv" : "txt"}`;
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
  const content = buildListeningHistoryExport(historyTracks, options);
  onProgress?.("writing");
  await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
  return { fileUri, mimeType: isCsv ? "text/csv" : "text/plain", uti: isCsv ? "public.comma-separated-values-text" : "public.plain-text" };
}

export async function openListeningHistoryShare(artifact: HistoryExportArtifact) {
  await Sharing.shareAsync(artifact.fileUri, { mimeType: artifact.mimeType, UTI: artifact.uti, dialogTitle: "OmniWave listening history" });
}

export async function exportListeningHistory(historyTracks: Track[], options: HistoryExportOptions = { fields: ["title", "artist", "album"], format: "text" }, onProgress?: (stage: HistoryExportProgressStage) => void) {
  const artifact = await createListeningHistoryExport(historyTracks, options, onProgress);
  onProgress?.("sharing");
  await openListeningHistoryShare(artifact);
}

export async function shareFavorites(favoriteTracks: Track[]) {
  await Share.share({ message: buildFavoritesText(favoriteTracks), title: "OmniWave favorites" });
}

export async function shareFavoriteCard(cardRef: RefObject<View | null>, favoriteTracks: Track[]) {
  if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) { await shareFavorites(favoriteTracks); return false; }
  try {
    const edge = Math.round(1080 / Math.max(1, PixelRatio.get()));
    const uri = await captureRef(cardRef, { format: "png", quality: 0.92, result: "tmpfile", width: edge, height: Math.round(edge * 0.72) });
    await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "OmniWave favorites" });
    return true;
  } catch { await shareFavorites(favoriteTracks); return false; }
}
