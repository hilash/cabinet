"use client";

import dynamic from "next/dynamic";
import { useCallback, type ReactNode } from "react";

const CoreProvider = dynamic(
  () => import("@multica/core/platform").then((m) => m.CoreProvider),
  { ssr: false }
);

type MulticaProviderProps = {
  children: ReactNode;
};

export function MulticaProvider({ children }: MulticaProviderProps) {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_MULTICA_API_URL || "/multica-api";
  const wsUrl =
    (typeof window !== "undefined" && (window as Record<string, any>).CabinetDesktop?.multicaWsUrl) ||
    process.env.NEXT_PUBLIC_MULTICA_WS_URL ||
    "ws://localhost:8080/ws";

  const onLogin = useCallback(() => {
    document.cookie = "multica-authed=1; path=/; max-age=2592000; SameSite=Lax";
  }, []);

  const onLogout = useCallback(() => {
    document.cookie = "multica-authed=; path=/; max-age=0";
  }, []);

  return (
    <CoreProvider
      apiBaseUrl={apiBaseUrl}
      wsUrl={wsUrl}
      onLogin={onLogin}
      onLogout={onLogout}
    >
      {children}
    </CoreProvider>
  );
}
