export function isSafeAudioUri(value: unknown): value is string {
  return typeof value === "string" && /^(https?:\/\/|file:|content:|ph:)/.test(value) && value.length <= 2048 && !/[\u0000-\u001F]/.test(value);
}
