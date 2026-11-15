import { useEffect, useState, type ReactNode } from "react";
import { getCurrentUser, login, logout } from "../services/auth";
import type { AuthenticatedUser, LoginCredentials } from "../types/auth";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let active = true;
    async function restoreSession(): Promise<void> {
      try {
        const currentUser = await getCurrentUser();
        if (active) setUser(currentUser);
      } catch {
        if (active)
          setSessionError(
            "Não foi possível conectar ao servidor. Verifique se o backend está em execução."
          );
      } finally {
        if (active) setIsLoading(false);
      }
    }
    void restoreSession();
    return () => {
      active = false;
    };
  }, []);

  async function signIn(credentials: LoginCredentials): Promise<void> {
    const authenticatedUser = await login(credentials);
    setSessionError("");
    setUser(authenticatedUser);
  }

  async function signOut(): Promise<void> {
    await logout();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, sessionError, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
