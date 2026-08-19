import type { Href } from "expo-router";

export type RoutePolicy = "local" | "authenticated" | "admin";
export type RouteAccess = { isAuthenticated: boolean; role?: "admin" | "user" };
export const LOCAL_ROUTE_ACCESS: RouteAccess = { isAuthenticated: false };

/**
 * Keep programmatic destinations in one typed map. This avoids scattering raw
 * route strings through recovery states and makes the safe home route explicit.
 */
export const APP_ROUTES = {
  home: "/" as Href,
  library: "/(tabs)/library" as Href,
  playlists: "/(tabs)/playlists" as Href,
  nowPlaying: "/(tabs)/now-playing" as Href,
  settings: "/(tabs)/settings" as Href,
  videos: "/(tabs)/videos" as Href,
} as const;

export type AppRouteKey = keyof typeof APP_ROUTES;
type RouteDefinition = { href: Href; policy: RoutePolicy };

/** All current media destinations are deliberately local and account-free. */
export const APP_ROUTE_DEFINITIONS: Record<AppRouteKey, RouteDefinition> = {
  home: { href: APP_ROUTES.home, policy: "local" },
  library: { href: APP_ROUTES.library, policy: "local" },
  playlists: { href: APP_ROUTES.playlists, policy: "local" },
  nowPlaying: { href: APP_ROUTES.nowPlaying, policy: "local" },
  settings: { href: APP_ROUTES.settings, policy: "local" },
  videos: { href: APP_ROUTES.videos, policy: "local" },
};

export function canAccessRoute(definition: RouteDefinition, access: RouteAccess = LOCAL_ROUTE_ACCESS): boolean {
  if (definition.policy === "local") return true;
  if (definition.policy === "authenticated") return access.isAuthenticated;
  return access.isAuthenticated && access.role === "admin";
}

export function isAppRoute(value: unknown): value is Href {
  return typeof value === "string" && Object.values(APP_ROUTES).includes(value as Href);
}

/** Fall back to the listening home instead of accepting an untrusted route. */
export function toSafeAppRoute(value: unknown): Href {
  const definition = Object.values(APP_ROUTE_DEFINITIONS).find((candidate) => candidate.href === value);
  return definition && canAccessRoute(definition) ? definition.href : APP_ROUTES.home;
}
