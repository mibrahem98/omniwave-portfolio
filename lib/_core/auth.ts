import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { SESSION_TOKEN_KEY, USER_INFO_KEY } from "@/constants/oauth";

export type User = {
  id: number;
  openId: string;
  name: string | null;
  email: string | null;
  loginMethod: string | null;
  lastSignedIn: Date;
};

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

function parseStoredUser(raw: string): User | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return null;
    const candidate = value as Record<string, unknown>;
    if (!Number.isSafeInteger(candidate.id) || typeof candidate.openId !== "string" || candidate.openId.length > 256) return null;
    if (!isNullableString(candidate.name) || !isNullableString(candidate.email) || !isNullableString(candidate.loginMethod)) return null;
    const lastSignedIn = new Date(typeof candidate.lastSignedIn === "string" || typeof candidate.lastSignedIn === "number" ? candidate.lastSignedIn : 0);
    if (!Number.isFinite(lastSignedIn.getTime())) return null;
    return {
      id: candidate.id as number,
      openId: candidate.openId,
      name: candidate.name?.slice(0, 160) ?? null,
      email: candidate.email?.slice(0, 320) ?? null,
      loginMethod: candidate.loginMethod?.slice(0, 80) ?? null,
      lastSignedIn,
    };
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return null;
    return await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setSessionToken(token: string): Promise<void> {
  const safeToken = token.trim();
  if (!safeToken) throw new Error("Invalid session token");
  if (Platform.OS === "web") return;
  await SecureStore.setItemAsync(SESSION_TOKEN_KEY, safeToken);
}

export async function removeSessionToken(): Promise<void> {
  try {
    if (Platform.OS === "web") return;
    await SecureStore.deleteItemAsync(SESSION_TOKEN_KEY);
  } catch {
    // A missing or inaccessible local token must not block local playback.
  }
}

export async function getUserInfo(): Promise<User | null> {
  try {
    const raw = Platform.OS === "web" ? window.localStorage.getItem(USER_INFO_KEY) : await SecureStore.getItemAsync(USER_INFO_KEY);
    return raw ? parseStoredUser(raw) : null;
  } catch {
    return null;
  }
}

export async function setUserInfo(user: User): Promise<void> {
  const normalized: User = {
    id: user.id,
    openId: user.openId.slice(0, 256),
    name: user.name?.slice(0, 160) ?? null,
    email: user.email?.slice(0, 320) ?? null,
    loginMethod: user.loginMethod?.slice(0, 80) ?? null,
    lastSignedIn: user.lastSignedIn,
  };
  if (!Number.isSafeInteger(normalized.id) || !normalized.openId) throw new Error("Invalid user data");
  const serialized = JSON.stringify(normalized);
  if (Platform.OS === "web") {
    window.localStorage.setItem(USER_INFO_KEY, serialized);
    return;
  }
  await SecureStore.setItemAsync(USER_INFO_KEY, serialized);
}

export async function clearUserInfo(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      window.localStorage.removeItem(USER_INFO_KEY);
      return;
    }
    await SecureStore.deleteItemAsync(USER_INFO_KEY);
  } catch {
    // Local cleanup is best-effort; no user data is written to logs.
  }
}
