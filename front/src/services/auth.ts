import type { AuthenticatedUser, LoginCredentials } from "../types/auth";

type ErrorResponse = { message?: string };

async function readError(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as ErrorResponse;
  return body.message ?? "Não foi possível concluir a operação.";
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const response = await fetch("/api/auth/me");
  if (response.status === 401) return null;
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AuthenticatedUser;
}

export async function login(
  credentials: LoginCredentials
): Promise<AuthenticatedUser> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials)
  });
  if (!response.ok) throw new Error(await readError(response));
  return (await response.json()) as AuthenticatedUser;
}

export async function logout(): Promise<void> {
  const response = await fetch("/api/auth/logout", { method: "POST" });
  if (!response.ok && response.status !== 401)
    throw new Error(await readError(response));
}
