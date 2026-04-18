"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAppStore } from "@/stores/app-store";
import {
  Settings,
  CheckCircle,
  XCircle,
  RefreshCw,
  Sparkles,
  Bell,
  Plug,
  Cpu,
  Eye,
  EyeOff,
  Save,
  Loader2,
  CloudDownload,
  Palette,
  Check,
  Info,
  Terminal,
  ExternalLink,
  ChevronDown,
  Copy,
  ClipboardCheck,
  HardDrive,
  FolderOpen,
  RotateCw,
} from "lucide-react";
import { Button } from "@multica/ui/components/ui/button";
import { Input } from "@multica/ui/components/ui/input";
import { ScrollArea } from "@multica/ui/components/ui/scroll-area";
import { UpdateSummary } from "@/components/system/update-summary";
import { useCabinetUpdate } from "@/hooks/use-cabinet-update";
import { useTheme } from "next-themes";
import {
  THEMES,
  applyTheme,
  getStoredThemeName,
  storeThemeName,
  type ThemeDefinition,
} from "@/lib/themes";
import { cn } from "@/lib/utils";
import type { ProviderInfo } from "@/types/agents";
import { useAuthStore } from "@multica/core/auth";

interface McpServer {
  name: string;
  command: string;
  enabled: boolean;
  env: Record<string, string>;
  description?: string;
}

interface IntegrationConfig {
  mcp_servers: Record<string, McpServer>;
  notifications: {
    browser_push: boolean;
    telegram: { enabled: boolean; bot_token: string; chat_id: string; bidirectional?: boolean };
    slack_webhook: { enabled: boolean; url: string };
    email: { enabled: boolean; frequency: "hourly" | "daily"; to: string };
  };
}

type Tab = "providers" | "storage" | "integrations" | "notifications" | "appearance" | "updates" | "about";

function TerminalCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="flex items-center gap-2 rounded-lg px-3 py-2 mt-1.5 font-mono text-[12px]"
      style={{ background: "#1e1e1e", color: "#d4d4d4" }}
    >
      <span style={{ color: "#6A9955" }}>$</span>
      <span className="flex-1 select-all">{command}</span>
      <button
        onClick={copy}
        className="shrink-0 p-1 rounded transition-colors hover:bg-white/10"
        title="Copy to clipboard"
      >
        {copied ? (
          <ClipboardCheck className="size-3.5" style={{ color: "#6A9955" }} />
        ) : (
          <Copy className="size-3.5" style={{ color: "#808080" }} />
        )}
      </button>
    </div>
  );
}

type SetupStep = { title: string; detail: string; cmd?: string; openTerminal?: boolean; link?: { label: string; url: string } };

const PROVIDER_SETUP_STEPS: Record<string, SetupStep[]> = {
  "claude-code": [
    { title: "Get a Claude subscription", detail: "Any Claude Code subscription will do (Pro, Max, or Team).", link: { label: "Open Claude billing", url: "https://claude.ai/settings/billing" } },
    { title: "Open a terminal", detail: "You'll need a terminal to run the next steps.", openTerminal: true },
    { title: "Install Claude Code", detail: "Run the following in your terminal:", cmd: "npm install -g @anthropic-ai/claude-code" },
    { title: "Log in to Claude", detail: "Authenticate with your subscription:", cmd: "claude auth login" },
    { title: "Verify login", detail: "Check that you're logged in:", cmd: "claude auth status" },
  ],
  "codex-cli": [
    { title: "Open a terminal", detail: "You'll need a terminal to run the next steps.", openTerminal: true },
    { title: "Install Codex CLI", detail: "Run the following in your terminal:", cmd: "npm i -g @openai/codex" },
    { title: "Log in to Codex", detail: "Authenticate with your ChatGPT or API account:", cmd: "codex login" },
    { title: "Verify login", detail: "Check that you're logged in:", cmd: "codex login status" },
  ],
};

export function SettingsPage() {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [defaultProvider, setDefaultProvider] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProviders, setSavingProviders] = useState(false);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [dataDir, setDataDir] = useState("");
  const [dataDirPending, setDataDirPending] = useState<string | null>(null);
  const [dataDirBrowsing, setDataDirBrowsing] = useState(false);
  const [dataDirSaving, setDataDirSaving] = useState(false);
  const [dataDirRestartNeeded, setDataDirRestartNeeded] = useState(false);
  const VALID_TABS: Tab[] = ["providers", "storage", "integrations", "notifications", "appearance", "updates", "about"];
  const initialTab = (() => {
    const slug = useAppStore.getState().section.slug as Tab | undefined;
    return slug && VALID_TABS.includes(slug) ? slug : "providers";
  })();
  const [tab, setTabState] = useState<Tab>(initialTab);
  const initializedRef = useRef(false);
  const multicaUser = useAuthStore((s) => s.user);
  const multicaLogout = useAuthStore((s) => s.logout);

  // Sync tab changes to hash
  const setTab = useCallback((t: Tab) => {
    setTabState(t);
    useAppStore.getState().setSection({ type: "settings", slug: t });
  }, []);

  // Listen for external hash changes (browser back/forward)
  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      // Set hash on first render if it's just #/settings
      if (!useAppStore.getState().section.slug) {
        useAppStore.getState().setSection({ type: "settings", slug: tab });
      }
    }
    const unsub = useAppStore.subscribe((state, prev) => {
      if (state.section.type === "settings" && state.section.slug !== prev.section.slug) {
        const slug = state.section.slug as Tab | undefined;
        if (slug && VALID_TABS.includes(slug)) {
          setTabState(slug);
        }
      }
    });
    return unsub;
  }, []);
  const [config, setConfig] = useState<IntegrationConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [activeThemeName, setActiveThemeName] = useState<string | null>(null);
  const { setTheme: setNextTheme } = useTheme();
  const {
    update,
    loading: updateLoading,
    refreshing: updateRefreshing,
    applyPending,
    backupPending,
    backupPath,
    actionError,
    refresh: refreshUpdate,
    createBackup,
    openDataDir,
    applyUpdate,
  } = useCabinetUpdate();

  // Sync active theme name on mount
  useEffect(() => {
    setActiveThemeName(getStoredThemeName() || "paper");
  }, []);

  const selectTheme = (themeDef: ThemeDefinition) => {
    applyTheme(themeDef);
    setActiveThemeName(themeDef.name);
    storeThemeName(themeDef.name);
    setNextTheme(themeDef.type);
  };

  const darkThemes = THEMES.filter((t) => t.type === "dark");
  const lightThemes = THEMES.filter((t) => t.type === "light");

  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch("/api/agents/providers");
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setDefaultProvider(data.defaultProvider || "");
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProviderSettings = useCallback(async (
    nextDefaultProvider: string,
    disabledProviderIds: string[],
    migrations: Array<{ fromProviderId: string; toProviderId: string }> = []
  ) => {
    setSavingProviders(true);
    try {
      const res = await fetch("/api/agents/providers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultProvider: nextDefaultProvider,
          disabledProviderIds,
          migrations,
        }),
      });
      if (res.ok) {
        await refresh(true);
        return true;
      }

      const data = await res.json().catch(() => null);
      if (res.status === 409 && data?.conflicts) {
        const message = (data.conflicts as Array<{
          providerId: string;
          agentSlugs: string[];
          jobs: Array<{ jobName: string }>;
          suggestedProviderId: string;
        }>).map((conflict) =>
          `${conflict.providerId}: ${conflict.agentSlugs.length} agents, ${conflict.jobs.length} jobs`
        ).join("\n");
        window.alert(`Provider disable blocked until assignments are migrated:\n${message}`);
      }
    } catch {
      // ignore
    } finally {
      setSavingProviders(false);
    }
    return false;
  }, [refresh]);

  const getProviderName = (providerId: string) =>
    providers.find((provider) => provider.id === providerId)?.name || providerId;

  const describeProviderUsage = (provider: ProviderInfo) => {
    const parts: string[] = [];
    if ((provider.usage?.agentCount ?? 0) > 0) {
      parts.push(`${provider.usage!.agentCount} agent${provider.usage!.agentCount === 1 ? "" : "s"}`);
    }
    if ((provider.usage?.jobCount ?? 0) > 0) {
      parts.push(`${provider.usage!.jobCount} job${provider.usage!.jobCount === 1 ? "" : "s"}`);
    }
    return parts.join(", ");
  };

  const loadConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/agents/config/integrations");
      if (res.ok) {
        setConfig(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setConfigLoading(false);
    }
  }, []);

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch("/api/agents/config/integrations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const loadDataDir = useCallback(async () => {
    try {
      const res = await fetch("/api/system/data-dir");
      if (res.ok) {
        const data = await res.json();
        setDataDir(data.dataDir || "");
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    refresh();
    loadConfig();
    loadDataDir();
  }, [refresh, loadConfig, loadDataDir]);

  const toggleReveal = (key: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const updateMcp = (id: string, field: string, value: unknown) => {
    if (!config) return;
    setConfig({
      ...config,
      mcp_servers: {
        ...config.mcp_servers,
        [id]: { ...config.mcp_servers[id], [field]: value },
      },
    });
  };

  const updateMcpEnv = (id: string, envKey: string, value: string) => {
    if (!config) return;
    setConfig({
      ...config,
      mcp_servers: {
        ...config.mcp_servers,
        [id]: {
          ...config.mcp_servers[id],
          env: { ...config.mcp_servers[id].env, [envKey]: value },
        },
      },
    });
  };

  const updateNotif = (path: string, value: unknown) => {
    if (!config) return;
    const parts = path.split(".");
    const notif = { ...config.notifications } as Record<string, unknown>;
    if (parts.length === 1) {
      notif[parts[0]] = value;
    } else {
      notif[parts[0]] = { ...(notif[parts[0]] as Record<string, unknown>), [parts[1]]: value };
    }
    setConfig({ ...config, notifications: notif as IntegrationConfig["notifications"] });
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "providers", label: "提供商", icon: <Cpu className="h-3.5 w-3.5" /> },
    { id: "storage", label: "存储", icon: <HardDrive className="h-3.5 w-3.5" /> },
    { id: "integrations", label: "集成", icon: <Plug className="h-3.5 w-3.5" /> },
    { id: "notifications", label: "通知", icon: <Bell className="h-3.5 w-3.5" /> },
    { id: "appearance", label: "外观", icon: <Palette className="h-3.5 w-3.5" /> },
    { id: "updates", label: "更新", icon: <CloudDownload className="h-3.5 w-3.5" /> },
    { id: "about", label: "关于", icon: <Info className="h-3.5 w-3.5" /> },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-3 border-b border-border transition-[padding] duration-200"
        style={{ paddingLeft: `calc(1rem + var(--sidebar-toggle-offset, 0px))` }}
      >
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
            Settings
          </h2>
        </div>
        <div className="flex items-center gap-1.5">
<Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 text-[12px]"
            onClick={() => { refresh(); loadConfig(); }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors",
              tab === t.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        <div className="p-4 space-y-6 max-w-2xl">
          {/* Appearance Tab */}
          {tab === "appearance" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[13px] font-semibold mb-1">主题</h3>
                <p className="text-[12px] text-muted-foreground mb-4">
                  选择界面主题。
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-2">浅色主题</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {lightThemes.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => selectTheme(t)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all",
                            activeThemeName === t.name
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div
                            className="h-4 w-4 rounded-full shrink-0 border border-[#00000015]"
                            style={{ backgroundColor: t.accent }}
                          />
                          <span
                            className={cn(
                              "text-[12px]",
                              t.name === "paper" ? "italic" : "font-medium"
                            )}
                            style={{
                              fontFamily: t.name === "paper"
                                ? "var(--font-logo), Georgia, serif"
                                : (t.headingFont || t.font),
                            }}
                          >
                            {t.label}
                          </span>
                          {activeThemeName === t.name && (
                            <Check className="h-3 w-3 text-primary ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground/60 mb-2">深色主题</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {darkThemes.map((t) => (
                        <button
                          key={t.name}
                          onClick={() => selectTheme(t)}
                          className={cn(
                            "flex items-center gap-2.5 rounded-lg border p-3 text-left transition-all",
                            activeThemeName === t.name
                              ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                              : "border-border hover:border-primary/30"
                          )}
                        >
                          <div
                            className="h-4 w-4 rounded-full shrink-0 border border-[#ffffff20]"
                            style={{ backgroundColor: t.accent }}
                          />
                          <span
                            className="text-[12px] font-medium"
                            style={{ fontFamily: t.headingFont || t.font }}
                          >
                            {t.label}
                          </span>
                          {activeThemeName === t.name && (
                            <Check className="h-3 w-3 text-primary ml-auto shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Storage Tab */}
          {tab === "storage" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] font-semibold mb-1">数据目录</h3>
                <p className="text-[12px] text-muted-foreground">
                  All Knowledge Base content is stored in this directory.
                  Changing the path requires a restart.
                </p>
              </div>

              {dataDirRestartNeeded && (
                <div className="flex items-center gap-3 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
                  <RotateCw className="h-4 w-4 shrink-0 text-yellow-500" />
                  <div className="flex-1">
                    <p className="text-[13px] font-medium text-yellow-500">需要重启</p>
                    <p className="text-[12px] text-muted-foreground">
                      The data directory will change after you restart Cabinet.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-muted-foreground">
                  当前路径
                </label>
                <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5 bg-muted/30">
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 font-mono text-[12px] truncate select-all">
                    {dataDir || "加载中..."}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => {
                      navigator.clipboard.writeText(dataDir);
                    }}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[12px] font-medium text-muted-foreground">
                  更改目录
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="/path/to/data"
                    value={dataDirPending ?? ""}
                    onChange={(e) => setDataDirPending(e.target.value)}
                    className="font-mono text-[12px]"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0"
                    disabled={dataDirBrowsing || dataDirSaving}
                    onClick={async () => {
                      setDataDirBrowsing(true);
                      try {
                        const res = await fetch("/api/system/pick-directory", { method: "POST" });
                        const data = await res.json().catch(() => null);
                        if (data?.path) setDataDirPending(data.path);
                      } catch {
                        // ignore
                      } finally {
                        setDataDirBrowsing(false);
                      }
                    }}
                  >
                    {dataDirBrowsing ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <FolderOpen className="h-3.5 w-3.5" />
                    )}
                    Browse
                  </Button>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    disabled={!dataDirPending?.trim() || dataDirSaving || dataDirPending.trim() === dataDir}
                    onClick={async () => {
                      if (!dataDirPending?.trim()) return;
                      setDataDirSaving(true);
                      try {
                        const res = await fetch("/api/system/data-dir", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ dataDir: dataDirPending.trim() }),
                        });
                        const data = await res.json().catch(() => null);
                        if (!res.ok) {
                          alert(data?.error || "Failed to save.");
                          return;
                        }
                        setDataDirRestartNeeded(true);
                        setDataDirPending(null);
                      } catch {
                        alert("Failed to save data directory.");
                      } finally {
                        setDataDirSaving(false);
                      }
                    }}
                  >
                    {dataDirSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Save
                  </Button>
                  {dataDir && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => {
                        fetch("/api/system/open-data-dir", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({}),
                        });
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      在 Finder 中打开
                    </Button>
                  )}
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-[12px] text-muted-foreground">
                  You can also set the <code className="px-1 py-0.5 rounded bg-muted text-[11px]">CABINET_DATA_DIR</code> environment
                  variable, which takes priority over this setting.
                </p>
              </div>
            </div>
          )}

          {tab === "updates" && update && (
            <UpdateSummary
              update={update}
              loading={updateLoading}
              refreshing={updateRefreshing}
              applyPending={applyPending}
              backupPending={backupPending}
              backupPath={backupPath}
              actionError={actionError}
              onRefresh={() => {
                void refreshUpdate();
              }}
              onApply={applyUpdate}
              onCreateBackup={async () => {
                await createBackup("data");
              }}
              onOpenDataDir={openDataDir}
            />
          )}

          {tab === "updates" && !update && updateLoading && (
            <p className="text-[13px] text-muted-foreground">Checking for Cabinet updates...</p>
          )}

          {/* Providers Tab */}
          {tab === "providers" && (
            <>
              <div>
                <h3 className="text-[14px] font-semibold mb-3">Agent 提供商</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure AI agent providers. CLI agents run via terminal, API agents use direct API calls.
                </p>

                {loading ? (
                  <p className="text-[13px] text-muted-foreground">加载中...</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <div className="mb-3 rounded-lg border border-border bg-card p-3">
                        <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          默认提供商
                        </label>
                        <div className="mt-2 space-y-1">
                          {providers
                            .filter((p) => p.type === "cli" && p.available && p.authenticated)
                            .map((provider) => {
                              const isDefault = provider.id === defaultProvider;
                              return (
                                <button
                                  key={provider.id}
                                  onClick={() => {
                                    if (isDefault || savingProviders) return;
                                    const disabledProviderIds = providers
                                      .filter((p) => !p.enabled && p.id !== provider.id)
                                      .map((p) => p.id);
                                    void saveProviderSettings(provider.id, disabledProviderIds);
                                  }}
                                  disabled={savingProviders}
                                  className={cn(
                                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-[13px] transition-colors",
                                    isDefault
                                      ? "bg-primary/5 border border-primary/30"
                                      : "border border-transparent hover:bg-muted"
                                  )}
                                >
                                  <span className={cn(
                                    "flex size-4 shrink-0 items-center justify-center rounded-full border",
                                    isDefault
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/30"
                                  )}>
                                    {isDefault && <Check className="size-2.5" />}
                                  </span>
                                  <span className={cn("font-medium", isDefault ? "text-foreground" : "text-muted-foreground")}>
                                    {provider.name}
                                  </span>
                                  {provider.version && (
                                    <span className="ml-auto text-[10px] text-muted-foreground/60">{provider.version}</span>
                                  )}
                                </button>
                              );
                            })}
                          {providers.filter((p) => p.type === "cli" && p.available && p.authenticated).length === 0 && (
                            <p className="text-[12px] text-muted-foreground py-2">
                              No providers are installed and logged in. Follow the setup guides below.
                            </p>
                          )}
                        </div>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          General conversations and fallback runs use this provider.
                        </p>
                      </div>

                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        CLI Agent
                      </h4>
                      <div className="space-y-2">
                        {providers
                          .filter((p) => p.type === "cli")
                          .map((provider) => {
                            const isReady = !!(provider.available && provider.authenticated);
                            const isInstalled = !!provider.available;
                            const isExpanded = expandedProvider === provider.id;
                            const setupSteps = PROVIDER_SETUP_STEPS[provider.id] || [];
                            const statusColor = isReady ? "text-green-500" : isInstalled ? "text-amber-500" : "text-muted-foreground";
                            const statusText = isReady
                              ? provider.version || "Ready"
                              : isInstalled
                                ? "Installed but not logged in"
                                : "未安装";
                            return (
                              <div
                                key={provider.id}
                                className="bg-card border border-border rounded-lg p-3 space-y-2"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {isReady ? (
                                      <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : isInstalled ? (
                                      <XCircle className="h-4 w-4 text-amber-500" />
                                    ) : (
                                      <XCircle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <div>
                                      <p className="text-[13px] font-medium">{provider.name}</p>
                                      <p className={cn("text-[11px]", statusColor)}>
                                        {statusText}
                                      </p>
                                      {(provider.usage?.totalCount ?? 0) > 0 && (
                                        <p className="text-[11px] text-muted-foreground">
                                          In use by {describeProviderUsage(provider)}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {setupSteps.length > 0 && (
                                      <button
                                        onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
                                        className={cn(
                                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-all",
                                          isExpanded ? "bg-muted" : ""
                                        )}
                                        title="Setup guide"
                                      >
                                        <Info className="size-3" />
                                        Guide
                                        <ChevronDown
                                          className="size-3 transition-transform duration-300"
                                          style={{ transform: isExpanded ? "rotate(0deg)" : "rotate(-90deg)" }}
                                        />
                                      </button>
                                    )}
                                    <span className={cn(
                                      "text-[10px] px-2 py-0.5 rounded-full font-medium",
                                      provider.id === defaultProvider
                                        ? "bg-primary/10 text-primary"
                                        : provider.enabled
                                          ? "bg-emerald-500/10 text-emerald-500"
                                          : "bg-muted text-muted-foreground"
                                    )}>
                                      {provider.id === defaultProvider
                                        ? "Default"
                                        : provider.enabled
                                          ? "Enabled"
                                          : "Disabled"}
                                    </span>
                                    <button
                                      onClick={async () => {
                                        const nextDisabled = provider.enabled
                                          ? providers
                                              .filter((entry) => !entry.enabled || entry.id === provider.id)
                                              .map((entry) => entry.id)
                                          : providers
                                              .filter((entry) => !entry.enabled && entry.id !== provider.id)
                                              .map((entry) => entry.id);
                                        const enabledAfterToggle = providers.filter(
                                          (entry) => !nextDisabled.includes(entry.id) && entry.type === "cli"
                                        );
                                        const nextDefault =
                                          provider.id === defaultProvider && nextDisabled.includes(provider.id)
                                            ? enabledAfterToggle[0]?.id || defaultProvider
                                            : defaultProvider;
                                        const migrations =
                                          provider.enabled && (provider.usage?.totalCount ?? 0) > 0
                                            ? [{ fromProviderId: provider.id, toProviderId: nextDefault }]
                                            : [];

                                        if (provider.enabled && (provider.usage?.totalCount ?? 0) > 0) {
                                          const confirmed = window.confirm(
                                            `Disable ${provider.name} and migrate ${describeProviderUsage(provider)} to ${getProviderName(nextDefault)}?`
                                          );
                                          if (!confirmed) return;
                                        }

                                        await saveProviderSettings(nextDefault, nextDisabled, migrations);
                                      }}
                                      disabled={savingProviders || (provider.id === defaultProvider && providers.filter((entry) => entry.type === "cli" && entry.enabled).length <= 1)}
                                      className="rounded-md border border-border px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
                                    >
                                      {provider.enabled ? "Disable" : "Enable"}
                                    </button>
                                  </div>
                                </div>

                                {/* Expandable setup guide */}
                                {setupSteps.length > 0 && (
                                  <div
                                    className="overflow-hidden transition-all duration-300 ease-in-out"
                                    style={{
                                      maxHeight: isExpanded ? 600 : 0,
                                      opacity: isExpanded ? 1 : 0,
                                    }}
                                  >
                                    <div className="rounded-lg bg-muted/50 p-3 space-y-3">
                                      {setupSteps.map((step, i) => (
                                        <div key={i} className="flex items-start gap-2.5">
                                          <span className="flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold mt-0.5 bg-primary text-primary-foreground">
                                            {i + 1}
                                          </span>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-[13px] font-medium">{step.title}</p>
                                            <p className="text-[11px] mt-0.5 text-muted-foreground">{step.detail}</p>
                                            {step.cmd && (
                                              <TerminalCommand command={step.cmd} />
                                            )}
                                            {step.openTerminal && (
                                              <button
                                                onClick={() => {
                                                  fetch("/api/terminal/open", { method: "POST" }).catch(() => {
                                                    alert("Could not open terminal automatically. Please open Terminal.app (Mac) or your system terminal manually.");
                                                  });
                                                }}
                                                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 mt-1.5 text-[11px] font-medium transition-all hover:-translate-y-0.5"
                                                style={{ background: "#1e1e1e", color: "#d4d4d4" }}
                                              >
                                                <Terminal className="size-3" />
                                                打开终端
                                              </button>
                                            )}
                                            {step.link && (
                                              <a
                                                href={step.link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-[11px] font-medium mt-1.5 text-primary hover:underline"
                                              >
                                                {step.link.label}
                                                <ExternalLink className="size-3" />
                                              </a>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      <p className="text-[11px] text-muted-foreground">
                                        After setup, click Re-check below to verify.
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                      </div>

                      {/* Re-check button */}
                      <button
                        onClick={() => void refresh()}
                        disabled={loading}
                        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted disabled:opacity-50 mt-2"
                      >
                        <RefreshCw className={cn("size-3", loading && "animate-spin")} />
                        重新检测提供商
                      </button>
                    </div>

                    <div>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        API Agent
                      </h4>
                      <div className="space-y-2">
                        {[
                          { name: "Anthropic API", env: "ANTHROPIC_API_KEY", status: "即将推出" },
                          { name: "OpenAI API", env: "OPENAI_API_KEY", status: "即将推出" },
                          { name: "Google AI API", env: "GOOGLE_AI_API_KEY", status: "即将推出" },
                        ].map((p) => (
                          <div
                            key={p.name}
                            className="flex items-center justify-between bg-card border border-border rounded-lg p-3 opacity-50"
                          >
                            <div className="flex items-center gap-3">
                              <XCircle className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <p className="text-[13px] font-medium">{p.name}</p>
                                <p className="text-[11px] text-muted-foreground">{p.status}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

            </>
          )}

          {/* Integrations Tab */}
          {tab === "integrations" && (
            <div className="space-y-6">
              {/* Multica 账户 */}
              <div>
                <h3 className="text-[14px] font-semibold mb-1">Multica 账户</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Multica powers issue tracking, agents, and project management.
                </p>
                {multicaUser ? (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                          {(multicaUser.name || multicaUser.email || "?").charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-[13px] font-medium">{multicaUser.name || "User"}</div>
                          <div className="text-[11px] text-muted-foreground">{multicaUser.email}</div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={multicaLogout}
                        className="text-[12px]"
                      >
                        退出登录
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg p-4">
                    <p className="text-[12px] text-muted-foreground">
                      Not connected. Visit any Multica feature to sign in.
                    </p>
                  </div>
                )}
              </div>

              {/* Coming Soon content */}
              <div className="relative">
              {/* Blurred content preview */}
              <div className="pointer-events-none select-none blur-[2px] opacity-70" aria-hidden="true">
                <div>
                  <h3 className="text-[14px] font-semibold mb-1">MCP 服务器</h3>
                  <p className="text-xs text-muted-foreground mb-4">
                    Configure tool servers that agents can use. Enable a server and provide API credentials for agents to access external services.
                  </p>
                  <div className="space-y-3">
                    {["Brave Search", "GitHub", "Slack"].map((name) => (
                      <div key={name} className="bg-card border border-border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="h-4 w-8 rounded-full bg-muted-foreground/30 relative">
                              <span className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white" />
                            </div>
                            <span className="text-[13px] font-medium">{name}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">已禁用</span>
                        </div>
                        <div className="space-y-1.5">
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Command</label>
                            <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">API Key</label>
                            <div className="w-full mt-0.5 h-7 bg-muted/30 border border-border/50 rounded" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Coming Soon overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-2 bg-background/80 backdrop-blur-sm rounded-xl px-8 py-6 border border-border shadow-lg">
                  <Plug className="h-6 w-6 text-muted-foreground/50" />
                  <span className="text-[13px] font-semibold">Coming Soon</span>
                  <p className="text-[12px] text-muted-foreground text-center max-w-[220px]">
                    MCP servers and third-party integrations.
                  </p>
                </div>
              </div>
            </div>
            </div>
          )}

          {/* Notifications Tab */}
          {tab === "notifications" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] font-semibold mb-1">通知渠道</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  Configure how you receive alerts when agents post to #alerts or mention @human.
                </p>

                {configLoading || !config ? (
                  <p className="text-[13px] text-muted-foreground">加载中...</p>
                ) : (
                  <div className="space-y-3">
                    {/* Telegram */}
                    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">✈️</span>
                          <div>
                            <p className="text-[13px] font-medium">Telegram</p>
                            <p className="text-[11px] text-muted-foreground">Instant mobile notifications via Telegram bot</p>
                          </div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.notifications.telegram.enabled}
                            onChange={(e) => updateNotif("telegram.enabled", e.target.checked)}
                          />
                          <span className="h-4 w-8 rounded-full bg-muted-foreground/30 relative peer-checked:bg-primary transition-colors">
                            <span className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white peer-checked:translate-x-4 transition-transform" style={{ transform: config.notifications.telegram.enabled ? "translateX(1rem)" : "translateX(0)" }} />
                          </span>
                        </label>
                      </div>
                      {config.notifications.telegram.enabled && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Bot Token</label>
                            <div className="relative mt-0.5">
                              <Input
                                type={revealedKeys.has("telegram.bot_token") ? "text" : "password"}
                                value={config.notifications.telegram.bot_token}
                                onChange={(e) => updateNotif("telegram.bot_token", e.target.value)}
                                placeholder="123456789:ABC-DEF..."
                                className="h-8 text-[12px] pr-9 font-mono"
                              />
                              <button
                                onClick={() => toggleReveal("telegram.bot_token")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                type="button"
                                aria-label={revealedKeys.has("telegram.bot_token") ? "Hide" : "Show"}
                              >
                                {revealedKeys.has("telegram.bot_token") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="underline">@BotFather</a> on Telegram and paste the token here.
                            </p>
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Chat ID</label>
                            <Input
                              type="text"
                              value={config.notifications.telegram.chat_id}
                              onChange={(e) => updateNotif("telegram.chat_id", e.target.value)}
                              placeholder="-100123456789 or 987654321"
                              className="h-8 text-[12px] mt-0.5 font-mono"
                            />
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              Group ID (starts with -100) or your user ID. Get it by messaging <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="underline">@userinfobot</a>.
                            </p>
                          </div>
                          <label className="flex items-center gap-2 text-[12px] pt-1">
                            <input
                              type="checkbox"
                              checked={config.notifications.telegram.bidirectional ?? false}
                              onChange={(e) => updateNotif("telegram.bidirectional", e.target.checked)}
                              className="h-3.5 w-3.5"
                            />
                            <span>双向控制（允许从 Telegram 创建任务、查看状态）</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Slack Webhook */}
                    <div className="bg-card border border-border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">💬</span>
                          <div>
                            <p className="text-[13px] font-medium">Slack Webhook</p>
                            <p className="text-[11px] text-muted-foreground">Forward alerts to a Slack channel via incoming webhook</p>
                          </div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.notifications.slack_webhook.enabled}
                            onChange={(e) => updateNotif("slack_webhook.enabled", e.target.checked)}
                          />
                          <span className="h-4 w-8 rounded-full bg-muted-foreground/30 relative peer-checked:bg-primary transition-colors">
                            <span className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-transform" style={{ transform: config.notifications.slack_webhook.enabled ? "translateX(1rem)" : "translateX(0)" }} />
                          </span>
                        </label>
                      </div>
                      {config.notifications.slack_webhook.enabled && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">Webhook URL</label>
                            <div className="relative mt-0.5">
                              <Input
                                type={revealedKeys.has("slack_webhook.url") ? "text" : "password"}
                                value={config.notifications.slack_webhook.url}
                                onChange={(e) => updateNotif("slack_webhook.url", e.target.value)}
                                placeholder="https://hooks.slack.com/services/..."
                                className="h-8 text-[12px] pr-9 font-mono"
                              />
                              <button
                                onClick={() => toggleReveal("slack_webhook.url")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                type="button"
                                aria-label={revealedKeys.has("slack_webhook.url") ? "Hide" : "Show"}
                              >
                                {revealedKeys.has("slack_webhook.url") ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">
                              Create an incoming webhook at <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noreferrer" className="underline">api.slack.com/messaging/webhooks</a>.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Email */}
                    <div className="bg-card border border-border rounded-lg p-3 space-y-2 opacity-75">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">📧</span>
                          <div>
                            <p className="text-[13px] font-medium flex items-center gap-2">
                              Email Digest
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-normal">后端未实现</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground">Batched summary of alerts — config is saved but nothing sends yet</p>
                          </div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.notifications.email.enabled}
                            onChange={(e) => updateNotif("email.enabled", e.target.checked)}
                          />
                          <span className="h-4 w-8 rounded-full bg-muted-foreground/30 relative peer-checked:bg-primary transition-colors">
                            <span className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-transform" style={{ transform: config.notifications.email.enabled ? "translateX(1rem)" : "translateX(0)" }} />
                          </span>
                        </label>
                      </div>
                      {config.notifications.email.enabled && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">收件邮箱</label>
                            <Input
                              type="email"
                              value={config.notifications.email.to}
                              onChange={(e) => updateNotif("email.to", e.target.value)}
                              placeholder="you@example.com"
                              className="h-8 text-[12px] mt-0.5"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-muted-foreground/70 uppercase tracking-wide">频率</label>
                            <select
                              value={config.notifications.email.frequency}
                              onChange={(e) => updateNotif("email.frequency", e.target.value)}
                              className="mt-0.5 w-full h-8 px-2 text-[12px] bg-background border border-border rounded-md"
                            >
                              <option value="hourly">每小时</option>
                              <option value="daily">每日</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Browser Push */}
                    <div className="bg-card border border-border rounded-lg p-3 space-y-2 opacity-75">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">🔔</span>
                          <div>
                            <p className="text-[13px] font-medium flex items-center gap-2">
                              Browser Push
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 font-normal">后端未实现</span>
                            </p>
                            <p className="text-[11px] text-muted-foreground">Browser-level push notifications (no service worker wired yet)</p>
                          </div>
                        </div>
                        <label className="inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={config.notifications.browser_push}
                            onChange={(e) => updateNotif("browser_push", e.target.checked)}
                          />
                          <span className="h-4 w-8 rounded-full bg-muted-foreground/30 relative peer-checked:bg-primary transition-colors">
                            <span className="absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white transition-transform" style={{ transform: config.notifications.browser_push ? "translateX(1rem)" : "translateX(0)" }} />
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-[14px] font-semibold mb-1">告警规则</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Notifications fire automatically on these events (not user-configurable):
                </p>
                <div className="space-y-2">
                  {[
                    { event: "#alerts channel messages", desc: "Any agent posting to the alerts channel" },
                    { event: "@human mentions", desc: "When an agent mentions @human in any channel" },
                  ].map((rule) => (
                    <div key={rule.event} className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2">
                      <div>
                        <p className="text-[12px] font-medium">{rule.event}</p>
                        <p className="text-[10px] text-muted-foreground/60">{rule.desc}</p>
                      </div>
                      <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">始终开启</span>
                    </div>
                  ))}
                </div>
              </div>

              {config && (
                <div className="flex items-center gap-2 pt-2">
                  <Button size="sm" onClick={saveConfig} disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    保存通知配置
                  </Button>
                  {saved && (
                    <span className="text-[11px] text-emerald-500 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      已保存
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* About Tab */}
          {tab === "about" && (
            <div className="space-y-6">
              <div>
                <h3 className="text-[14px] font-semibold mb-1">Cabinet AI Agent 工作站</h3>
                <p className="text-[12px] text-muted-foreground">
                  知识库 + 任务管理 + 多 Agent 调度 + Telegram Bot
                </p>
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">版本</span>
                  <span className="font-mono">0.4.1</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">框架</span>
                  <span>Next.js 16 + Electron + Go</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">数据目录</span>
                  <span className="font-mono text-[12px] truncate max-w-[300px]" title={dataDir}>{dataDir || "本地文件系统"}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">AI 引擎</span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" />
                    Claude Code + Codex CLI
                  </span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-muted-foreground">任务管理</span>
                  <span>Multica（内嵌）</span>
                </div>
              </div>

              <div className="pt-2 space-y-2">
                <h4 className="text-[12px] font-medium">功能特性</h4>
                <ul className="text-[12px] text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Markdown 知识库 + WYSIWYG 编辑器</li>
                  <li>AI Agent 面板（Claude / Codex 本地执行）</li>
                  <li>Multica 任务管理（Issue / Project / Agent 调度）</li>
                  <li>Telegram Bot 双向控制（创建任务、运行、进度推送）</li>
                  <li>多 Agent Daemon（自动认领、PTY 执行、状态回报）</li>
                  <li>Cabinet 首页任务创建 → Multica 自动派发</li>
                  <li>14 模块中文汉化</li>
                  <li>20 轮对抗安全审查（Claude + Codex 协作）</li>
                </ul>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-[11px] text-muted-foreground">
                  基于 hilash/cabinet + multica-ai/multica，由 Claude Opus 4.6 和 Codex GPT-5.4 协作开发。
                </p>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-[13px] font-semibold mb-2">项目链接</h3>
                <div className="space-y-2">
                  <a
                    href="https://github.com/8676311081/cabinet-ai"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-[13px] hover:bg-accent transition-colors"
                  >
                    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a12 12 0 0 0-3.8 23.38c.6.11.82-.26.82-.58v-2.24c-3.34.73-4.04-1.42-4.04-1.42-.55-1.37-1.33-1.73-1.33-1.73-1.08-.74.08-.72.08-.72 1.2.08 1.83 1.22 1.83 1.22 1.06 1.8 2.8 1.28 3.48.98.11-.77.42-1.28.76-1.58-2.67-.3-5.47-1.32-5.47-5.86 0-1.3.47-2.36 1.23-3.2-.12-.3-.53-1.52.12-3.16 0 0 1-.32 3.3 1.22a11.67 11.67 0 0 1 6.02 0c2.3-1.54 3.3-1.22 3.3-1.22.65 1.64.24 2.86.12 3.16.77.84 1.23 1.9 1.23 3.2 0 4.55-2.8 5.56-5.48 5.86.43.37.81 1.08.81 2.19v3.25c0 .32.22.7.83.58A12 12 0 0 0 12 .5Z"/></svg>
                    GitHub · cabinet-ai
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
