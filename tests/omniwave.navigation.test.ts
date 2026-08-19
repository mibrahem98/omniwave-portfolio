import { describe, expect, it } from "vitest";

import { APP_ROUTE_DEFINITIONS, APP_ROUTES, canAccessRoute, isAppRoute, toSafeAppRoute } from "../lib/omniwave/navigation";

describe("OmniWave safe navigation", () => {
  it("accepts only the registered local destinations", () => {
    expect(isAppRoute(APP_ROUTES.library)).toBe(true);
    expect(isAppRoute("/(tabs)/unknown")).toBe(false);
    expect(isAppRoute({ path: "/" })).toBe(false);
  });

  it("falls back to the listening home for an unknown or malformed destination", () => {
    expect(toSafeAppRoute("/(tabs)/unknown")).toBe(APP_ROUTES.home);
    expect(toSafeAppRoute(null)).toBe(APP_ROUTES.home);
    expect(toSafeAppRoute(APP_ROUTES.videos)).toBe(APP_ROUTES.videos);
  });

  it("keeps local media routes available without introducing an account requirement", () => {
    expect(canAccessRoute(APP_ROUTE_DEFINITIONS.library)).toBe(true);
    expect(canAccessRoute({ href: APP_ROUTES.home, policy: "authenticated" })).toBe(false);
    expect(canAccessRoute({ href: APP_ROUTES.home, policy: "admin" }, { isAuthenticated: true, role: "admin" })).toBe(true);
  });
});
