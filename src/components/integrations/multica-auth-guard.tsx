"use client";

import { useAuthStore } from "@multica/core/auth";
import { LoginPage } from "@multica/views/auth";

export function MulticaAuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onSuccess={() => {
          // AuthStore already updated — React will re-render and show children
        }}
      />
    );
  }

  return <>{children}</>;
}
