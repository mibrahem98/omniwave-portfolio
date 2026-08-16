import { ThemedView } from "@/components/themed-view";
import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";
import * as Linking from "expo-linking";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type CallbackParams = { code?: string; state?: string; error?: string; sessionToken?: string; user?: string };

function parseUserPayload(encoded: string | undefined): Auth.User | null {
  if (!encoded || typeof atob === "undefined") return null;
  try {
    const value: unknown = JSON.parse(atob(encoded));
    if (!value || typeof value !== "object") return null;
    const candidate = value as Record<string, unknown>;
    if (!Number.isSafeInteger(candidate.id) || typeof candidate.openId !== "string") return null;
    return {
      id: candidate.id as number,
      openId: candidate.openId,
      name: typeof candidate.name === "string" ? candidate.name : null,
      email: typeof candidate.email === "string" ? candidate.email : null,
      loginMethod: typeof candidate.loginMethod === "string" ? candidate.loginMethod : null,
      lastSignedIn: new Date(typeof candidate.lastSignedIn === "string" || typeof candidate.lastSignedIn === "number" ? candidate.lastSignedIn : Date.now()),
    };
  } catch {
    return null;
  }
}

function readCallbackParams(params: CallbackParams, rawUrl: string | null) {
  if (params.code || params.state || params.error || params.sessionToken) return params;
  if (!rawUrl) return {};
  try {
    const parsed = new URL(rawUrl);
    return { code: parsed.searchParams.get("code") ?? undefined, state: parsed.searchParams.get("state") ?? undefined, error: parsed.searchParams.get("error") ?? undefined, sessionToken: parsed.searchParams.get("sessionToken") ?? undefined };
  } catch {
    return {};
  }
}

export default function OAuthCallback() {
  const router = useRouter();
  const params = useLocalSearchParams<CallbackParams>();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");

  useEffect(() => {
    let mounted = true;
    const complete = async () => {
      try {
        const callback = readCallbackParams(params, await Linking.getInitialURL());
        if (callback.error) throw new Error("AUTH_CALLBACK_ERROR");
        if (callback.sessionToken) {
          await Auth.setSessionToken(callback.sessionToken);
          const user = parseUserPayload(params.user);
          if (user) await Auth.setUserInfo(user);
        } else if (callback.code && callback.state) {
          const result = await Api.exchangeOAuthCode(callback.code, callback.state);
          if (!result.sessionToken) throw new Error("AUTH_SESSION_MISSING");
          await Auth.setSessionToken(result.sessionToken);
          if (result.user) await Auth.setUserInfo({ id: result.user.id, openId: result.user.openId, name: result.user.name, email: result.user.email, loginMethod: result.user.loginMethod, lastSignedIn: new Date(result.user.lastSignedIn || Date.now()) });
        } else {
          throw new Error("AUTH_PARAMETERS_MISSING");
        }
        if (!mounted) return;
        setStatus("success");
        setTimeout(() => router.replace("/(tabs)"), 700);
      } catch {
        if (mounted) setStatus("error");
      }
    };
    void complete();
    return () => { mounted = false; };
  }, [params, router]);

  return <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}><ThemedView className="flex-1 items-center justify-center gap-4 p-5">{status === "processing" ? <><ActivityIndicator size="large" /><Text className="mt-4 text-base leading-6 text-center text-foreground">Completing authentication…</Text></> : null}{status === "success" ? <Text className="text-base leading-6 text-center text-foreground">Authentication successful. Redirecting…</Text> : null}{status === "error" ? <Text className="text-base leading-6 text-center text-error">Authentication could not be completed. Return to the app and try again.</Text> : null}</ThemedView></SafeAreaView>;
}
