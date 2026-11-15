export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorResponse = { message?: string };

export async function requestJson<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(path, options);
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as ErrorResponse;
    throw new ApiError(
      response.status,
      error.message ?? "Não foi possível concluir a operação.",
    );
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
