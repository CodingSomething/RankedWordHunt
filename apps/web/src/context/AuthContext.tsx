"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthResponse, SessionUser } from "@wordhunt/shared/user";
import { apiFetch } from "@/lib/api";

interface AuthContextValue {
  user: SessionUser | null;
  token: string | null;
  ready: boolean;
  setSession: (session: AuthResponse) => void;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const logout = useCallback(() => {
    localStorage.removeItem("wh_token");
    localStorage.removeItem("wh_user");
    setToken(null);
    setUser(null);
  }, []);

  const setSession = useCallback((session: AuthResponse) => {
    localStorage.setItem("wh_token", session.token);
    localStorage.setItem("wh_user", JSON.stringify(session.user));
    setToken(session.token);
    setUser(session.user);
  }, []);

  const refreshUser = useCallback(async () => {
    const currentToken = token ?? localStorage.getItem("wh_token");
    if (!currentToken) return;
    try {
      const data = await apiFetch<{ user: SessionUser }>("/api/user/me", {}, currentToken);
      localStorage.setItem("wh_user", JSON.stringify(data.user));
      setUser(data.user);
    } catch {
      logout();
    }
  }, [logout, token]);

  useEffect(() => {
    const storedToken = localStorage.getItem("wh_token");
    const storedUser = localStorage.getItem("wh_user");
    if (storedToken) setToken(storedToken);
    if (storedUser) {
      try { setUser(JSON.parse(storedUser)); } catch { localStorage.removeItem("wh_user"); }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready && token) void refreshUser();
  }, [ready, token, refreshUser]);

  const value = useMemo(() => ({ user, token, ready, setSession, refreshUser, logout }), [user, token, ready, setSession, refreshUser, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
