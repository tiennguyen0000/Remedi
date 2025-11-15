import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { saveTokens, clearTokens, hasValidToken, refreshAccessToken, getAccessToken } from "@/lib/auth";

export interface User {
  id: string;
  ho_ten: string;
  email?: string;
  so_dien_thoai?: string;
  dia_chi?: string;
  role: "ADMIN" | "CONGTACVIEN" | "USER";
  diem_tich_luy?: number;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (input: {
    email?: string;
    phone?: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  register: (input: {
    ho_ten: string;
    email?: string;
    so_dien_thoai?: string;
    dia_chi?: string;
    password: string;
    requestCollaborator?: boolean;
  }) => Promise<void>;
  updateProfile: (updates: {
    ho_ten?: string;
    so_dien_thoai?: string;
    dia_chi?: string;
    old_password?: string;
    new_password?: string;
  }) => Promise<void>;
  refreshUser: () => Promise<void>;
  authHeaders: () => HeadersInit;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);

  // Watch for user changes and reload page
  useEffect(() => {
    if (user && previousUserId && user.id !== previousUserId) {
      // User changed, reload page
      console.log("[useAuth] User changed, reloading page...");
      window.location.reload();
    }
    if (user) {
      setPreviousUserId(user.id);
    }
  }, [user?.id]);

  useEffect(() => {
    // Initialize auth state from localStorage and JWT
    const raw = localStorage.getItem("remedi:user");
    
    if (raw && hasValidToken()) {
      try {
        const userData = JSON.parse(raw);
        setUser(userData);
        
        // Verify token by calling /me endpoint
        const verifyToken = async () => {
          try {
            const token = getAccessToken();
            if (!token) {
              throw new Error("No token found");
            }

            const res = await fetch("/api/jwt/me", {
              method: "GET",
              headers: {
                "Authorization": `Bearer ${token}`,
              },
            });

            if (!res.ok) {
              // Try to refresh token
              const refreshed = await refreshAccessToken();
              if (!refreshed) {
                throw new Error("Token invalid and refresh failed");
              }
              
              // Retry with new token
              const newToken = getAccessToken();
              const retryRes = await fetch("/api/jwt/me", {
                method: "GET",
                headers: {
                  "Authorization": `Bearer ${newToken}`,
                },
              });
              
              if (!retryRes.ok) {
                throw new Error("Token invalid");
              }
              
              const updated = (await retryRes.json()) as User;
              setUser(updated);
              localStorage.setItem("remedi:user", JSON.stringify(updated));
            } else {
              const updated = (await res.json()) as User;
              setUser(updated);
              localStorage.setItem("remedi:user", JSON.stringify(updated));
            }
          } catch (err: any) {
            // Only log if it's not a simple 401 (token expired is expected)
            if (err?.status !== 401 && err?.message !== "Token invalid") {
              console.error("[useAuth] Failed to verify token:", err);
            }
            // Token invalid, clear local storage
            setUser(null);
            localStorage.removeItem("remedi:user");
            localStorage.removeItem("userId");
            clearTokens();
          }
        };
        verifyToken();
      } catch (e) {
        console.error("[useAuth] Failed to parse user data:", e);
        localStorage.removeItem("remedi:user");
        localStorage.removeItem("userId");
        clearTokens();
      }
    } else {
      // No user or invalid token, clear everything
      setUser(null);
      localStorage.removeItem("remedi:user");
      localStorage.removeItem("userId");
      clearTokens();
    }
    setLoading(false);
  }, []);

  const authHeaders = useMemo(() => {
    return () => {
      const token = getAccessToken();
      return token ? { "Authorization": `Bearer ${token}` } : {};
    };
  }, []);

  const login = async (input: {
    email?: string;
    phone?: string;
    password: string;
  }) => {
    try {
      const res = await fetch("/api/jwt/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("[useAuth] Login failed:", err);
        throw new Error(err?.detail || err?.error || "Login failed");
      }
      
      const data = await res.json();
      
      // Save tokens
      saveTokens({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        token_type: data.token_type,
      });
      
      // Save user data
      const userData = data.user;
      setUser(userData as User);
      localStorage.setItem("remedi:user", JSON.stringify(userData));
      localStorage.setItem("userId", userData.id);
    } catch (e: any) {
      console.error("[useAuth] Login error:", e);
      throw new Error(e?.message || "Network error during login");
    }
  };

  const register = async (input: {
    ho_ten: string;
    email?: string;
    so_dien_thoai?: string;
    dia_chi?: string;
    password: string;
    requestCollaborator?: boolean;
  }) => {
    try {
      // Check if email or phone is provided
      if (!input.email && !input.so_dien_thoai) {
        throw new Error("Email or phone number is required");
      }

      // Map frontend field to backend field
      const payload = {
        ho_ten: input.ho_ten,
        email: input.email,
        so_dien_thoai: input.so_dien_thoai,
        dia_chi: input.dia_chi,
        password: input.password,
        yeu_cau_cong_tac_vien: input.requestCollaborator || false,
      };

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("[useAuth] Registration failed:", err);
        throw new Error(err?.detail || err?.error || "Registration failed");
      }

      // Auto-login after registration using JWT
      await login({
        email: input.email,
        phone: input.so_dien_thoai,
        password: input.password,
      });
    } catch (e: any) {
      console.error("[useAuth] Registration error:", e);
      throw new Error(e?.message || "Network error during registration");
    }
  };

  const refreshUser = async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const res = await fetch("/api/jwt/me", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // Try to refresh token
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          throw new Error("Token refresh failed");
        }
        
        // Retry
        const newToken = getAccessToken();
        const retryRes = await fetch("/api/jwt/me", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${newToken}`,
          },
        });
        
        if (!retryRes.ok) {
          throw new Error("Failed to fetch user data");
        }
        
        const updated = (await retryRes.json()) as User;
        setUser(updated);
        localStorage.setItem("remedi:user", JSON.stringify(updated));
      } else {
        const updated = (await res.json()) as User;
        setUser(updated);
        localStorage.setItem("remedi:user", JSON.stringify(updated));
      }
    } catch (err) {
      console.error("[useAuth] Failed to refresh user:", err);
      setUser(null);
      clearTokens();
      localStorage.removeItem("remedi:user");
      localStorage.removeItem("userId");
    }
  };

  const updateProfile = async (updates: {
    ho_ten?: string;
    so_dien_thoai?: string;
    dia_chi?: string;
    old_password?: string;
    new_password?: string;
  }) => {
    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("Not authenticated");
      }

      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        console.error("[useAuth] Profile update failed:", err);
        throw new Error(err?.detail || err?.error || "Update failed");
      }

      const updated = (await res.json()) as User;
      setUser(updated);
      localStorage.setItem("remedi:user", JSON.stringify(updated));
    } catch (e: any) {
      console.error("[useAuth] Profile update error:", e);
      throw new Error(e?.message || "Network error during update");
    }
  };

  const logout = async () => {
    try {
      const token = getAccessToken();
      
      if (token) {
        await fetch("/api/jwt/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }).catch((err) => {
          console.error("[useAuth] Logout API call failed:", err);
          // Continue with local logout even if API call fails
        });
      }
    } catch (e) {
      console.error("[useAuth] Logout error:", e);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
      localStorage.removeItem("remedi:user");
      localStorage.removeItem("userId");
      clearTokens();
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    logout,
    register,
    updateProfile,
    refreshUser,
    authHeaders,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
