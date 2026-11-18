"use client";
import { createContext, useContext } from "react";

/** Giriş/kayıt formları popup (intercepting route) içinde mi render ediliyor? */
const AuthModalCtx = createContext(false);
export const useInAuthModal = () => useContext(AuthModalCtx);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  return <AuthModalCtx.Provider value={true}>{children}</AuthModalCtx.Provider>;
}
