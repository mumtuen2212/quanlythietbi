import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Permission, RoleName, LoginPayload, RegisterPayload } from '../types';
import { ApiService } from '../services/api';
import { beginGoogleBrowserLogin, listenForGoogleBrowserLogin, usesGoogleSystemBrowser } from '../services/mobileGoogle';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithGoogleBrowser: (returnPath: string) => Promise<void>;
  googleBrowserError: string | null;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: Permission) => boolean;
  hasAnyRole: (roles: RoleName[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [googleBrowserError, setGoogleBrowserError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem(TOKEN_KEY);
      if (storedToken) {
        try {
          const me = await ApiService.getMe();
          if (localStorage.getItem(TOKEN_KEY) === storedToken) {
            setUser(me);
            setToken(storedToken);
          }
        } catch (err) {
          console.warn('Session expired or invalid token:', err);
          if (localStorage.getItem(TOKEN_KEY) === storedToken) {
            localStorage.removeItem(TOKEN_KEY);
            setUser(null);
            setToken(null);
          }
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  useEffect(() => {
    if (!usesGoogleSystemBrowser()) return;
    const controller = new AbortController();
    let disposed = false;
    let cleanup: (() => void) | undefined;
    listenForGoogleBrowserLogin((session, returnPath) => {
      if (disposed) return;
      localStorage.setItem(TOKEN_KEY, session.token);
      setToken(session.token);
      setUser(session.user);
      setGoogleBrowserError(null);
      window.location.hash = `#${returnPath}`;
    }, message => {
      if (disposed) return;
      setGoogleBrowserError(message);
      window.location.hash = '#/login';
    }, controller.signal).then(remove => { if (disposed) remove(); else cleanup = remove; })
      .catch(() => { if (!disposed) setGoogleBrowserError('Không thể nhận kết quả Google. Hãy mở lại app.'); });
    return () => { disposed = true; controller.abort(); cleanup?.(); };
  }, []);

  const loginWithGoogleBrowser = async (returnPath: string) => {
    setGoogleBrowserError(null);
    await beginGoogleBrowserLogin(returnPath);
  };

  const login = async (payload: LoginPayload) => {
    const res = await ApiService.login(payload);
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await ApiService.loginWithGoogle(credential);
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (payload: RegisterPayload) => {
    const res = await ApiService.register(payload);
    localStorage.setItem(TOKEN_KEY, res.token);
    setToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const me = await ApiService.getMe();
      setUser(me);
    } catch (err) {
      console.error('Error refreshing user:', err);
    }
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.role_name === 'ADMIN') return true;
    return Boolean(user.permissions && user.permissions.includes(permission));
  };

  const hasAnyRole = (roles: RoleName[]): boolean => {
    if (!user) return false;
    if (user.role_name === 'ADMIN') return true;
    return roles.includes(user.role_name);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        loginWithGoogle,
        loginWithGoogleBrowser,
        googleBrowserError,
        register,
        logout,
        hasPermission,
        hasAnyRole,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
