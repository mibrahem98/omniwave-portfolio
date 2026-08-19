export type LocalDiagnosticCode =
  | "audio_library_cleanup_failed"
  | "audio_library_hydration_failed"
  | "audio_library_persist_failed"
  | "audio_library_write_failed"
  | "audio_mode_configuration_failed"
  | "audio_artwork_cleanup_failed"
  | "audio_lock_screen_metadata_failed"
  | "library_discovery_hydration_failed"
  | "library_discovery_write_failed"
  | "library_discovery_reset_failed"
  | "auth_logout_remote_failed"
  | "theme_preferences_hydration_failed"
  | "theme_preferences_write_failed"
  | "video_library_hydration_failed"
  | "video_library_write_failed"
  | "video_thumbnail_generation_failed"
  | "video_library_cleanup_failed"
  | "video_brightness_access_failed"
  | "video_orientation_update_failed";

export type LocalDiagnostic = Readonly<{
  code: LocalDiagnosticCode;
  occurredAt: number;
}>;

const MAX_LOCAL_DIAGNOSTICS = 24;
const localDiagnostics: LocalDiagnostic[] = [];

/**
 * Retains only a generic code and timestamp. User media names, paths, payloads,
 * authorization headers, and raw error messages are intentionally excluded.
 */
export function reportLocalDiagnostic(code: LocalDiagnosticCode): void {
  localDiagnostics.unshift({ code, occurredAt: Date.now() });
  localDiagnostics.splice(MAX_LOCAL_DIAGNOSTICS);
}

export function getLocalDiagnostics(): readonly LocalDiagnostic[] {
  return [...localDiagnostics];
}

export function clearLocalDiagnostics(): void {
  localDiagnostics.splice(0, localDiagnostics.length);
}
