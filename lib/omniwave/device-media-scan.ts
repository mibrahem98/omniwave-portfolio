import * as MediaLibrary from "expo-media-library";
import { Platform } from "react-native";

import { isSafeAudioUri, isSafeLocalVideoUri } from "@/lib/omniwave/validation";

export type DeviceMediaKind = "audio" | "video";
export type DeviceMediaIssue = "unavailable" | "permission" | "empty";
export type DeviceMediaCandidate = { uri: string; name: string; mimeType: string; durationSeconds: number };
export type DeviceMediaScanResult = { candidates: DeviceMediaCandidate[]; issue: DeviceMediaIssue | null; limitedAccess: boolean; totalFound: number };

const PAGE_SIZE = 80;
const MAX_FILENAME_LENGTH = 120;

function safeFileName(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001F]/g, "").trim().replace(/\s+/g, " ").slice(0, MAX_FILENAME_LENGTH) || fallback;
}

function safeDuration(value: unknown) {
  return Number.isFinite(value) ? Math.max(0, Math.min(86_400, Number(value))) : 0;
}

/**
 * Reads only the media categories explicitly needed by OmniWave. On iOS, an
 * `Asset` may expose a `ph://` reference, so the per-asset info lookup is used
 * to obtain its local URI when the operating system makes one available.
 */
export async function scanDeviceMedia(kind: DeviceMediaKind, maximumItems: number): Promise<DeviceMediaScanResult> {
  if (Platform.OS === "web" || maximumItems < 1) return { candidates: [], issue: Platform.OS === "web" ? "unavailable" : "empty", limitedAccess: false, totalFound: 0 };
  try {
    const available = await MediaLibrary.isAvailableAsync();
    if (!available) return { candidates: [], issue: "unavailable", limitedAccess: false, totalFound: 0 };
    const granularPermissions: MediaLibrary.GranularPermission[] = kind === "audio" ? ["audio"] : ["video"];
    const permission = await MediaLibrary.requestPermissionsAsync(false, granularPermissions);
    if (permission.status !== "granted") return { candidates: [], issue: "permission", limitedAccess: false, totalFound: 0 };

    const mediaType = kind === "audio" ? MediaLibrary.MediaType.audio : MediaLibrary.MediaType.video;
    const safeUri = kind === "audio" ? isSafeAudioUri : isSafeLocalVideoUri;
    const candidates: DeviceMediaCandidate[] = [];
    const seenUris = new Set<string>();
    let cursor: string | undefined;
    let hasNextPage = true;
    let totalFound = 0;

    while (hasNextPage && candidates.length < maximumItems) {
      const page = await MediaLibrary.getAssetsAsync({ first: PAGE_SIZE, after: cursor, mediaType, sortBy: MediaLibrary.SortBy.creationTime });
      totalFound = Math.max(totalFound, Number.isFinite(page.totalCount) ? page.totalCount : 0);
      for (const asset of page.assets) {
        if (candidates.length >= maximumItems) break;
        try {
          const details = await MediaLibrary.getAssetInfoAsync(asset, { shouldDownloadFromNetwork: false });
          const uri = details.localUri;
          if (!uri || uri.startsWith("ph:") || !safeUri(uri) || seenUris.has(uri)) continue;
          seenUris.add(uri);
          candidates.push({ uri, name: safeFileName(asset.filename, kind === "audio" ? "Local audio" : "Local video"), mimeType: `${kind}/local`, durationSeconds: safeDuration(asset.duration) });
        } catch {
          // A missing, cloud-only, or unreadable asset is skipped without exposing its path.
        }
      }
      cursor = page.endCursor || undefined;
      hasNextPage = page.hasNextPage && Boolean(cursor);
    }
    return { candidates, issue: candidates.length ? null : "empty", limitedAccess: permission.accessPrivileges === "limited", totalFound };
  } catch {
    return { candidates: [], issue: "unavailable", limitedAccess: false, totalFound: 0 };
  }
}
