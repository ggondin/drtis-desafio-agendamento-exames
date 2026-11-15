import { createContext, useContext } from "react";
import type { AuthenticatedUser, LoginCredentials } from "../types/auth";

export type AuthContextValue = {
  user: AuthenticatedUser | null;
  isLoading: boolean;
  sessionError: string;
  signIn: (credentials: LoginCredentials) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("A autenticação não está disponível.");
  return context;
}
