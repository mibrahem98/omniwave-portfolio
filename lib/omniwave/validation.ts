function isSafeUri(value: unknown, allowRemote: boolean): value is string {
  if (typeof value !== "string" || value.length > 2048 || /[\u0000-\u001F]/.test(value)) return false;
  const localScheme = /^(file:|content:|ph:|blob:)/.test(value);
  return localScheme || (allowRemote && /^https?:\/\//.test(value));
}

export function isSafeAudioUri(value: unknown): value is string {
  return isSafeUri(value, false);
}

export function isSafeArtworkUri(value: unknown): value is string {
  return isSafeUri(value, false);
}

export function isSafeLocalVideoUri(value: unknown): value is string {
  return isSafeUri(value, false);
}

export function isSafeLocalSubtitleUri(value: unknown): value is string {
  return isSafeUri(value, false);
}
