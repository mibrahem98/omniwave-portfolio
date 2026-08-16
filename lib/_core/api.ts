import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";

function safeEndpoint(endpoint: string) {
  if (!endpoint.startsWith("/") || endpoint.includes("://") || /[\u0000-\u001F]/.test(endpoint)) throw new Error("Invalid API endpoint");
  return endpoint;
}

export async function apiCall<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const relativeEndpoint = safeEndpoint(endpoint);
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((options.headers as Record<string, string>) || {}) };
  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}${relativeEndpoint}` : relativeEndpoint;
  try {
    const response = await fetch(url, { ...options, headers, credentials: "include" });
    if (!response.ok) throw new Error(`API request failed (${response.status})`);
    const contentType = response.headers.get("content-type") ?? "";
    return (contentType.includes("application/json") ? await response.json() : JSON.parse((await response.text()) || "{}")) as T;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("API request failed")) throw error;
    throw new Error("API request could not be completed");
  }
}

export type OAuthExchange = { sessionToken: string; user: { id: number; openId: string; name: string | null; email: string | null; loginMethod: string | null; lastSignedIn: string } | null };

export async function exchangeOAuthCode(code: string, state: string): Promise<OAuthExchange> {
  const result = await apiCall<{ app_session_id?: unknown; user?: OAuthExchange["user"] }>(`/api/oauth/mobile?${new URLSearchParams({ code, state }).toString()}`);
  if (typeof result.app_session_id !== "string" || !result.app_session_id.trim()) throw new Error("OAuth session was not returned");
  return { sessionToken: result.app_session_id, user: result.user ?? null };
}

export async function logout(): Promise<void> {
  await apiCall<void>("/api/auth/logout", { method: "POST" });
}

export async function getMe(): Promise<OAuthExchange["user"]> {
  try {
    return (await apiCall<{ user?: OAuthExchange["user"] }>("/api/auth/me")).user ?? null;
  } catch {
    return null;
  }
}

export async function establishSession(token: string): Promise<boolean> {
  const safeToken = token.trim();
  if (!safeToken) return false;
  try {
    const response = await fetch(`${getApiBaseUrl().replace(/\/$/, "")}/api/auth/session`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${safeToken}` }, credentials: "include" });
    return response.ok;
  } catch {
    return false;
  }
}
