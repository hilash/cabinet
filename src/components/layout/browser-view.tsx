"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/stores/app-store";
import { useLocale } from "@/i18n/use-locale";

type BrowserViewBounds = { x: number; y: number; width: number; height: number };
type BrowserBridge = {
  runtime: "electron";
  createBrowserView: (url: string) => Promise<{ ok: boolean; viewId?: string }>;
  loadBrowserViewUrl: (viewId: string, url: string) => Promise<{ ok: boolean }>;
  setBrowserViewBounds: (viewId: string, bounds: BrowserViewBounds) => Promise<{ ok: boolean }>;
  setBrowserViewVisible: (viewId: string, visible: boolean) => Promise<{ ok: boolean }>;
  destroyBrowserView: (viewId: string) => Promise<{ ok: boolean }>;
};

function getBridge(): Partial<BrowserBridge> & { runtime?: "electron" } {
  return (window as unknown as { CabinetDesktop?: Partial<BrowserBridge> & { runtime?: "electron" } })
    .CabinetDesktop ?? {};
}

function normalizeEnteredUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed) || trimmed.startsWith("//")) return trimmed;
  return `https://${trimmed}`;
}

export function BrowserView() {
  const { t } = useLocale();
  const url = useAppStore((s) => s.browseUrl);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const [addressValue, setAddressValue] = useState(url ?? "");
  const [browserMode, setBrowserMode] = useState<"initializing" | "electron" | "iframe">(() => {
    const bridge = getBridge();
    return bridge.createBrowserView && bridge.destroyBrowserView ? "initializing" : "iframe";
  });
  const [fallbackReason, setFallbackReason] = useState<string | null>(null);
  const [initAttempt, setInitAttempt] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeLoadTokenRef = useRef(0);
  const iframeLoadedTokenRef = useRef(0);
  const [iframeLoadedToken, setIframeLoadedToken] = useState(0);
  const viewIdRef = useRef<string | null>(null);
  const updateBoundsRef = useRef<() => void>(() => {});
  const [iframeFailure, setIframeFailure] = useState<string | null>(null);
  const [iframePolicyBlocked, setIframePolicyBlocked] = useState(false);

  useEffect(() => {
    setAddressValue(url ?? "");
    setIframeFailure(null);
    setIframePolicyBlocked(false);
    iframeLoadTokenRef.current += 1;
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    let retries = 0;
    const maxRetries = 20;
    let retryTimer: number | null = null;

    const cleanup = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer);
        retryTimer = null;
      }
    };

    const failToIframe = (reason: string) => {
      setBrowserMode("iframe");
      setFallbackReason(reason);
    };

    const hasElectronBrowserBridge = () => {
      const bridge = getBridge();
      return !!bridge.createBrowserView && !!bridge.destroyBrowserView;
    };

    const attemptInit = () => {
      if (cancelled) return;
      const bridge = getBridge();
      if (!hasElectronBrowserBridge()) {
        retries += 1;
        if (retries >= maxRetries) {
          failToIframe("bridge-unavailable");
          return;
        }
        retryTimer = window.setTimeout(attemptInit, 100);
        return;
      }
      const createBrowserView = bridge.createBrowserView;
      const destroyBrowserView = bridge.destroyBrowserView;
      const loadBrowserViewUrl = bridge.loadBrowserViewUrl;
      if (!createBrowserView || !destroyBrowserView) {
        failToIframe("bridge-method-missing");
        return;
      }
      void createBrowserView(url || "about:blank")
        .then((result) => {
          if (cancelled) return;
          if (!result?.ok || !result.viewId) {
            failToIframe("create-browser-view-failed");
            return;
          }
          setBrowserMode("electron");
          setFallbackReason(null);
          viewIdRef.current = result.viewId;
          updateBoundsRef.current();
          const activeUrl = useAppStore.getState().browseUrl || "about:blank";
          if (loadBrowserViewUrl) void loadBrowserViewUrl(result.viewId, activeUrl);
        })
        .catch(() => {
          if (!cancelled) failToIframe("create-browser-view-threw");
        });
    };

    const existing = viewIdRef.current;
    if (existing) {
      const bridge = getBridge();
      const destroyBrowserView = bridge.destroyBrowserView;
      viewIdRef.current = null;
      if (destroyBrowserView) {
        void destroyBrowserView(existing);
      }
    }

    setBrowserMode(hasElectronBrowserBridge() ? "initializing" : "iframe");
    setFallbackReason(null);
    attemptInit();

    return () => {
      cancelled = true;
      cleanup();
      const bridge = getBridge();
      const destroyBrowserView = bridge.destroyBrowserView;
      const current = viewIdRef.current;
      viewIdRef.current = null;
      if (current && destroyBrowserView) {
        void destroyBrowserView(current);
      }
    };
  }, [initAttempt]);

  useEffect(() => {
    const bridge = getBridge();
    const viewId = viewIdRef.current;
    if (!bridge.createBrowserView || !bridge.destroyBrowserView || !viewId || browserMode !== "electron") {
      return;
    }
    const loadBrowserViewUrl = bridge.loadBrowserViewUrl;
    if (!loadBrowserViewUrl) return;
    void loadBrowserViewUrl(viewId, url || "about:blank");
  }, [url, browserMode]);

  useEffect(() => {
    const bridge = getBridge();
    if (!bridge.createBrowserView || !bridge.destroyBrowserView || browserMode !== "electron") return;
    const setBrowserViewBounds = bridge.setBrowserViewBounds;
    if (!setBrowserViewBounds) return;
    const updateBounds = () => {
      const viewId = viewIdRef.current;
      const el = containerRef.current;
      if (!viewId || !el) return;
      const rect = el.getBoundingClientRect();
      const x = Math.max(0, Math.round(rect.left));
      const y = Math.max(0, Math.round(rect.top));
      const width = Math.max(0, Math.round(rect.width));
      const height = Math.max(0, Math.round(rect.height));
      if (width < 64 || height < 64) return;
      void setBrowserViewBounds(viewId, { x, y, width, height });
    };
    updateBoundsRef.current = updateBounds;
    const ro = new ResizeObserver(updateBounds);
    const el = containerRef.current;
    if (el) ro.observe(el);
    window.addEventListener("resize", updateBounds);
    updateBounds();
    const timer = window.setTimeout(updateBounds, 120);
    return () => {
      window.clearTimeout(timer);
      updateBoundsRef.current = () => {};
      ro.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [browserMode]);

  useEffect(() => {
    const bridge = getBridge();
    const viewId = viewIdRef.current;
    if (!bridge.createBrowserView || !bridge.destroyBrowserView || !viewId || browserMode !== "electron") {
      return;
    }
    const setBrowserViewVisible = bridge.setBrowserViewVisible;
    if (!setBrowserViewVisible) return;
    void setBrowserViewVisible(viewId, true);
  }, [browserMode]);

  useEffect(() => {
    if (browserMode !== "iframe") {
      setIframePolicyBlocked(false);
      return;
    }
    if (!url || url === "about:blank") {
      setIframePolicyBlocked(false);
      return;
    }
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch(`/api/browser/frame-check?url=${encodeURIComponent(url)}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) {
          setIframePolicyBlocked(data?.blocked === true);
        }
      } catch {
        if (!cancelled) {
          setIframePolicyBlocked(false);
        }
      }
    };
    void check();
    return () => {
      cancelled = true;
    };
  }, [browserMode, url]);

  useEffect(() => {
    if (browserMode !== "iframe") {
      setIframeFailure(null);
      return;
    }
    if (!url || url === "about:blank") {
      setIframeFailure(null);
      return;
    }
    const loadToken = iframeLoadTokenRef.current;
    const timer = window.setTimeout(() => {
      if (iframePolicyBlocked) {
        setIframeFailure("blocked-or-failed");
        return;
      }
      if (iframeLoadedTokenRef.current < loadToken) {
        setIframeFailure("blocked-or-failed");
        return;
      }
      const iframe = iframeRef.current;
      if (!iframe) {
        setIframeFailure("blocked-or-failed");
        return;
      }
      try {
        const href = iframe.contentWindow?.location?.href || "";
        const doc = iframe.contentDocument;
        const title = (doc?.title || "").toLowerCase();
        const bodyText = (doc?.body?.innerText || "").toLowerCase();
        const hasConnectionErrorText =
          bodyText.includes("refused to connect") ||
          bodyText.includes("can't be reached") ||
          bodyText.includes("cannot be reached") ||
          bodyText.includes("connection") && bodyText.includes("failed");
        if (
          href === "about:blank" ||
          href.startsWith("chrome-error://") ||
          title.includes("error") ||
          hasConnectionErrorText
        ) {
          setIframeFailure("blocked-or-failed");
          return;
        }
      } catch {
        setIframeFailure(null);
        return;
      }
      setIframeFailure(null);
    }, 2500);
    return () => {
      window.clearTimeout(timer);
    };
  }, [browserMode, url, iframeLoadedToken, iframePolicyBlocked]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <Header />
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
        <div className="grid grid-cols-[1fr_minmax(0,720px)_1fr] items-center gap-3 border-b border-border/70 bg-background/80 px-4 py-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 truncate">
            <Globe className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={addressValue}
            onChange={(event) => setAddressValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              const nextUrl = normalizeEnteredUrl(addressValue);
              setAppMode("browse", nextUrl);
              setAddressValue(nextUrl ?? "");
            }}
            placeholder={t("editor:browser.noUrl")}
            className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground shadow-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
          />
          <div className="flex justify-end gap-2">
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:bg-muted"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("editor:browser.openExternally")}
              </a>
            ) : null}
          </div>
        </div>
        <div ref={containerRef} className="relative flex-1 min-h-0">
          {browserMode === "iframe" ? (
            <>
              <iframe
                ref={iframeRef}
                title={t("editor:browser.openExternally")}
                src={url || "about:blank"}
                onLoad={() => {
                  iframeLoadedTokenRef.current = iframeLoadTokenRef.current;
                  setIframeLoadedToken(iframeLoadTokenRef.current);
                }}
                className="h-full w-full border-0 bg-white"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-top-navigation-by-user-activation"
              />
              {iframeFailure ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/85 p-6 text-center">
                  <div className="max-w-md rounded border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
                    <div>This page can’t be rendered in an iframe.</div>
                    <div className="mt-1">Use “Open externally”.</div>
                  </div>
                </div>
              ) : null}
              {fallbackReason ? (
                <div className="pointer-events-none absolute bottom-3 right-3 rounded border border-border bg-background/90 px-2 py-1 text-[10px] text-muted-foreground">
                  fallback: {fallbackReason}
                </div>
              ) : null}
            </>
          ) : (
            <div className="h-full w-full bg-white" />
          )}
        </div>
      </div>
    </div>
  );
}
