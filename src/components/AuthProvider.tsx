"use client";

import { ReactNode } from "react";

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  // better-auth handles session state internally via cookies
  // No explicit provider needed, but this wrapper allows future expansion
  return <>{children}</>;
}
