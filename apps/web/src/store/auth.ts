import { create } from "zustand";
import type { UserRole } from "@localbms/shared";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string | null;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  setAuth: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null });
  },
  hydrate: () => {
    const token = localStorage.getItem("token");
    const raw = localStorage.getItem("user");
    if (token && raw) {
      try {
        set({ token, user: JSON.parse(raw) as User });
      } catch {
        localStorage.clear();
      }
    }
  },
}));
