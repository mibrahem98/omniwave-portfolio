export type LocalMediaDescriptor = { fileName?: unknown; sizeBytes?: unknown; durationSeconds?: unknown };

function normalizedName(value: unknown) {
  if (typeof value !== "string") return "local-media";
  return value.replace(/\.[^/.]+$/, "").replace(/[\u0000-\u001F]/g, "").trim().replace(/\s+/g, " ").toLocaleLowerCase().slice(0, 120) || "local-media";
}

function boundedInteger(value: unknown, maximum: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(maximum, Math.round(Number(value)))) : 0;
}

function hash(value: string, seed: number) {
  let result = seed;
  for (let index = 0; index < value.length; index += 1) result = Math.imul(result ^ value.charCodeAt(index), 0x01000193);
  return (result >>> 0).toString(16).padStart(8, "0");
}

/** A one-way, locally stored signature; it never contains a path or raw file name. */
export function createLocalMediaFingerprint({ fileName, sizeBytes, durationSeconds }: LocalMediaDescriptor) {
  // Duration varies by API source, so it is deliberately excluded to deduplicate
  // the same local file when it enters through either picker or media-library scan.
  void durationSeconds;
  const source = `${normalizedName(fileName)}|${boundedInteger(sizeBytes, 1_500_000_000)}`;
  return `lm-${hash(source, 0x811c9dc5)}${hash(source, 0x9e3779b9)}`;
}

export function isLocalMediaFingerprint(value: unknown): value is string {
  return typeof value === "string" && /^lm-[a-f0-9]{16}$/.test(value);
}

export function filterNewLocalMedia<T>(items: T[], existingFingerprints: Iterable<string>, fingerprintFor: (item: T) => string) {
  const seen = new Set([...existingFingerprints].filter(isLocalMediaFingerprint));
  return items.filter((item) => {
    const fingerprint = fingerprintFor(item);
    if (!isLocalMediaFingerprint(fingerprint) || seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });
}

/** Ensures the native player receives a source before the first play request. */
export function shouldReplaceAudioSource(loadedTrackId: string | null, requestedTrackId: string) {
  return Boolean(requestedTrackId) && loadedTrackId !== requestedTrackId;
}
