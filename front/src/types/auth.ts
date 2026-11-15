export type UserRole = "clinic" | "patient";

export type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
};

export type LoginCredentials = {
  email: string;
  password: string;
};
