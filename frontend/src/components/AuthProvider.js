"use client";
import { AuthProvider as Provider } from "@/hooks/useAuth";

export function AuthProvider({ children }) {
  return <Provider>{children}</Provider>;
}
