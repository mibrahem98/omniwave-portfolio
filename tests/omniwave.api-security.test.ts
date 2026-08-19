import { describe, expect, it } from "vitest";

import { safeEndpoint } from "../lib/_core/api-endpoint";

describe("OmniWave API endpoint boundary", () => {
  it("accepts local API paths with encoded query parameters", () => {
    expect(safeEndpoint("/api/auth/me?preview=true")).toBe("/api/auth/me?preview=true");
  });

  it("rejects protocol-relative, absolute, and control-character endpoints", () => {
    for (const endpoint of ["//untrusted.example", "https://untrusted.example", "/api/auth\nme"]) {
      expect(() => safeEndpoint(endpoint)).toThrow("Invalid API endpoint");
    }
  });
});
