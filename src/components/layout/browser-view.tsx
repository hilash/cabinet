"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Globe, RefreshCw } from "lucide-react";
import { Header } from "@/components/layout/header";
import { useAppStore } from "@/stores/app-store";
import { useLocale } from "@/i18n/use-locale";

type BrowserViewBounds = { x: number; y: number; width: number; height: number };
type BrowserViewNavResult = { ok: boolean; skipped?: boolean };
type BrowserBridge = {
  runtime: "electron";
  createBrowserView: (url: string) => Promise<{ ok: boolean; viewId?: string }>;
  loadBrowserViewUrl: (viewId: string, url: string) => Promise<BrowserViewNavResult>;
  setBrowserViewBounds: (viewId: string, bounds: BrowserViewBounds) => Promise<{ ok: boolean }>;
  setBrowserViewVisible: (viewId: string, visible: boolean) => Promise<{ ok: boolean }>;
  browserViewGoBack: (viewId: string) => Promise<BrowserViewNavResult>;
  browserViewGoForward: (viewId: string) => Promise<BrowserViewNavResult>;
  browserViewReload: (viewId: string) => Promise<BrowserViewNavResult>;
  onBrowserViewNavigated: (
    listener: (payload: { viewId?: string; url?: string }) => void
  ) => () => void;
  destroyBrowserView: (viewId: string) => Promise<{ ok: boolean }>;
};

type BrowserSessionState = {
  history: string[];
  index: number;
  url: string | null;
};

const BROWSER_SESSION_STORAGE_KEY = "cabinet.browser.session";

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

function normalizeSessionUrl(value: string | null | undefined): string {
  const trimmed = (value || "about:blank").trim();
  return trimmed || "about:blank";
}

function loadBrowserSessionState(): BrowserSessionState {
  if (typeof window === "undefined") {
    return { history: ["about:blank"], index: 0, url: "about:blank" };
  }
  try {
    const raw = window.sessionStorage.getItem(BROWSER_SESSION_STORAGE_KEY);
    if (!raw) {
      return { history: ["about:blank"], index: 0, url: "about:blank" };
    }
    const parsed = JSON.parse(raw) as {
      history?: unknown;
      index?: unknown;
      url?: unknown;
    };
    const history = Array.isArray(parsed.history)
      ? parsed.history.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
      : [];
    const cleanedHistory = history.length > 0 ? history.map((entry) => normalizeSessionUrl(entry)) : ["about:blank"];
    const nextIndex =
      typeof parsed.index === "number" && Number.isFinite(parsed.index)
        ? Math.max(0, Math.min(cleanedHistory.length - 1, Math.floor(parsed.index)))
        : cleanedHistory.length - 1;
    const nextUrl =
      typeof parsed.url === "string" && parsed.url.trim().length > 0
        ? normalizeSessionUrl(parsed.url)
        : cleanedHistory[nextIndex] || "about:blank";
    return {
      history: cleanedHistory,
      index: nextIndex,
      url: nextUrl,
    };
  } catch {
    return { history: ["about:blank"], index: 0, url: "about:blank" };
  }
}

function persistBrowserSessionState(state: BrowserSessionState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(BROWSER_SESSION_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function BrowserView() {
  const { t } = useLocale();
  const url = useAppStore((s) => s.browseUrl);
  const setAppMode = useAppStore((s) => s.setAppMode);
  const initialSessionRef = useRef<BrowserSessionState>(loadBrowserSessionState());
  const [addressValue, setAddressValue] = useState(url ?? initialSessionRef.current.url ?? "");
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
  const iframeHistoryRef = useRef<string[]>(initialSessionRef.current.history);
  const iframeHistoryIndexRef = useRef<number>(initialSessionRef.current.index);
  const iframeNavActionRef = useRef<"back" | "forward" | null>(null);
  const suppressNextElectronLoadRef = useRef(false);
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const viewIdRef = useRef<string | null>(null);
  const updateBoundsRef = useRef<() => void>(() => {});
  const [iframeFailure, setIframeFailure] = useState<string | null>(null);
  const [iframePolicyBlocked, setIframePolicyBlocked] = useState(false);

  const navigateBack = () => {
    const applyAppHistoryBack = () => {
      const nextIndex = iframeHistoryIndexRef.current - 1;
      if (nextIndex < 0) return;
      iframeHistoryIndexRef.current = nextIndex;
      iframeNavActionRef.current = "back";
      setAppMode("browse", iframeHistoryRef.current[nextIndex] || "about:blank");
    };
    if (browserMode === "electron") {
      const viewId = viewIdRef.current;
      const bridge = getBridge();
      if (viewId && bridge.browserViewGoBack) {
        iframeNavActionRef.current = "back";
        void bridge.browserViewGoBack(viewId)
          .then((result) => {
            if (result?.ok && !result.skipped) return;
            iframeNavActionRef.current = null;
            applyAppHistoryBack();
          })
          .catch(() => {
            iframeNavActionRef.current = null;
            applyAppHistoryBack();
          });
        return;
      }
      applyAppHistoryBack();
      return;
    }
    if (browserMode === "iframe") {
      try {
        iframeRef.current?.contentWindow?.history.back();
        return;
      } catch {
        applyAppHistoryBack();
      }
    }
  };

  const navigateForward = () => {
    const applyAppHistoryForward = () => {
      const nextIndex = iframeHistoryIndexRef.current + 1;
      if (nextIndex >= iframeHistoryRef.current.length) return;
      iframeHistoryIndexRef.current = nextIndex;
      iframeNavActionRef.current = "forward";
      setAppMode("browse", iframeHistoryRef.current[nextIndex] || "about:blank");
    };
    if (browserMode === "electron") {
      const viewId = viewIdRef.current;
      const bridge = getBridge();
      if (viewId && bridge.browserViewGoForward) {
        iframeNavActionRef.current = "forward";
        void bridge.browserViewGoForward(viewId)
          .then((result) => {
            if (result?.ok && !result.skipped) return;
            iframeNavActionRef.current = null;
            applyAppHistoryForward();
          })
          .catch(() => {
            iframeNavActionRef.current = null;
            applyAppHistoryForward();
          });
        return;
      }
      applyAppHistoryForward();
      return;
    }
    if (browserMode === "iframe") {
      applyAppHistoryForward();
    }
  };

  const reloadPage = () => {
    const applyReloadFallback = () => {
      setIframeReloadKey((k) => k + 1);
    };
    if (browserMode === "electron") {
      const viewId = viewIdRef.current;
      const bridge = getBridge();
      if (!viewId) {
        applyReloadFallback();
        return;
      }
      if (bridge.browserViewReload) {
        void bridge.browserViewReload(viewId)
          .then((result) => {
            if (result?.ok && !result.skipped) return;
            if (bridge.loadBrowserViewUrl) {
              void bridge.loadBrowserViewUrl(viewId, "__cabinet_nav_reload__")
                .then((fallbackResult) => {
                  if (fallbackResult?.ok && !fallbackResult.skipped) return;
                  applyReloadFallback();
                })
                .catch(() => {
                  applyReloadFallback();
                });
              return;
            }
            applyReloadFallback();
          })
          .catch(() => {
            if (bridge.loadBrowserViewUrl) {
              void bridge.loadBrowserViewUrl(viewId, "__cabinet_nav_reload__")
                .then((fallbackResult) => {
                  if (fallbackResult?.ok && !fallbackResult.skipped) return;
                  applyReloadFallback();
                })
                .catch(() => {
                  applyReloadFallback();
                });
              return;
            }
            applyReloadFallback();
          });
        return;
      }
      if (bridge.loadBrowserViewUrl) {
        void bridge.loadBrowserViewUrl(viewId, "__cabinet_nav_reload__")
          .then((result) => {
            if (result?.ok && !result.skipped) return;
            applyReloadFallback();
          })
          .catch(() => {
            applyReloadFallback();
          });
        return;
      }
      applyReloadFallback();
      return;
    }
    if (browserMode === "iframe") {
      applyReloadFallback();
    }
  };

  useEffect(() => {
    if (url === null) {
      const session = initialSessionRef.current;
      if (session.url && session.url !== "about:blank") {
        setAppMode("browse", session.url);
      }
      return;
    }
    const normalizedUrl = normalizeSessionUrl(url);
    setAddressValue(normalizedUrl);
    setIframeFailure(null);
    setIframePolicyBlocked(false);
    iframeLoadTokenRef.current += 1;
    const navAction = iframeNavActionRef.current;
    if (navAction === "back" || navAction === "forward") {
      iframeNavActionRef.current = null;
      persistBrowserSessionState({
        history: iframeHistoryRef.current,
        index: iframeHistoryIndexRef.current,
        url: normalizedUrl,
      });
      return;
    }
    const history = iframeHistoryRef.current;
    const currentIndex = iframeHistoryIndexRef.current;
    if (currentIndex >= 0 && history[currentIndex] === normalizedUrl) {
      persistBrowserSessionState({ history, index: currentIndex, url: normalizedUrl });
      return;
    }
    const nextHistory = currentIndex >= 0 ? history.slice(0, currentIndex + 1) : [];
    nextHistory.push(normalizedUrl);
    iframeHistoryRef.current = nextHistory;
    iframeHistoryIndexRef.current = nextHistory.length - 1;
    persistBrowserSessionState({
      history: nextHistory,
      index: iframeHistoryIndexRef.current,
      url: normalizedUrl,
    });
  }, [url, setAppMode]);

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
          if (loadBrowserViewUrl) void loadBrowserViewUrl(result.viewId, activeUrl).catch(() => {});
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
    const subscribe = bridge.onBrowserViewNavigated;
    if (!subscribe) return;
    const unsubscribe = subscribe((payload) => {
      const activeViewId = viewIdRef.current;
      if (!activeViewId || payload?.viewId !== activeViewId) return;
      const nextUrl = normalizeSessionUrl(payload?.url || "about:blank");
      const history = iframeHistoryRef.current;
      const currentIndex = iframeHistoryIndexRef.current;
      const navAction = iframeNavActionRef.current;
      if (navAction === "back" || navAction === "forward") {
        iframeNavActionRef.current = null;
        let nextIndex = navAction === "back" ? Math.max(0, currentIndex - 1) : Math.min(history.length - 1, currentIndex + 1);
        if (history[nextIndex] !== nextUrl) {
          const start = navAction === "back" ? Math.max(0, currentIndex - 1) : Math.min(history.length - 1, currentIndex + 1);
          const end = navAction === "back" ? 0 : history.length - 1;
          const step = navAction === "back" ? -1 : 1;
          let matchedIndex = -1;
          for (let i = start; navAction === "back" ? i >= end : i <= end; i += step) {
            if (history[i] === nextUrl) {
              matchedIndex = i;
              break;
            }
          }
          if (matchedIndex >= 0) {
            nextIndex = matchedIndex;
          } else {
            const nextHistory = currentIndex >= 0 ? history.slice(0, currentIndex + 1) : [];
            nextHistory.push(nextUrl);
            iframeHistoryRef.current = nextHistory;
            nextIndex = nextHistory.length - 1;
          }
        }
        iframeHistoryIndexRef.current = nextIndex;
        const nextHistory = iframeHistoryRef.current;
        persistBrowserSessionState({ history: nextHistory, index: nextIndex, url: nextUrl });
        setAddressValue(nextUrl);
        if (useAppStore.getState().browseUrl !== nextUrl) {
          suppressNextElectronLoadRef.current = true;
          setAppMode("browse", nextUrl);
        }
        return;
      }
      if (currentIndex >= 0 && history[currentIndex] === nextUrl) {
        persistBrowserSessionState({ history, index: currentIndex, url: nextUrl });
        setAddressValue(nextUrl);
        return;
      }
      const nextHistory = currentIndex >= 0 ? history.slice(0, currentIndex + 1) : [];
      nextHistory.push(nextUrl);
      iframeHistoryRef.current = nextHistory;
      iframeHistoryIndexRef.current = nextHistory.length - 1;
      persistBrowserSessionState({
        history: nextHistory,
        index: iframeHistoryIndexRef.current,
        url: nextUrl,
      });
      setAddressValue(nextUrl);
      if (useAppStore.getState().browseUrl !== nextUrl) {
        suppressNextElectronLoadRef.current = true;
        setAppMode("browse", nextUrl);
      }
    });
    return () => {
      unsubscribe();
    };
  }, [setAppMode]);

  useEffect(() => {
    const bridge = getBridge();
    const viewId = viewIdRef.current;
    if (!bridge.createBrowserView || !bridge.destroyBrowserView || !viewId || browserMode !== "electron") {
      return;
    }
    if (suppressNextElectronLoadRef.current) {
      suppressNextElectronLoadRef.current = false;
      return;
    }
    const loadBrowserViewUrl = bridge.loadBrowserViewUrl;
    if (!loadBrowserViewUrl) return;
    void loadBrowserViewUrl(viewId, url || "about:blank").catch(() => {});
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
            <button
              type="button"
              onClick={navigateBack}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
              aria-label={t("editor:browser.back")}
              title={t("editor:browser.back")}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={navigateForward}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
              aria-label={t("editor:browser.forward")}
              title={t("editor:browser.forward")}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={reloadPage}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
              aria-label={t("editor:browser.reload")}
              title={t("editor:browser.reload")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
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
                key={`${url || "about:blank"}:${iframeReloadKey}`}
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
