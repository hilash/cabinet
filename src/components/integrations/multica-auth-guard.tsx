"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useAuthStore } from "@multica/core/auth";
import { LoginPage } from "@multica/views/auth";
import { LOCAL_TOKEN_PREFIX } from "@multica/core/platform/local-mode";
import { useAppStore, type SectionType } from "@/stores/app-store";

const MULTICA_SECTIONS = new Set<SectionType>([
  "inbox",
  "my-issues",
  "issues",
  "issue-detail",
  "projects",
  "project-detail",
  "agents-multica",
  "agent-multica",
  "runtimes",
  "skills",
  "multica-settings",
]);

function MulticaUnavailable({
  onRetry,
  onBackHome,
}: {
  onRetry: () => void;
  onBackHome: () => void;
}) {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="max-w-md rounded-lg border bg-card p-6 text-center">
        <div className="text-base font-semibold">Multica 服务不可用</div>
        <p className="mt-2 text-sm text-muted-foreground">
          已切换为离线模式。你可以继续使用 Cabinet 知识库、编辑器和 AI 面板。
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
            onClick={onBackHome}
          >
            返回知识库
          </button>
          <button
            type="button"
            className="rounded-md border px-3 py-2 text-sm"
            onClick={onRetry}
          >
            重试连接
          </button>
        </div>
      </div>
    </div>
  );
}

class MulticaRenderErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback: React.ReactNode; resetKey: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode; resetKey: string }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: { resetKey: string }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

export function MulticaAuthGuard({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const section = useAppStore((s) => s.section);
  const setSection = useAppStore((s) => s.setSection);
  const [backendState, setBackendState] = useState<
    "unknown" | "checking" | "online" | "offline"
  >("unknown");

  const isMulticaSection = MULTICA_SECTIONS.has(section.type);
  const isLocalSession = useMemo(() => {
    if (typeof window === "undefined") return false;
    const token = window.localStorage.getItem("multica_token");
    return Boolean(token && token.startsWith(LOCAL_TOKEN_PREFIX));
  }, [user]);

  const checkBackend = useCallback(async () => {
    setBackendState("checking");
    try {
      const res = await fetch("/multica-api/health", {
        method: "GET",
        cache: "no-store",
      });
      setBackendState(res.ok ? "online" : "offline");
    } catch {
      setBackendState("offline");
    }
  }, []);

  useEffect(() => {
    if (!user || !isLocalSession) {
      setBackendState("unknown");
      return;
    }
    void checkBackend();
  }, [user, isLocalSession, checkBackend]);

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
          // 本地离线登录后直接回到知识库主界面，避免停留在依赖 Multica API 的页面。
          const token = window.localStorage.getItem("multica_token");
          if (token?.startsWith(LOCAL_TOKEN_PREFIX)) {
            setSection({ type: "home" });
          }
        }}
      />
    );
  }

  const unavailableFallback = (
    <MulticaUnavailable
      onRetry={() => void checkBackend()}
      onBackHome={() => setSection({ type: "home" })}
    />
  );

  if (isLocalSession && isMulticaSection) {
    if (backendState === "checking" || backendState === "unknown") {
      return (
        <div className="flex h-full items-center justify-center">
          <div className="animate-pulse text-sm text-muted-foreground">
            正在检查 Multica 服务...
          </div>
        </div>
      );
    }

    if (backendState === "offline") {
      return unavailableFallback;
    }
  }

  return (
    <MulticaRenderErrorBoundary
      resetKey={`${section.type}:${section.id || section.slug || ""}`}
      fallback={unavailableFallback}
    >
      {children}
    </MulticaRenderErrorBoundary>
  );
}
