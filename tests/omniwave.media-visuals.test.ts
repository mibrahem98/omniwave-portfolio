import { describe, expect, it } from "vitest";

import { isSafeMediaAccent, resolveMediaGlassAccent } from "../lib/omniwave/media-visuals";

describe("local media glass accent", () => {
  it("accepts only complete hex accents", () => {
    expect(isSafeMediaAccent("#31E9C4")).toBe(true);
    expect(isSafeMediaAccent("#fff")).toBe(false);
    expect(isSafeMediaAccent("rgba(0,0,0,1)")).toBe(false);
  });

  it("keeps a validated media accent ahead of a derived local fallback", () => {
    expect(resolveMediaGlassAccent("#31E9C4", "#FFFFFF", "local-thumbnail")).toBe("#31E9C4");
  });

  it("derives a stable decorative accent from a bounded local presentation seed", () => {
    expect(resolveMediaGlassAccent(undefined, "#FFFFFF", "local-thumbnail")).toBe(resolveMediaGlassAccent(undefined, "#FFFFFF", "local-thumbnail"));
    expect(resolveMediaGlassAccent(undefined, "#FFFFFF")).toBe("#FFFFFF");
  });
});
