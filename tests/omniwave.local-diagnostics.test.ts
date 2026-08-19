import { afterEach, describe, expect, it } from "vitest";

import { clearLocalDiagnostics, getLocalDiagnostics, reportLocalDiagnostic } from "../lib/_core/local-diagnostics";

describe("OmniWave local diagnostics", () => {
  afterEach(() => clearLocalDiagnostics());

  it("records a typed, redacted diagnostic without a user payload", () => {
    reportLocalDiagnostic("audio_library_write_failed");
    expect(getLocalDiagnostics()).toEqual([
      expect.objectContaining({ code: "audio_library_write_failed", occurredAt: expect.any(Number) }),
    ]);
    expect(JSON.stringify(getLocalDiagnostics())).not.toContain("file://");
  });

  it("keeps only a bounded history", () => {
    for (let index = 0; index < 30; index += 1) reportLocalDiagnostic("theme_preferences_write_failed");
    expect(getLocalDiagnostics()).toHaveLength(24);
  });
});
