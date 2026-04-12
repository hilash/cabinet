"use client";

import dynamic from "next/dynamic";
import { type ReactNode } from "react";

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
    process.env.NEXT_PUBLIC_MULTICA_WS_URL || "ws://localhost:8080/ws";

  return (
    <CoreProvider apiBaseUrl={apiBaseUrl} wsUrl={wsUrl}>
      {children}
    </CoreProvider>
  );
}
