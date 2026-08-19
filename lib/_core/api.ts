import { Platform } from "react-native";

import { getApiBaseUrl } from "@/constants/oauth";
import * as Auth from "./auth";
import { safeEndpoint } from "./api-endpoint";
import { OperationAbortedError, OperationTimeoutError, withRetry, withTimeout, type TimedOperationOptions } from "./async";

class ApiResponseError extends Error {
  constructor(readonly status: number) {
    super(`API request failed (${status})`);
    this.name = "ApiResponseError";
  }
}

function isSafeRetryMethod(method: string | undefined): boolean {
  const normalized = (method ?? "GET").toUpperCase();
  return normalized === "GET" || normalized === "HEAD" || normalized === "OPTIONS";
}

function isTransientApiFailure(error: unknown): boolean {
  if (error instanceof OperationAbortedError) return false;
  if (error instanceof ApiResponseError) return error.status === 408 || error.status === 429 || error.status >= 500;
  return true;
}

export type ApiRequestOptions = RequestInit & Pick<TimedOperationOptions, "timeoutMs">;

export async function apiCall<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const relativeEndpoint = safeEndpoint(endpoint);
  const { timeoutMs, signal: callerSignal, headers: requestHeaders, ...requestOptions } = options;
  const headers: Record<string, string> = { "Content-Type": "application/json", ...((requestHeaders as Record<string, string>) || {}) };
  if (Platform.OS !== "web") {
    const sessionToken = await Auth.getSessionToken();
    if (sessionToken) headers.Authorization = `Bearer ${sessionToken}`;
  }

  const baseUrl = getApiBaseUrl();
  const url = baseUrl ? `${baseUrl.replace(/\/$/, "")}${relativeEndpoint}` : relativeEndpoint;
  try {
    const response = await withRetry(
      async () => {
        const nextResponse = await withTimeout(
          (signal) => fetch(url, { ...requestOptions, headers, credentials: "include", signal }),
          { timeoutMs, signal: callerSignal ?? undefined },
        );
        if (!nextResponse.ok) throw new ApiResponseError(nextResponse.status);
        return nextResponse;
      },
      {
        signal: callerSignal ?? undefined,
        maxAttempts: isSafeRetryMethod(requestOptions.method) ? 3 : 1,
        shouldRetry: isTransientApiFailure,
      },
    );
    const contentType = response.headers.get("content-type") ?? "";
    return (contentType.includes("application/json") ? await response.json() : JSON.parse((await response.text()) || "{}")) as T;
  } catch (error) {
    if (error instanceof OperationTimeoutError) throw new Error("API request timed out");
    if (error instanceof ApiResponseError) throw new Error(error.message);
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
    await apiCall<Record<string, never>>("/api/auth/session", { method: "POST", headers: { Authorization: `Bearer ${safeToken}` } });
    return true;
  } catch {
    return false;
  }
}
