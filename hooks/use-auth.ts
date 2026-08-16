import { useCallback, useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";

import * as Api from "@/lib/_core/api";
import * as Auth from "@/lib/_core/auth";

type UseAuthOptions = { autoFetch?: boolean };

export function useAuth(options?: UseAuthOptions) {
  const { autoFetch = true } = options ?? {};
  const [user, setUser] = useState<Auth.User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (Platform.OS === "web") {
        const apiUser = await Api.getMe();
        if (!apiUser) {
          setUser(null);
          await Auth.clearUserInfo();
          return;
        }
        const userInfo: Auth.User = { id: apiUser.id, openId: apiUser.openId, name: apiUser.name, email: apiUser.email, loginMethod: apiUser.loginMethod, lastSignedIn: new Date(apiUser.lastSignedIn) };
        await Auth.setUserInfo(userInfo);
        setUser(userInfo);
        return;
      }
      if (!(await Auth.getSessionToken())) {
        setUser(null);
        return;
      }
      setUser(await Auth.getUserInfo());
    } catch {
      setError(new Error("Unable to refresh authentication"));
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try { await Api.logout(); } catch { /* Local sign-out must still complete. */ } finally {
      await Auth.removeSessionToken();
      await Auth.clearUserInfo();
      setUser(null);
      setError(null);
    }
  }, []);

  useEffect(() => {
    if (!autoFetch) { setLoading(false); return; }
    if (Platform.OS === "web") { void fetchUser(); return; }
    void Auth.getUserInfo().then((cachedUser) => {
      if (cachedUser) { setUser(cachedUser); setLoading(false); return; }
      void fetchUser();
    });
  }, [autoFetch, fetchUser]);

  return { user, loading, error, isAuthenticated: useMemo(() => Boolean(user), [user]), refresh: fetchUser, logout };
}
