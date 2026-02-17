import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

import { DecodedToken, UserData } from "../types";
import { AuthService } from "../authService";
import {
  clearLocalStorage,
  getRefreshToken,
  setLocalStorage,
} from "./useLocalStorage";

interface AuthContextType {
  loading: boolean;
  isAuthenticated: boolean;
  user: DecodedToken | null;
  login: (data: UserData) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  /* ---- force-logout: centralised handler ---- */

  const forceLogout = useCallback(() => {
    clearLocalStorage();
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    const handler = () => forceLogout();
    window.addEventListener("auth:force-logout", handler);
    return () => window.removeEventListener("auth:force-logout", handler);
  }, [forceLogout]);

  /* ---- verify token on route change ---- */

  const verifyToken = useCallback(async () => {
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) {
      setIsAuthenticated(false);
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode<DecodedToken>(accessToken);

      // Expired token: treat as logged out (prevents "invalid token" loops).
      if (decoded?.exp && decoded.exp * 1000 <= Date.now()) {
        forceLogout();
        return;
      }

      setUser(decoded);
      setIsAuthenticated(true);
    } catch {
      // Token malformed — clear and redirect
      forceLogout();
    }

    setLoading(false);
  }, [forceLogout]);

  useEffect(() => {
    verifyToken();
  }, [location.pathname, verifyToken]);

  /* ---- login ---- */

  const login = useCallback(
    async (loginData: UserData) => {
      const { token, user } = await AuthService.login(loginData);

      setLocalStorage(token);
      setUser(user);
      setIsAuthenticated(true);

      navigate("/workspace");
    },
    [navigate]
  );

  /* ---- logout ---- */

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (!refresh) {
      forceLogout();
      return;
    }

    try {
      setLoading(true);
      await AuthService.logout(refresh);
    } catch {
      // If logout call fails (401, network, etc.) we still want to
      // clear local state. The interceptor handles token refresh for
      // regular API calls; for an explicit logout we just proceed.
    } finally {
      clearLocalStorage();
      setUser(null);
      setIsAuthenticated(false);
      setLoading(false);
      navigate("/login");
    }
  }, [navigate, forceLogout]);

  /* ---- context value ---- */

  const value = useMemo(
    () => ({
      isAuthenticated,
      loading,
      user,
      login,
      logout,
    }),
    [isAuthenticated, loading, user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de un AuthProvider");
  }
  return context;
}
