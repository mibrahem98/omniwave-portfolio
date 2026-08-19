const ACCENT_HEX = /^#[0-9A-Fa-f]{6}$/;
const LOCAL_ACCENT_PALETTE = ["#31E9C4", "#78A9FF", "#E888D1", "#F9B75D", "#6DCFE4", "#9F86FF"] as const;

export function isSafeMediaAccent(value: unknown): value is string {
  return typeof value === "string" && ACCENT_HEX.test(value);
}

function stableIndex(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(hash) % LOCAL_ACCENT_PALETTE.length;
}

/**
 * Resolves a decorative accent entirely on-device. Existing validated media accents
 * take priority; a bounded thumbnail or media identifier chooses a stable fallback
 * palette without reading, uploading, or persisting image bytes.
 */
export function resolveMediaGlassAccent(candidate: unknown, fallback: string, localPresentationSeed?: unknown) {
  if (isSafeMediaAccent(candidate)) return candidate;
  if (typeof localPresentationSeed !== "string" || localPresentationSeed.length < 1 || localPresentationSeed.length > 1_024) return fallback;
  return LOCAL_ACCENT_PALETTE[stableIndex(localPresentationSeed)];
}
