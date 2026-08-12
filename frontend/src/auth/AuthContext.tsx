import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as authApi from '../api/authApi';
import type { Session, User } from '../types/admin';

interface AuthState {
  currentUser: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isAdmin: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateCurrentUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      setSession(await authApi.getSession());
    } catch {
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const login = useCallback(async (identifier: string, password: string) => {
    const next = await authApi.login(identifier, password);
    setSession(next);
    return next.user;
  }, []);

  const updateCurrentUser = useCallback((user: User) => {
    setSession((current) => current ? { ...current, user } : current);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setSession(null);
    }
  }, []);

  const value = useMemo<AuthState>(() => ({
    currentUser: session?.user ?? null,
    isAuthenticated: Boolean(session?.user),
    isLoading,
    isAdmin: session?.user.role === 'admin',
    login,
    logout,
    refresh,
    updateCurrentUser,
  }), [session, isLoading, login, logout, refresh, updateCurrentUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
