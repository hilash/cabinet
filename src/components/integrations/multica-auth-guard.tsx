"use client";

import { useState, useEffect } from "react";

export function MulticaAuthGuard({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/multica-api/me", { credentials: "include" })
      .then((r) => {
        setAuthenticated(r.ok);
      })
      .catch(() => setAuthenticated(false));
  }, []);

  if (authenticated === null) return null;

  if (!authenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
        <p className="text-sm">Connect to Multica to access this feature</p>
        <a
          href="/multica-auth/login"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Connect Multica
        </a>
      </div>
    );
  }

  return <>{children}</>;
}
